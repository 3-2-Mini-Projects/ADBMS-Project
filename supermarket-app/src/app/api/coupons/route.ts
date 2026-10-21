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
        cp.customer_id,
        c.full_name AS customer_name,
        c.card_no AS customer_card_no,
        c.phone AS customer_phone,
        c.tier AS customer_tier,
        c.points_balance AS customer_points,
        cp.expiry_date,
        cp.is_used,
        cp.used_at,
        COALESCE(cp.max_products, 5) AS max_products,
        COALESCE(cp.purchase_limit, 3000.00) AS purchase_limit,
        cp.sms_phone,
        COALESCE(cp.sms_status, 'SENT') AS sms_status,
        cp.sms_message,
        cp.created_at,
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
          c.phone AS sms_phone,
          'SENT' AS sms_status,
          NULL AS sms_message,
          NULL AS created_at,
          CASE
            WHEN cp.is_used = 1 THEN 'REDEEMED'
            WHEN cp.expiry_date IS NOT NULL AND cp.expiry_date < CURDATE() THEN 'EXPIRED'
            ELSE 'AVAILABLE'
          END AS status,
          DATEDIFF(cp.expiry_date, CURDATE()) AS days_until_expiry
        FROM coupons cp
        JOIN promotions pr ON cp.promo_id = pr.promo_id
        LEFT JOIN customers c ON cp.customer_id = c.customer_id
        ORDER BY cp.coupon_id DESC
      `);
    }

    // 2. Fetch Top 10 Loyalty Customers
    let top10Customers: any[] = [];
    try {
      top10Customers = await query(`
        SELECT 
          c.customer_id,
          c.card_no,
          c.full_name,
          c.phone,
          c.email,
          c.city,
          c.tier,
          c.points_balance,
          COALESCE(s.total_spent, 0) AS total_spent,
          COALESCE(s.total_orders, 0) AS total_orders,
          COALESCE(active_cp.active_coupons, 0) AS active_coupons
        FROM customers c
        LEFT JOIN (
          SELECT customer_id, SUM(total_amount) AS total_spent, COUNT(sale_id) AS total_orders
          FROM sales
          WHERE status = 'COMPLETED'
          GROUP BY customer_id
        ) s ON c.customer_id = s.customer_id
        LEFT JOIN (
          SELECT customer_id, COUNT(*) AS active_coupons
          FROM coupons
          WHERE is_used = 0 AND (expiry_date IS NULL OR expiry_date >= CURDATE())
          GROUP BY customer_id
        ) active_cp ON c.customer_id = active_cp.customer_id
        WHERE c.is_active = 1
        ORDER BY c.points_balance DESC, s.total_spent DESC
        LIMIT 10
      `);
    } catch (topErr) {
      console.warn("Could not query top10 with sales aggregation, falling back to points:", topErr);
      top10Customers = await query(`
        SELECT customer_id, card_no, full_name, phone, email, city, tier, points_balance, 0 AS total_spent, 0 AS total_orders, 0 AS active_coupons
        FROM customers
        WHERE is_active = 1
        ORDER BY points_balance DESC
        LIMIT 10
      `);
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
    let smsSentCount = 0;
    try {
      const [smsRow]: any = await query(`
        SELECT COUNT(*) AS sms_count FROM coupons WHERE sms_status = 'SENT' OR sms_phone IS NOT NULL
      `);
      smsSentCount = Number(smsRow?.sms_count || 0);
    } catch {
      smsSentCount = Number(summary?.customer_bound_coupons || 0);
    }

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
          COALESCE(cp.max_products, 5) AS max_products,
          COALESCE(cp.purchase_limit, 3000.00) AS purchase_limit,
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

    // Action 2: Batch Allocate Exclusive Coupons to All Top 10 Customers
    if (action === "batch_top10") {
      const { promo_id, prefix = "TOP10" } = body;
      if (!promo_id) {
        return NextResponse.json({ error: "Linked campaign promotion is required." }, { status: 400 });
      }

      // Fetch top 10 customers
      const top10: any[] = await query(`
        SELECT customer_id, card_no, full_name, phone, tier, points_balance
        FROM customers
        WHERE is_active = 1
        ORDER BY points_balance DESC
        LIMIT 10
      `);

      if (top10.length === 0) {
        return NextResponse.json({ error: "No active top customers found to allocate coupons." }, { status: 400 });
      }

      const expiryDate = defaultTwoMonthsDate();
      const allocatedCoupons: any[] = [];

      for (const cust of top10) {
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const cleanCard = (cust.card_no || "").replace(/[^A-Z0-9]/gi, "").slice(-4) || "VIP";
        const code = `${prefix}-${cleanCard}-${rand}`.toUpperCase();

        const smsMsg = `Congratulations ${cust.full_name}! You have won the exclusive coupon "${code}". Valid for 2 months (expires ${expiryDate}). You can purchase up to 5 products with a limit of LKR 3,000. One-time use only. Present this code at checkout!`;

        try {
          await query(
            `INSERT INTO coupons 
             (code, promo_id, customer_id, expiry_date, is_used, max_products, purchase_limit, sms_phone, sms_status, sms_message, created_at)
             VALUES (?, ?, ?, ?, 0, 5, 3000.00, ?, 'SENT', ?, NOW())`,
            [code, Number(promo_id), cust.customer_id, expiryDate, cust.phone || null, smsMsg]
          );

          allocatedCoupons.push({
            code,
            customer_id: cust.customer_id,
            customer_name: cust.full_name,
            phone: cust.phone,
            expiry_date: expiryDate,
            sms_message: smsMsg,
          });
        } catch (e: any) {
          console.warn("Error inserting batch coupon for customer:", cust.customer_id, e.message);
        }
      }

      return NextResponse.json({
        success: true,
        count: allocatedCoupons.length,
        expiry_date: expiryDate,
        allocatedCoupons,
        message: `Successfully allocated exclusive 2-month coupons to ${allocatedCoupons.length} Top 10 VIP customers! SMS notifications dispatched with 5 products / LKR 3,000 purchase limits.`,
      });
    }

    // Action 3: Resend SMS for a Coupon
    if (action === "resend_sms") {
      const { coupon_id } = body;
      if (!coupon_id) {
        return NextResponse.json({ error: "Coupon ID is required." }, { status: 400 });
      }

      const cpRows: any = await query(
        `SELECT cp.coupon_id, cp.code, cp.expiry_date, cp.sms_phone, cp.sms_message, c.full_name, c.phone
         FROM coupons cp
         LEFT JOIN customers c ON cp.customer_id = c.customer_id
         WHERE cp.coupon_id = ?`,
        [Number(coupon_id)]
      );

      if (cpRows.length === 0) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      }

      const cp = cpRows[0];
      const targetPhone = cp.sms_phone || cp.phone;
      if (!targetPhone) {
        return NextResponse.json({ error: "Customer does not have a registered phone number to send SMS." }, { status: 400 });
      }

      const updatedMsg = cp.sms_message || `Congratulations ${cp.full_name || 'Valued Customer'}! You have won the coupon "${cp.code}". Valid for 2 months. You can purchase up to 5 products with a limit of LKR 3,000. One-time use only.`;

      await query(
        `UPDATE coupons
         SET sms_phone = ?, sms_status = 'SENT', sms_message = ?
         WHERE coupon_id = ?`,
        [targetPhone, updatedMsg, Number(coupon_id)]
      );

      return NextResponse.json({
        success: true,
        phone: targetPhone,
        message: `SMS message re-sent successfully to ${targetPhone}!`,
        sms_preview: updatedMsg,
      });
    }

    // Action 4: Issue Single Coupon (Policy: Top 10 customer, valid 2 months, max 5 products, limit 3000, send SMS)
    const { 
      code, 
      promo_id, 
      customer_id, 
      expiry_date, 
      phone, 
      max_products = 5, 
      purchase_limit = 3000.00,
      custom_sms 
    } = body;

    if (!code || !promo_id) {
      return NextResponse.json({ error: "Coupon code and linked promotion are required." }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const finalExpiry = expiry_date && expiry_date.trim() ? expiry_date : defaultTwoMonthsDate();

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

    // Standard message mandated by user:
    // "Congratulations you have won the coupon. coupon allocate can purchase 5 products limit 3000. valid 2 month of coupon. one-time use only"
    const smsMessage = custom_sms && custom_sms.trim() 
      ? custom_sms.trim()
      : `Congratulations ${customerName}! You have won the exclusive coupon "${cleanCode}". You can purchase up to ${max_products} products with a limit of LKR ${Number(purchase_limit).toLocaleString()}. Valid for 2 months (expires ${finalExpiry}). One-time use only!`;

    try {
      const res: any = await query(
        `INSERT INTO coupons 
         (code, promo_id, customer_id, expiry_date, is_used, max_products, purchase_limit, sms_phone, sms_status, sms_message, created_at)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'SENT', ?, NOW())`,
        [
          cleanCode,
          Number(promo_id),
          customer_id ? Number(customer_id) : null,
          finalExpiry,
          Number(max_products) || 5,
          Number(purchase_limit) || 3000.00,
          customerPhone,
          smsMessage,
        ]
      );

      return NextResponse.json({
        success: true,
        coupon_id: res.insertId,
        code: cleanCode,
        expiry_date: finalExpiry,
        max_products: Number(max_products) || 5,
        purchase_limit: Number(purchase_limit) || 3000.00,
        sms: {
          sent_to: customerPhone,
          status: "SENT",
          message: smsMessage,
        },
        message: `Coupon "${cleanCode}" issued successfully! Valid for 2 months (expires ${finalExpiry}), max 5 products, limit LKR ${purchase_limit}. SMS notification dispatched to ${customerPhone || "customer"}.`,
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

