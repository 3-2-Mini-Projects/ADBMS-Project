import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

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
  const connection = await pool.getConnection();

  try {
    const body = await req.json();
    const {
      branch_id,
      cashier_id,
      customer_id,
      coupon_code,
      items,
      payments,
    }: {
      branch_id: number;
      cashier_id: number;
      customer_id?: number | null;
      coupon_code?: string | null;
      items: CartItemInput[];
      payments: PaymentInput[];
    } = body;

    if (!branch_id || !cashier_id) {
      return NextResponse.json({ error: "Branch ID and Cashier ID are required" }, { status: 400 });
    }

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

    // 4. Create Sale Record
    const [saleRes]: any = await connection.query(
      `INSERT INTO sales (
        branch_id, cashier_id, customer_id, promo_id, coupon_id,
        sale_date, status, subtotal, discount_total, tax_total, total_amount
      ) VALUES (?, ?, ?, ?, ?, NOW(), 'COMPLETED', ?, ?, ?, ?)`,
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

    // 8. Handle Customer Loyalty Points
    let earnedPoints = 0;
    if (customer_id) {
      // 1 point for every 100 Rs/currency spent
      earnedPoints = Math.floor(total_amount / 100);
      if (earnedPoints > 0) {
        await connection.query(
          "UPDATE customers SET points_balance = points_balance + ? WHERE customer_id = ?",
          [earnedPoints, customer_id]
        );

        await connection.query(
          `INSERT INTO loyalty_transactions (customer_id, sale_id, points_change, transaction_type, created_at)
           VALUES (?, ?, ?, 'EARNED', NOW())`,
          [customer_id, sale_id, earnedPoints]
        );
      }

      // Check if points were used as payment
      const pointsPayment = payments.find((p) => p.method === "POINTS");
      if (pointsPayment && Number(pointsPayment.amount) > 0) {
        const pointsDeducted = Math.floor(Number(pointsPayment.amount));
        await connection.query(
          "UPDATE customers SET points_balance = points_balance - ? WHERE customer_id = ?",
          [pointsDeducted, customer_id]
        );

        await connection.query(
          `INSERT INTO loyalty_transactions (customer_id, sale_id, points_change, transaction_type, created_at)
           VALUES (?, ?, ?, 'REDEEMED', NOW())`,
          [customer_id, sale_id, -pointsDeducted]
        );
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
        }),
        `cashier_${cashier_id}`,
      ]
    );

    // Commit transaction!
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
