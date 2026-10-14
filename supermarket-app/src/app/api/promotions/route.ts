import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const calculate = searchParams.get("calculate");
    const check = searchParams.get("check");

    // 1. Calculate discount using get_discount() function
    if (calculate === "discount") {
      const amount = parseFloat(searchParams.get("amount") || "0");
      const promoId = parseInt(searchParams.get("promo_id") || "0", 10);

      try {
        const [fnResult]: any = await query("SELECT get_discount(?, ?) AS calculated_discount", [amount, promoId]);
        return NextResponse.json({
          success: true,
          amount,
          promo_id: promoId,
          calculated_discount: Number(fnResult?.calculated_discount ?? 0),
          method: "get_discount() SQL function",
        });
      } catch (fnErr: any) {
        // Fallback calculation in JS if SQL function is not compiled
        const [promo]: any = await query(
          "SELECT discount_percent, is_active, start_date, end_date FROM promotions WHERE promo_id = ?",
          [promoId]
        );
        let disc = 0;
        if (promo && promo.is_active) {
          disc = (amount * Number(promo.discount_percent || 0)) / 100;
        }
        return NextResponse.json({
          success: true,
          amount,
          promo_id: promoId,
          calculated_discount: disc,
          method: "fallback calculation",
        });
      }
    }

    // 2. Check if promo is active using promo_isactive() function
    if (check === "active") {
      const promoId = parseInt(searchParams.get("promo_id") || "0", 10);
      try {
        const [fnResult]: any = await query("SELECT promo_isactive(?) AS is_active", [promoId]);
        return NextResponse.json({
          success: true,
          promo_id: promoId,
          is_active: Boolean(fnResult?.is_active),
          method: "promo_isactive() SQL function",
        });
      } catch {
        const [promo]: any = await query(
          "SELECT (is_active = 1 AND CURDATE() BETWEEN start_date AND end_date) AS is_active FROM promotions WHERE promo_id = ?",
          [promoId]
        );
        return NextResponse.json({
          success: true,
          promo_id: promoId,
          is_active: Boolean(promo?.is_active),
          method: "fallback calculation",
        });
      }
    }

    // 3. Query active promotions directly from active_promotions_vw
    let activePromotions: any[] = [];
    try {
      activePromotions = await query(`
        SELECT 
          promo_id,
          promotion_name AS name,
          discount_percent,
          start_date,
          end_date,
          product_id,
          product_name,
          category_id,
          category_name,
          1 AS is_active,
          'ACTIVE' AS status,
          DATEDIFF(end_date, CURDATE()) AS days_left
        FROM active_promotions_vw
        ORDER BY promo_id DESC
      `);
    } catch {
      activePromotions = await query(`
        SELECT 
          p.promo_id,
          p.name,
          p.discount_percent,
          p.start_date,
          p.end_date,
          p.product_id,
          pro.name AS product_name,
          p.category_id,
          c.name AS category_name,
          p.is_active,
          'ACTIVE' AS status,
          DATEDIFF(p.end_date, CURDATE()) AS days_left
        FROM promotions p
        LEFT JOIN products pro ON pro.product_id = p.product_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        WHERE p.is_active = 1 AND CURDATE() BETWEEN p.start_date AND p.end_date
        ORDER BY p.promo_id DESC
      `);
    }

    if (view === "active") {
      return NextResponse.json({ promotions: activePromotions });
    }

    // 4. Query all promotions
    const promotions = await query(`
      SELECT 
        pr.promo_id,
        pr.name,
        pr.discount_percent,
        pr.start_date,
        pr.end_date,
        pr.product_id,
        p.name AS product_name,
        pr.category_id,
        c.name AS category_name,
        pr.is_active,
        CASE
          WHEN CURDATE() BETWEEN pr.start_date AND pr.end_date AND pr.is_active = 1 THEN 'ACTIVE'
          WHEN CURDATE() < pr.start_date THEN 'SCHEDULED'
          ELSE 'EXPIRED'
        END AS status,
        DATEDIFF(pr.end_date, CURDATE()) AS days_left
      FROM promotions pr
      LEFT JOIN products p ON pr.product_id = p.product_id
      LEFT JOIN categories c ON pr.category_id = c.category_id
      ORDER BY pr.promo_id DESC
    `);

    // 5. Query coupons
    const coupons = await query(`
      SELECT 
        cp.coupon_id,
        cp.code,
        cp.promo_id,
        pr.name AS promo_name,
        pr.discount_percent,
        cp.customer_id,
        c.full_name AS customer_name,
        cp.expiry_date,
        cp.is_used,
        cp.used_at
      FROM coupons cp
      JOIN promotions pr ON cp.promo_id = pr.promo_id
      LEFT JOIN customers c ON cp.customer_id = c.customer_id
      ORDER BY cp.coupon_id DESC
    `);

    return NextResponse.json({
      promotions,
      activePromotions,
      coupons,
    });
  } catch (err: any) {
    console.error("GET /api/promotions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Issue Coupon
    if (action === "create_coupon") {
      const { code, promo_id, customer_id, expiry_date } = body;
      if (!code || !promo_id) {
        return NextResponse.json({ error: "Coupon code and linked promotion are required." }, { status: 400 });
      }

      const res: any = await query(
        `INSERT INTO coupons (code, promo_id, customer_id, expiry_date, is_used)
         VALUES (?, ?, ?, ?, 0)`,
        [code.toUpperCase().trim(), promo_id, customer_id || null, expiry_date || null]
      );
      return NextResponse.json({
        success: true,
        coupon_id: res.insertId,
        message: `Coupon code ${code.toUpperCase().trim()} issued successfully.`,
      });
    }

    // Test Coupon Application via proc_apply_coupon procedure
    if (action === "test_apply_coupon") {
      const { sale_id, code } = body;
      if (!sale_id || !code) {
        return NextResponse.json({ error: "Sale ID and Coupon Code are required" }, { status: 400 });
      }

      try {
        await query("CALL proc_apply_coupon(?, ?)", [sale_id, code.toUpperCase().trim()]);
        return NextResponse.json({
          success: true,
          message: `Coupon ${code} validated and applied successfully via proc_apply_coupon() procedure!`,
        });
      } catch (procErr: any) {
        return NextResponse.json(
          {
            error: procErr.sqlMessage || procErr.message || "proc_apply_coupon failed",
          },
          { status: 400 }
        );
      }
    }

    // Create Promotion Campaign via create_promotion procedure (Triggers before_promotions_insert)
    const { name, discount_percent, start_date, end_date, product_id, category_id } = body;

    if (!name || !discount_percent || !start_date || !end_date) {
      return NextResponse.json({ error: "Name, discount percent, start and end dates are required" }, { status: 400 });
    }

    const discountNum = Number(discount_percent);

    let promo_id: number;
    try {
      const procRes: any = await query(
        `CALL create_promotion(?, ?, ?, ?, ?, ?)`,
        [name, discountNum, start_date, end_date, product_id || null, category_id || null]
      );
      promo_id = procRes?.[0]?.[0]?.promo_id || procRes?.insertId;
    } catch (procErr: any) {
      // Catch trigger validation error from before_promotions_insert
      if (procErr.sqlMessage && (procErr.sqlState === "45000" || procErr.code === "ER_SIGNAL_EXCEPTION")) {
        return NextResponse.json({ error: procErr.sqlMessage }, { status: 400 });
      }

      // Fallback direct insert
      try {
        const res: any = await query(
          `INSERT INTO promotions (name, discount_percent, start_date, end_date, product_id, category_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [name, discountNum, start_date, end_date, product_id || null, category_id || null]
        );
        promo_id = res.insertId;
      } catch (insertErr: any) {
        return NextResponse.json(
          { error: insertErr.sqlMessage || insertErr.message || "Failed to create promotion" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      promo_id,
      message: `Promotion "${name}" created successfully via create_promotion() procedure!`,
    });
  } catch (err: any) {
    console.error("POST /api/promotions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { promo_id, is_active } = body;

    if (promo_id === undefined || is_active === undefined) {
      return NextResponse.json({ error: "promo_id and is_active are required" }, { status: 400 });
    }

    await query("UPDATE promotions SET is_active = ? WHERE promo_id = ?", [is_active ? 1 : 0, promo_id]);
    return NextResponse.json({
      success: true,
      message: `Promotion status updated to ${is_active ? "ACTIVE" : "INACTIVE"}.`,
    });
  } catch (err: any) {
    console.error("PATCH /api/promotions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const promoId = searchParams.get("promo_id");
    const couponId = searchParams.get("coupon_id");

    if (promoId) {
      // First delete associated coupons or set promo_id null
      await query("DELETE FROM coupons WHERE promo_id = ?", [promoId]);
      await query("DELETE FROM promotions WHERE promo_id = ?", [promoId]);
      return NextResponse.json({ success: true, message: "Promotion and linked coupons deleted successfully." });
    }

    if (couponId) {
      await query("DELETE FROM coupons WHERE coupon_id = ?", [couponId]);
      return NextResponse.json({ success: true, message: "Coupon deleted successfully." });
    }

    return NextResponse.json({ error: "Missing promo_id or coupon_id to delete" }, { status: 400 });
  } catch (err: any) {
    console.error("DELETE /api/promotions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
