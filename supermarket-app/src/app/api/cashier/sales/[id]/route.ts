import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/cashier/sales/[id] — Full transaction details with items, payments, returns
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const saleId = Number(id);

    if (isNaN(saleId)) {
      return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
    }

    const [sale]: any = await query(`
      SELECT 
        s.sale_id,
        s.sale_date,
        s.status,
        s.subtotal,
        s.discount_total,
        s.tax_total,
        s.total_amount,
        s.branch_id,
        b.name AS branch_name,
        b.branch_code,
        b.address AS branch_address,
        b.phone AS branch_phone,
        b.city AS branch_city,
        s.cashier_id,
        e.full_name AS cashier_name,
        e.email AS cashier_email,
        s.customer_id,
        c.full_name AS customer_name,
        c.card_no AS customer_card,
        c.phone AS customer_phone,
        c.tier AS customer_tier,
        c.points_balance AS customer_points
      FROM sales s
      JOIN branches b ON s.branch_id = b.branch_id
      JOIN employees e ON s.cashier_id = e.employee_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.sale_id = ?
    `, [saleId]);

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Line items with product details and existing returns
    const items = await query<any>(`
      SELECT 
        si.sale_item_id,
        si.sale_id,
        si.product_id,
        p.name AS product_name,
        p.barcode,
        p.brand,
        si.quantity,
        si.unit_price,
        si.discount_amount,
        si.line_total,
        COALESCE((
          SELECT SUM(r.quantity) 
          FROM returns r 
          WHERE r.sale_item_id = si.sale_item_id
        ), 0) AS returned_quantity,
        (si.quantity - COALESCE((
          SELECT SUM(r.quantity) 
          FROM returns r 
          WHERE r.sale_item_id = si.sale_item_id
        ), 0)) AS remaining_returnable_qty
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      WHERE si.sale_id = ?
      ORDER BY si.sale_item_id ASC
    `, [saleId]);

    // Payment records
    const payments = await query<any>(`
      SELECT payment_id, sale_id, method, amount, reference, paid_at
      FROM payments
      WHERE sale_id = ?
      ORDER BY payment_id ASC
    `, [saleId]);

    // Returns records associated with this sale
    const returns = await query<any>(`
      SELECT 
        r.return_id,
        r.sale_item_id,
        r.quantity,
        r.reason,
        r.refund_amount,
        r.return_date,
        r.processed_by,
        e.full_name AS processed_by_name,
        p.name AS product_name
      FROM returns r
      JOIN sale_items si ON r.sale_item_id = si.sale_item_id
      JOIN products p ON si.product_id = p.product_id
      JOIN employees e ON r.processed_by = e.employee_id
      WHERE si.sale_id = ?
      ORDER BY r.return_date DESC
    `, [saleId]);

    const receiptNumber = `REC-${sale.branch_code || "BR"}-${String(sale.sale_id).padStart(6, "0")}`;

    return NextResponse.json({
      ...sale,
      receipt_number: receiptNumber,
      items,
      payments,
      returns,
    });
  } catch (error: any) {
    console.error("Sale detail fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
