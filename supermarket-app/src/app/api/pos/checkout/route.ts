import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";
interface CartItemInput {
  product_id: number;
  quantity: number;
  discount_amount?: number;
}

interface PaymentInput {
  method: "CASH" | "CARD" | "MOBILE" | "POINTS";
  amount: number;
  reference?: string;
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("create_pos_sales");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  const connection = await pool.getConnection();

  try {
    const body = await req.json();
    const {
      customer_id,
      coupon_code,
      items,
      payments,
    }: {
      customer_id?: number | null;
      coupon_code?: string | null;
      items: CartItemInput[];
      payments: PaymentInput[];
    } = body;

    // Server-verified cashier identity and branch confinement
    const cashier_id = session.employee_id;
    const branch_id =
      session.role === "ADMIN" && body.branch_id
        ? Number(body.branch_id)
        : session.branch_id;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart cannot be empty" }, { status: 400 });
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({ error: "At least one payment method is required" }, { status: 400 });
    }

    // Begin Database Transaction
    await connection.beginTransaction();

    // 1. Fetch & lock product data and inventory
    let subtotal = 0;
    let discount_total = 0;
    let tax_total = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const [prodRows]: any = await connection.query(
        "SELECT product_id, barcode, name, unit_price, cost_price, tax_rate, is_active FROM products WHERE product_id = ? FOR UPDATE",
        [item.product_id]
      );

      if (prodRows.length === 0 || prodRows[0].is_active !== 1) {
        throw new Error(`Product ID ${item.product_id} is unavailable or inactive.`);
      }

      const prod = prodRows[0];
      const unitPrice = Number(prod.unit_price);
      const qty = item.quantity;

      if (qty <= 0) {
        throw new Error(`Invalid quantity for product ${prod.name}`);
      }

      // Check branch inventory stock
      const [invRows]: any = await connection.query(
        "SELECT inventory_id, quantity_on_hand FROM inventory WHERE branch_id = ? AND product_id = ? FOR UPDATE",
        [branch_id, item.product_id]
      );

      const currentStock = invRows.length > 0 ? Number(invRows[0].quantity_on_hand) : 0;
      if (currentStock < qty) {
        throw new Error(`Insufficient stock for "${prod.name}" (Requested: ${qty}, In Stock: ${currentStock})`);
      }

      const lineGross = qty * unitPrice;
      const lineDiscount = item.discount_amount ? Number(item.discount_amount) : 0;
      const lineNet = Math.max(0, lineGross - lineDiscount);
      const taxRate = Number(prod.tax_rate) > 0 ? Number(prod.tax_rate) : 0; // or 18% standard
      const lineTax = lineNet * (taxRate / 100);

      subtotal += lineGross;
      discount_total += lineDiscount;
      tax_total += lineTax;

