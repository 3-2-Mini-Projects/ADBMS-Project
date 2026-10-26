import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/cashier/sales/[id] — Full transaction details with items, payments, returns
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rawInput = decodeURIComponent(id || "").trim();

    if (!rawInput) {
      return NextResponse.json({ error: "Sale ID or Receipt Number is required" }, { status: 400 });
    }

    // Try parsing as direct numeric ID
    const directNumericId = !isNaN(Number(rawInput)) ? Number(rawInput) : null;

    // Try extracting trailing digits (e.g. REC-BR03-000072 -> 72)
    const trailingMatch = rawInput.match(/(\d+)$/);
    const trailingId = trailingMatch ? Number(trailingMatch[1]) : null;

    // Search sale by direct ID, receipt string, or trailing ID
    const [sale]: any = await query(`
      SELECT 
        s.sale_id,
        s.sale_date,
        s.status,
        s.subtotal,
        s.discount_total,
        s.tax_total,
        s.total_amount,
        s.tendered_cash,
        s.change_amount,
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
         OR CONCAT('REC-', COALESCE(b.branch_code, 'BR'), '-', LPAD(s.sale_id, 6, '0')) = ?
         OR CONCAT(COALESCE(b.branch_code, 'BR'), '-', LPAD(s.sale_id, 6, '0')) = ?
         OR (? IS NOT NULL AND s.sale_id = ?)
      LIMIT 1
    `, [
      directNumericId || -1,
      rawInput,
      rawInput,
      trailingId,
      trailingId || -1,
    ]);

    if (!sale) {
      return NextResponse.json({ error: `Sale not found for "${rawInput}"` }, { status: 404 });
    }

    const saleId = sale.sale_id;

    // Line items with product details and existing returns
    const rawItems = await query<any>(`
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

    const items = rawItems.map((item) => {
      const soldQty = Number(item.quantity || 0);
      const retQty = Number(item.returned_quantity || 0);
      const remQty = Math.max(0, soldQty - retQty);
      return {
        ...item,
        quantity: soldQty,
        returned_quantity: retQty,
        remaining_returnable_qty: remQty,
        unit_price: Number(item.unit_price || 0),
        discount_amount: Number(item.discount_amount || 0),
        line_total: Number(item.line_total || 0),
      };
    });

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

    const tenderedVal = sale.tendered_cash != null ? Number(sale.tendered_cash) : undefined;
    const changeVal = sale.change_amount != null ? Number(sale.change_amount) : undefined;

    return NextResponse.json({
      ...sale,
      subtotal: Number(sale.subtotal || 0),
      discount_total: Number(sale.discount_total || 0),
      tax_total: Number(sale.tax_total || 0),
      total_amount: Number(sale.total_amount || 0),
      receipt_number: receiptNumber,
      tendered_cash: tenderedVal,
      amountTendered: tenderedVal,
      change_amount: changeVal,
      changeDue: changeVal,
      items,
      payments,
      returns,
    });
  } catch (error: any) {
    console.error("Sale detail fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
