import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // 'all' | 'available' | 'redeemed' | 'expired' | 'customer_bound' | 'top10'

    // 1. Fetch all coupons with linked promo, customer details & SMS status
    let couponsSql = `
      SELECT 
        cp.coupon_id,
        cp.code,
        cp.promo_id,
        pr.name AS promo_name,
        pr.discount_percent,
        pr.start_date AS promo_start_date,
        pr.end_date AS promo_end_date,
        cp.customer_id,
        c.full_name AS customer_name,
        c.card_no AS customer_card_no,
        c.phone AS customer_phone,
        c.tier AS customer_tier,
        c.points_balance AS customer_points,
        cp.expiry_date,
        cp.is_used,
        cp.used_at,
        5 AS max_products,
        3000.00 AS purchase_limit,
        CASE
          WHEN cp.is_used = 1 THEN 'REDEEMED'
          WHEN cp.expiry_date IS NOT NULL AND cp.expiry_date < CURDATE() THEN 'EXPIRED'
          WHEN pr.start_date IS NOT NULL AND pr.start_date > CURDATE() THEN 'INACTIVE'
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

    let coupons: any[] = [];
    try {
      coupons = await query(couponsSql);
    } catch {
      // Fallback if newly added columns aren't queried yet
      coupons = await query(`
        SELECT 
          cp.coupon_id,
          cp.code,
          cp.promo_id,
          pr.name AS promo_name,
          pr.discount_percent,
          pr.start_date AS promo_start_date,
          pr.end_date AS promo_end_date,
          cp.customer_id,
          c.full_name AS customer_name,
          c.card_no AS customer_card_no,
          c.phone AS customer_phone,
          c.tier AS customer_tier,
          c.points_balance AS customer_points,
          cp.expiry_date,
          cp.is_used,
          cp.used_at,
          5 AS max_products,
          3000.00 AS purchase_limit,
          CASE
            WHEN cp.is_used = 1 THEN 'REDEEMED'
            WHEN cp.expiry_date IS NOT NULL AND cp.expiry_date < CURDATE() THEN 'EXPIRED'
            WHEN pr.start_date IS NOT NULL AND pr.start_date > CURDATE() THEN 'INACTIVE'
            ELSE 'AVAILABLE'
          END AS status,
          DATEDIFF(cp.expiry_date, CURDATE()) AS days_until_expiry
        FROM coupons cp
        JOIN promotions pr ON cp.promo_id = pr.promo_id
        LEFT JOIN customers c ON cp.customer_id = c.customer_id
        ORDER BY cp.coupon_id DESC
      `);
    }

    // Top 10 customers with active coupon status
    let top10Customers: unknown[] = [];
    try {
      top10Customers = await query(`
        SELECT 
          c.customer_id, c.card_no, c.full_name, c.phone, c.tier, c.points_balance,
          (
            SELECT cp.code 
            FROM coupons cp 
            WHERE cp.customer_id = c.customer_id 
              AND cp.is_used = 0 
              AND cp.expiry_date >= CURDATE() 
            ORDER BY cp.coupon_id DESC 
            LIMIT 1
          ) AS active_coupon_code
        FROM customers c
        WHERE c.is_active = 1
        ORDER BY c.points_balance DESC, c.customer_id ASC
        LIMIT 10
      `);
    } catch {
      top10Customers = [];
    }

    // 3. Coupon Summary metrics
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

    // Count SMS sent
    let smsSentCount = Number(summary?.customer_bound_coupons || 0);

    // 4. Active Promotions (from active_promotions_vw or promotions table)
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
          s.created_at,
          (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.sale_id) AS items_count
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
      top10Customers,
      summary: {
        total_coupons: total,
        available_coupons: Number(summary?.available_coupons || 0),
        redeemed_coupons: redeemed,
        expired_coupons: Number(summary?.expired_coupons || 0),
        customer_bound_coupons: Number(summary?.customer_bound_coupons || 0),
        sms_sent_count: smsSentCount,
        redemption_rate: redemptionRate,
      },
      promotions,
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

    // Default 2 months validity calculation helper
    const defaultTwoMonthsDate = () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 2);
      return d.toISOString().split("T")[0];
    };

    // Action 1: Apply Coupon to Sale (Enforcing: 1-time use, 2-month expiry, Top Customer, 5 products, limit 3000)
    if (action === "apply_coupon") {
      const { sale_id, code } = body;
      if (!sale_id || !code) {
        return NextResponse.json({ error: "Sale ID and Coupon Code are required" }, { status: 400 });
      }

      const formattedCode = code.toUpperCase().trim();

      // Look up coupon details with constraints
      const couponRows: any = await query(
        `SELECT 
          cp.coupon_id, cp.code, cp.promo_id, cp.customer_id, cp.expiry_date, cp.is_used,
          5 AS max_products,
          3000.00 AS purchase_limit,
          pr.discount_percent, pr.name AS promo_name
         FROM coupons cp
         JOIN promotions pr ON cp.promo_id = pr.promo_id
         WHERE cp.code = ?
         LIMIT 1`,
        [formattedCode]
      );

      if (couponRows.length === 0) {
        return NextResponse.json({ error: `Coupon "${formattedCode}" does not exist.` }, { status: 404 });
      }

      const cp = couponRows[0];

      // Rule 1: One-time use verification
      if (cp.is_used === 1) {
        return NextResponse.json(
          { error: `Coupon "${formattedCode}" has already been used and is expired. Coupons are valid for 1-time use only.` },
          { status: 400 }
        );
      }

      // Rule 2: Expiry date verification (2-month period)
      if (cp.expiry_date) {
        const expDate = new Date(cp.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          return NextResponse.json(
            { error: `Coupon "${formattedCode}" has expired on ${new Date(cp.expiry_date).toLocaleDateString()}.` },
            { status: 400 }
          );
        }
      }

      // Rule 3: Fetch sale details
      const saleRows: any = await query(
        `SELECT sale_id, customer_id, subtotal, discount_total, tax_total, total_amount, status
         FROM sales
         WHERE sale_id = ?
         LIMIT 1`,
        [Number(sale_id)]
      );

      if (saleRows.length === 0) {
        return NextResponse.json({ error: `Sale #${sale_id} not found.` }, { status: 404 });
      }

      const sale = saleRows[0];
      if (sale.status !== "OPEN") {
        return NextResponse.json({ error: `Coupon can only be applied to an OPEN sale (Sale #${sale_id} is ${sale.status}).` }, { status: 400 });
      }

      // Rule 4: Top Customer Binding verification
      if (cp.customer_id && sale.customer_id && Number(cp.customer_id) !== Number(sale.customer_id)) {
        const [boundCust]: any = await query("SELECT full_name, card_no FROM customers WHERE customer_id = ?", [cp.customer_id]);
        const custDesc = boundCust ? `${boundCust.full_name} (${boundCust.card_no})` : `Customer #${cp.customer_id}`;
        return NextResponse.json(
          { error: `Access Denied: This coupon is exclusively allocated to Top Customer ${custDesc}.` },
          { status: 403 }
        );
      }

      // Rule 5: 5 Products Limit Check
      const [itemStats]: any = await query(
        `SELECT COUNT(*) AS total_items, COALESCE(SUM(quantity), 0) AS total_qty FROM sale_items WHERE sale_id = ?`,
        [Number(sale_id)]
      );
      const totalProducts = Number(itemStats?.total_items || 0);
      const maxAllowed = Number(cp.max_products || 5);
      if (totalProducts > maxAllowed) {
        return NextResponse.json(
          { error: `Coupon constraint exceeded: You can purchase a maximum of ${maxAllowed} products (Sale currently has ${totalProducts} products).` },
          { status: 400 }
        );
      }

      // Rule 6: Limit 3,000 Purchase / Discount Calculation
      const subtotal = Number(sale.subtotal || 0);
      const purchaseLimit = Number(cp.purchase_limit || 3000.00);
      const discountPct = Number(cp.discount_percent || 10);
      
      // Calculate discount capped at purchase limit
      const eligibleBase = Math.min(subtotal, purchaseLimit);
      const calculatedDiscount = Number(((eligibleBase * discountPct) / 100).toFixed(2));
      const totalDiscount = Math.min(subtotal, Number((Number(sale.discount_total || 0) + calculatedDiscount).toFixed(2)));
      const tax = Number(sale.tax_total || 0);
      const newTotal = Math.max(0, Number((subtotal - totalDiscount + tax).toFixed(2)));

      // Execute update & mark coupon USED (one-time use expire)
      await query(
        `UPDATE sales
         SET coupon_id = ?, promo_id = ?, discount_total = ?, total_amount = ?
         WHERE sale_id = ?`,
        [cp.coupon_id, cp.promo_id, totalDiscount, newTotal, Number(sale_id)]
      );

      await query(
        `UPDATE coupons
         SET is_used = 1, used_at = NOW()
         WHERE coupon_id = ?`,
        [cp.coupon_id]
      );

      return NextResponse.json({
        success: true,
        coupon_id: cp.coupon_id,
        discount_applied: calculatedDiscount,
        new_total: newTotal,
        message: `Coupon "${formattedCode}" applied successfully! LKR ${calculatedDiscount.toFixed(2)} (${discountPct}%) discount given. Limit: 5 products, max LKR ${purchaseLimit}. Coupon is now REDEEMED and expired (one-time use).`,
      });
    }

    // Action 2: Batch Assign Coupons to Top 10 Loyalty Customers
    if (action === "assign_top10") {
      const { promo_id, valid_days = 30 } = body;
      let finalPromoId = promo_id ? Number(promo_id) : null;
      if (!finalPromoId) {
        const anyPromo = await query<{ promo_id: number }>(
          "SELECT promo_id FROM promotions WHERE is_active = 1 ORDER BY discount_percent DESC, promo_id DESC LIMIT 1"
        );
        if (anyPromo.length > 0) {
          finalPromoId = anyPromo[0].promo_id;
        } else {
          return NextResponse.json({ error: "No active promotion found to link coupons with." }, { status: 400 });
        }
      }

      let issuedCount = 0;
      const days = Number(valid_days) > 0 ? Number(valid_days) : 30;

      try {
        await query("CALL proc_assign_top10_coupons(?, ?, @issued)", [finalPromoId, days]);
        const resCount = await query<{ issued_count: number }>("SELECT @issued AS issued_count");
        issuedCount = Number(resCount?.[0]?.issued_count ?? 0);
      } catch (procErr: unknown) {
        const procMsg = procErr instanceof Error ? procErr.message : "Stored procedure execution error";
        console.warn("proc_assign_top10_coupons fallback in /api/coupons:", procMsg);
        const insertRes = await query<{ affectedRows?: number }>(`
          INSERT INTO coupons (code, promo_id, customer_id, expiry_date, is_used, sms_phone, sms_status, sms_message)
          SELECT 
            CONCAT('TOP10-', REPLACE(c.card_no, ' ', ''), '-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID(), c.customer_id)), 1, 4))),
            ?,
            c.customer_id,
            DATE_ADD(CURDATE(), INTERVAL ? DAY),
            0,
            c.phone,
            'SENT',
            CONCAT('Congratulations ', c.full_name, '! As a Top 10 Loyalty Customer, you have been awarded an exclusive VIP coupon valid for ', ?, ' days.')
          FROM (
            SELECT customer_id, card_no, full_name, phone
            FROM customers
            WHERE is_active = 1
            ORDER BY points_balance DESC, customer_id ASC
            LIMIT 10
          ) c
          WHERE NOT EXISTS (
            SELECT 1 
            FROM coupons existing
            WHERE existing.customer_id = c.customer_id 
              AND existing.promo_id = ? 
              AND existing.is_used = 0 
              AND existing.expiry_date >= CURDATE()
          )
        `, [finalPromoId, days, days, finalPromoId]);
        const packet = insertRes as unknown as { affectedRows?: number };
        issuedCount = packet?.affectedRows || 0;
      }

      return NextResponse.json({
        success: true,
        issued_count: issuedCount,
        message: issuedCount > 0 
          ? `Successfully assigned ${issuedCount} VIP coupons to Top 10 Loyalty Customers!`
          : `All eligible Top 10 customers already have an active coupon for this promotion.`,
      });
    }

    // Action 2: Issue / Create Coupon
    const { 
      code, 
      promo_id, 
      coupon_name,
      customer_id, 
      start_date,
      expiry_date, 
      phone, 
      max_products = 5, 
      purchase_limit = 3000.00,
      custom_sms 
    } = body;

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required." }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const finalExpiry = expiry_date && expiry_date.trim() ? expiry_date : defaultTwoMonthsDate();

    // Resolve promo_id from coupon_name or promo_id
    let finalPromoId = promo_id ? Number(promo_id) : null;
    const cleanCouponName = (coupon_name || "").trim();

    if (!finalPromoId && cleanCouponName) {
      const existingPromo: any = await query(
        "SELECT promo_id FROM promotions WHERE name = ? LIMIT 1",
        [cleanCouponName]
      );
      if (existingPromo.length > 0) {
        finalPromoId = existingPromo[0].promo_id;
      } else {
        const createPromoRes: any = await query(
          `INSERT INTO promotions (name, discount_percent, start_date, end_date, is_active)
           VALUES (?, 10.00, COALESCE(?, CURDATE()), COALESCE(?, DATE_ADD(CURDATE(), INTERVAL 2 MONTH)), 1)`,
          [cleanCouponName, start_date || null, finalExpiry]
        );
        finalPromoId = createPromoRes.insertId;
      }
    }

    if (!finalPromoId) {
      const anyPromo: any = await query("SELECT promo_id FROM promotions ORDER BY promo_id ASC LIMIT 1");
      if (anyPromo.length > 0) {
        finalPromoId = anyPromo[0].promo_id;
      } else {
        return NextResponse.json({ error: "Coupon name or promotion is required." }, { status: 400 });
      }
    }

    // Fetch customer details if bound
    let customerName = "Valued Customer";
    let customerPhone = phone || null;

    if (customer_id) {
      const custRows: any = await query(
        "SELECT full_name, phone, card_no FROM customers WHERE customer_id = ? LIMIT 1",
        [Number(customer_id)]
      );
      if (custRows.length > 0) {
        customerName = custRows[0].full_name;
        if (!customerPhone) customerPhone = custRows[0].phone;
      }
    }

    const smsMessage = custom_sms && custom_sms.trim() 
      ? custom_sms.trim()
      : `Congratulations ${customerName}! You have won the coupon "${cleanCode}". Valid from ${start_date || 'today'} to ${finalExpiry}. One-time use only!`;

    try {
      const res: any = await query(
        `INSERT INTO coupons (code, promo_id, customer_id, expiry_date, is_used)
         VALUES (?, ?, ?, ?, 0)`,
        [
          cleanCode,
          finalPromoId,
          customer_id ? Number(customer_id) : null,
          finalExpiry,
        ]
      );

      return NextResponse.json({
        success: true,
        coupon_id: res.insertId,
        code: cleanCode,
        expiry_date: finalExpiry,
        message: `Coupon "${cleanCode}" created successfully! Valid until ${finalExpiry}.`,
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