      validatedItems.push({
        product_id: prod.product_id,
        name: prod.name,
        barcode: prod.barcode,
        quantity: qty,
        unit_price: unitPrice,
        discount_amount: lineDiscount,
        line_total: lineNet,
        current_stock: currentStock,
      });
    }

    // 2. Validate Coupon if provided
    let coupon_id: number | null = null;
    let promo_id: number | null = null;

    if (coupon_code && coupon_code.trim()) {
      const [couponRows]: any = await connection.query(
        `SELECT c.coupon_id, c.promo_id, c.is_used, c.expiry_date, p.discount_percent
         FROM coupons c
         JOIN promotions p ON c.promo_id = p.promo_id
         WHERE c.code = ? AND c.is_used = 0 AND c.expiry_date >= CURRENT_DATE FOR UPDATE`,
        [coupon_code.trim()]
      );

      if (couponRows.length > 0) {
        const cp = couponRows[0];
        coupon_id = cp.coupon_id;
        promo_id = cp.promo_id;
        const couponDiscPct = Number(cp.discount_percent);
        const additionalDiscount = (subtotal * couponDiscPct) / 100;
        discount_total += additionalDiscount;
      } else {
        throw new Error(`Coupon "${coupon_code}" is invalid or expired.`);
      }
    }

    // Default standard tax is 18% if tax_total is zero
    if (tax_total === 0) {
      tax_total = (subtotal - discount_total) * 0.18;
    }

    const total_amount = Math.max(0, subtotal - discount_total + tax_total);

    // 3. Validate Payments
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (totalPaid < total_amount - 0.01) {
      throw new Error(`Payment amount ($${totalPaid.toFixed(2)}) is less than total due ($${total_amount.toFixed(2)})`);
    }

    const amountTenderedInput = (body as any).amount_tendered ?? (body as any).amountTendered;
    const cashPay = payments.find((p) => p.method === "CASH");
    const cashLineAmount = cashPay ? Number(cashPay.amount) : 0;
    const effectiveTendered = amountTenderedInput !== undefined && amountTenderedInput !== null
      ? Number(amountTenderedInput)
      : totalPaid;
    const changeDue = cashPay && effectiveTendered > cashLineAmount
      ? Number((effectiveTendered - cashLineAmount).toFixed(2))
      : 0;

    // 4. Create Sale Record
    const [saleRes]: any = await connection.query(
      `INSERT INTO sales (
        branch_id, cashier_id, customer_id, promo_id, coupon_id,
        sale_date, status, subtotal, discount_total, tax_total, total_amount,
        tendered_cash, tendered_amount, change_amount
      ) VALUES (?, ?, ?, ?, ?, NOW(), 'COMPLETED', ?, ?, ?, ?, ?, ?, ?)`,
      [
        branch_id,
        cashier_id,
        customer_id || null,
        promo_id,
        coupon_id,
        subtotal.toFixed(2),
        discount_total.toFixed(2),
        tax_total.toFixed(2),
        total_amount.toFixed(2),
        effectiveTendered.toFixed(2),
        effectiveTendered.toFixed(2),
        changeDue.toFixed(2),
      ]
    );

    const sale_id = saleRes.insertId;

    // 5. Insert Sale Items & Deduct Inventory Stock
    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO sale_items (
          sale_id, product_id, quantity, unit_price, discount_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sale_id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.discount_amount,
          item.line_total,
        ]
      );

      // Deduct inventory
      await connection.query(
        `UPDATE inventory 
         SET quantity_on_hand = quantity_on_hand - ?, last_updated = NOW()
         WHERE branch_id = ? AND product_id = ?`,
        [item.quantity, branch_id, item.product_id]
      );

      // Also deduct from oldest product_batches (FIFO)
      const [batches]: any = await connection.query(
        `SELECT batch_id, quantity 
         FROM product_batches 
         WHERE branch_id = ? AND product_id = ? AND quantity > 0 
         ORDER BY expiry_date ASC, received_date ASC FOR UPDATE`,
        [branch_id, item.product_id]
      );

      let remainingToDeduct = item.quantity;
      for (const b of batches) {
        if (remainingToDeduct <= 0) break;
        const deductFromBatch = Math.min(b.quantity, remainingToDeduct);
        await connection.query(
          "UPDATE product_batches SET quantity = quantity - ? WHERE batch_id = ?",
          [deductFromBatch, b.batch_id]
        );
        remainingToDeduct -= deductFromBatch;
      }
    }

    // 6. Record Payments
    for (const p of payments) {
      await connection.query(
        `INSERT INTO payments (sale_id, method, amount, reference, paid_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [sale_id, p.method, Number(p.amount).toFixed(2), p.reference || null]
      );
    }

    // 7. Handle Coupon usage
    if (coupon_id) {
      await connection.query(
        "UPDATE coupons SET is_used = 1, used_at = NOW() WHERE coupon_id = ?",
        [coupon_id]
      );
    }

    // 8. Handle Customer Loyalty Points (Spend & Earn)
    let earnedPoints = 0;
    let pointsRedeemed = 0;
    let newPointsBalance = 0;
    let customerTier = "BRONZE";

    if (customer_id) {
      const [custRows]: any = await connection.query(
        "SELECT customer_id, card_no, full_name, tier, points_balance, is_active FROM customers WHERE customer_id = ? FOR UPDATE",
        [customer_id]
      );

      if (custRows.length > 0 && custRows[0].is_active === 1) {
        const cust = custRows[0];
        customerTier = cust.tier;
        let currentPoints = Number(cust.points_balance || 0);

        // A. Points Spent / Redeemed as payment
        const pointsPayment = payments.find((p) => p.method === "POINTS");
        if (pointsPayment && Number(pointsPayment.amount) > 0) {
          pointsRedeemed = Math.floor(Number(pointsPayment.amount));
          if (currentPoints < pointsRedeemed) {
            throw new Error(
              `Insufficient loyalty points. Customer has ${currentPoints} points available, cannot redeem ${pointsRedeemed} points.`
            );
          }
          if (pointsRedeemed > Math.floor(total_amount)) {
            throw new Error(
              `Cannot redeem more points (${pointsRedeemed}) than the total bill amount (Rs. ${total_amount.toFixed(2)}).`
            );
          }
          currentPoints -= pointsRedeemed;

          await connection.query(
            `INSERT INTO loyalty_transactions (
              customer_id, branch_id, sale_id, points, type, note, created_at
            ) VALUES (?, ?, ?, ?, 'REDEEM', 'Points spent at checkout for purchase', NOW())`,
            [customer_id, branch_id, sale_id, -pointsRedeemed]
          );
        }

        // B. Points Earned on this purchase:
        // Business Rule: If customer pays partially or fully with loyalty points, that transaction does NOT earn any loyalty points.
        if (pointsRedeemed === 0) {
          let multiplier = 1.0;
          if (cust.tier === "SILVER") multiplier = 1.1;
          else if (cust.tier === "GOLD") multiplier = 1.25;
          else if (cust.tier === "PLATINUM") multiplier = 1.5;

          earnedPoints = Math.floor((total_amount / 100) * multiplier);
          if (earnedPoints > 0) {
            currentPoints += earnedPoints;

            await connection.query(
              `INSERT INTO loyalty_transactions (
                customer_id, branch_id, sale_id, points, type, note, created_at
              ) VALUES (?, ?, ?, ?, 'EARN', ?, NOW())`,
              [
                customer_id,
                branch_id,
                sale_id,
                earnedPoints,
                `Points earned from purchase (${cust.tier} tier: ${multiplier}x)`,
              ]
            );
          }
        } else {
          earnedPoints = 0;
        }

        // C. Update final points balance
        await connection.query(
          "UPDATE customers SET points_balance = ? WHERE customer_id = ?",
          [currentPoints, customer_id]
        );
        newPointsBalance = currentPoints;

        // D. Automatic tier progression check
        const [spendRow]: any = await connection.query(
          `SELECT COALESCE(SUM(total_amount), 0) AS total_spent FROM sales WHERE customer_id = ? AND status = 'COMPLETED'`,
          [customer_id]
        );
        const totalSpent = Number(spendRow[0]?.total_spent || 0) + total_amount;
        let targetTier = "BRONZE";
        if (totalSpent >= 100000) targetTier = "PLATINUM";
        else if (totalSpent >= 50000) targetTier = "GOLD";
        else if (totalSpent >= 20000) targetTier = "SILVER";

        if (targetTier !== cust.tier) {
          await connection.query(`UPDATE customers SET tier = ? WHERE customer_id = ?`, [targetTier, customer_id]);
          try {
            await connection.query(
              `INSERT INTO customer_tier_history (customer_id, old_tier, new_tier, reason, changed_at)
               VALUES (?, ?, ?, 'Automatic tier progression upon purchase milestone', NOW())`,
              [customer_id, cust.tier, targetTier]
            );
          } catch (thErr) {
            console.warn("Tier history error:", thErr);
          }
          customerTier = targetTier;
        }
      }
    }

    // 9. Audit Log
    await connection.query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('sales', ?, 'INSERT', ?, ?, NOW())`,
      [
        String(sale_id),
        JSON.stringify({
          sale_id,
          branch_id,
          cashier_id,
          total_amount,
          items_count: items.length,
          payment_methods: payments.map((p) => p.method),
          points_redeemed: pointsRedeemed,
          points_earned: earnedPoints,
        }),
        `cashier_${cashier_id}`,
      ]
    );

    // Commit Transaction
    await connection.commit();

    return NextResponse.json({
      success: true,
      sale_id,
      receipt: {
        sale_id,
        sale_date: new Date().toISOString(),
        branch_id,
        cashier_id,
        customer_id,
        items: validatedItems,
        subtotal: subtotal.toFixed(2),
        discount_total: discount_total.toFixed(2),
        tax_total: tax_total.toFixed(2),
        total_amount: total_amount.toFixed(2),
        total_paid: totalPaid.toFixed(2),
        change: Math.max(0, totalPaid - total_amount).toFixed(2),
        payments,
        earned_points: earnedPoints,
        points_redeemed: pointsRedeemed,
        new_points_balance: newPointsBalance,
        customer_tier: customerTier,
      },
    });
  } catch (err: any) {
    await connection.rollback();
    console.error("POST /api/pos/checkout transaction error:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 400 });
  } finally {
    connection.release();
  }
}
