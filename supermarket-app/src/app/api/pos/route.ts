import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/pos  — Create a new sale with items & payments
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { branchId, cashierId, customerId, items, payments } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }

    // Calculate totals
    let subtotal = 0;
    let discountTotal = 0;
    for (const item of items) {
      subtotal += item.unit_price * item.quantity;
      discountTotal += (item.discount_amount || 0) * item.quantity;
    }
    const taxTotal = (subtotal - discountTotal) * 0.18;
    const totalAmount = subtotal - discountTotal + taxTotal;

    // Insert sale
    const saleResult: any = await query(
      `INSERT INTO sales (branch_id, cashier_id, customer_id, sale_date, status,
                          subtotal, discount_total, tax_total, total_amount)
       VALUES (?, ?, ?, NOW(), 'COMPLETED', ?, ?, ?, ?)`,
      [branchId, cashierId || 1, customerId || null, subtotal.toFixed(2), discountTotal.toFixed(2), taxTotal.toFixed(2), totalAmount.toFixed(2)]
    );

    const saleId = (saleResult as any).insertId;

    // Insert items
    for (const item of items) {
      const lineTotal = item.unit_price * item.quantity - (item.discount_amount || 0) * item.quantity;
      await query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.quantity, item.unit_price, (item.discount_amount || 0), lineTotal.toFixed(2)]
      );
      // Deduct inventory
      await query(
        `UPDATE inventory SET quantity_on_hand = quantity_on_hand - ? WHERE product_id = ? AND branch_id = ?`,
        [item.quantity, item.product_id, branchId]
      );
    }

    // Insert payments
    for (const pay of payments || []) {
      await query(
        `INSERT INTO payments (sale_id, method, amount, reference, paid_at) VALUES (?, ?, ?, ?, NOW())`,
        [saleId, pay.method, pay.amount, pay.reference || null]
      );
    }

    return NextResponse.json({ sale_id: saleId, total_amount: totalAmount.toFixed(2) });
  } catch (err: any) {
    console.error("POS error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
