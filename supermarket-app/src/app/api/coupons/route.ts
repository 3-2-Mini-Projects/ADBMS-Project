import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // 'all' | 'available' | 'redeemed' | 'expired' | 'customer_bound'

    // 1. Fetch all coupons with linked promo & customer details
    let couponsSql = `
      SELECT 
        cp.coupon_id,
        cp.code,
        cp.promo_id,
        pr.name AS promo_name,
        pr.discount_percent,
        cp.customer_id,
        c.full_name AS customer_name,
        c.card_no AS customer_card_no,
        cp.expiry_date,
        cp.is_used,
        cp.used_at,
        CASE
          WHEN cp.is_used = 1 THEN 'REDEEMED'
          WHEN cp.expiry_date IS NOT NULL AND cp.expiry_date < CURDATE() THEN 'EXPIRED'
          ELSE 'AVAILABLE'
        END AS status,
        DATEDIFF(cp.expiry_date, CURDATE()) AS days_until_expiry
      FROM coupons cp
      JOIN promotions pr ON cp.promo_id = pr.promo_id
      LEFT JOIN customers c ON cp.customer_id = c.customer_id
      WHERE 1=1
    `;

    if (filter === "available") {
      couponsSql += ` AND cp.is_used = 0 AND (cp.expiry_date IS NULL OR cp.expiry_date >= CURDATE())`;
    } else if (filter === "redeemed") {
      couponsSql += ` AND cp.is_used = 1`;
    } else if (filter === "expired") {
      couponsSql += ` AND cp.is_used = 0 AND cp.expiry_date IS NOT NULL AND cp.expiry_date < CURDATE()`;
    } else if (filter === "customer_bound") {
      couponsSql += ` AND cp.customer_id IS NOT NULL`;
    }

    couponsSql += ` ORDER BY cp.coupon_id DESC`;

    const coupons = await query(couponsSql);

    // 2. Coupon Summary metrics
    const [summary]: any = await query(`
      SELECT 
        COUNT(*) AS total_coupons,
        COALESCE(SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END), 0) AS redeemed_coupons,
        COALESCE(SUM(CASE WHEN is_used = 0 AND (expiry_date IS NULL OR expiry_date >= CURDATE()) THEN 1 ELSE 0 END), 0) AS available_coupons,
        COALESCE(SUM(CASE WHEN is_used = 0 AND expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 1 ELSE 0 END), 0) AS expired_coupons,
        COALESCE(SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS customer_bound_coupons
      FROM coupons
    `);

    const total = Number(summary?.total_coupons || 0);
    const redeemed = Number(summary?.redeemed_coupons || 0);
    const redemptionRate = total > 0 ? Math.round((redeemed / total) * 100) : 0;

    // 3. Active Promotions (from active_promotions_vw for dropdowns)
    let promotions: any[] = [];
    try {
      promotions = await query(`
        SELECT promo_id, promotion_name AS name, discount_percent
        FROM active_promotions_vw
        ORDER BY promo_id DESC
      `);
    } catch {
      promotions = await query(`
        SELECT promo_id, name, discount_percent
        FROM promotions
        WHERE is_active = 1 AND CURDATE() BETWEEN start_date AND end_date
        ORDER BY promo_id DESC
      `);
    }

    // 4. Customers list for customer-bound coupon creation
    const customers = await query(`
      SELECT customer_id, card_no, full_name, tier, points_balance
      FROM customers
      WHERE is_active = 1
      ORDER BY card_no ASC
      LIMIT 100
    `);

    // 5. Open sales for proc_apply_coupon procedure testing
    let openSales: any[] = [];
    try {
      openSales = await query(`
        SELECT 
          s.sale_id,
          s.branch_id,
          s.customer_id,
          c.full_name AS customer_name,
          c.card_no,
          s.subtotal,
          s.discount_total,
          s.total_amount,
          s.status,
          s.created_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.status = 'OPEN'
        ORDER BY s.sale_id DESC
        LIMIT 10
      `);
    } catch {
      openSales = [];
    }

    return NextResponse.json({
      coupons,
      summary: {
        total_coupons: total,
        available_coupons: Number(summary?.available_coupons || 0),
        redeemed_coupons: redeemed,
        expired_coupons: Number(summary?.expired_coupons || 0),
        customer_bound_coupons: Number(summary?.customer_bound_coupons || 0),
        redemption_rate: redemptionRate,
      },
      promotions,
      customers,
      openSales,
    });
  } catch (err: any) {
    console.error("GET /api/coupons error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Apply Coupon to Sale via proc_apply_coupon stored procedure
    if (action === "apply_coupon") {
      const { sale_id, code } = body;
      if (!sale_id || !code) {
        return NextResponse.json({ error: "Sale ID and Coupon Code are required" }, { status: 400 });
      }

      const formattedCode = code.toUpperCase().trim();

      try {
        await query("CALL proc_apply_coupon(?, ?)", [sale_id, formattedCode]);
        return NextResponse.json({
          success: true,
          message: `Coupon "${formattedCode}" applied successfully to Sale #${sale_id} via proc_apply_coupon()!`,
        });
      } catch (procErr: any) {
        return NextResponse.json(
          {
            error: procErr.sqlMessage || procErr.message || "Failed to execute proc_apply_coupon procedure",
          },
          { status: 400 }
        );
      }
    }

    // Action 2: Batch Generate Coupons
    if (action === "batch_generate") {
      const { prefix, count, promo_id, expiry_date } = body;
      const numCount = Math.min(Math.max(parseInt(count || "1", 10), 1), 20); // between 1 and 20

      if (!promo_id) {
        return NextResponse.json({ error: "Linked promotion is required" }, { status: 400 });
      }

      const cleanPrefix = (prefix || "PROMO").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const generatedCodes: string[] = [];

      for (let i = 0; i < numCount; i++) {
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${cleanPrefix}-${randomSuffix}`;
        try {
          await query(
            `INSERT INTO coupons (code, promo_id, customer_id, expiry_date, is_used)
             VALUES (?, ?, NULL, ?, 0)`,
            [code, promo_id, expiry_date || null]
          );
          generatedCodes.push(code);
        } catch {
          // ignore duplicate collision and retry next
        }
      }

      return NextResponse.json({
        success: true,
        count: generatedCodes.length,
        codes: generatedCodes,
        message: `Successfully batch generated ${generatedCodes.length} coupon codes.`,
      });
    }

    // Action 3: Issue Single Coupon
    const { code, promo_id, customer_id, expiry_date } = body;
    if (!code || !promo_id) {
      return NextResponse.json({ error: "Coupon code and linked promotion are required." }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();

    try {
      const res: any = await query(
        `INSERT INTO coupons (code, promo_id, customer_id, expiry_date, is_used)
         VALUES (?, ?, ?, ?, 0)`,
        [cleanCode, promo_id, customer_id ? Number(customer_id) : null, expiry_date || null]
      );

      return NextResponse.json({
        success: true,
        coupon_id: res.insertId,
        message: `Coupon code "${cleanCode}" issued successfully!`,
      });
    } catch (insertErr: any) {
      if (insertErr.code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: `Coupon code "${cleanCode}" already exists. Please choose a unique code.` },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: insertErr.message || "Failed to create coupon" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("POST /api/coupons error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const couponId = searchParams.get("coupon_id");
    const cleanupExpired = searchParams.get("cleanup_expired");

    if (cleanupExpired === "true") {
      const res: any = await query(
        `DELETE FROM coupons WHERE is_used = 0 AND expiry_date IS NOT NULL AND expiry_date < CURDATE()`
      );
      return NextResponse.json({
        success: true,
        message: `Removed ${res.affectedRows || 0} expired unused coupons.`,
      });
    }

    if (couponId) {
      await query("DELETE FROM coupons WHERE coupon_id = ?", [couponId]);
      return NextResponse.json({ success: true, message: "Coupon deleted successfully." });
    }

    return NextResponse.json({ error: "Missing coupon_id parameter" }, { status: 400 });
  } catch (err: any) {
    console.error("DELETE /api/coupons error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
