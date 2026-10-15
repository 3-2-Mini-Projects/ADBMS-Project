import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    const [sale] = await query<any>(`
      SELECT
        s.sale_id, s.sale_date, s.status,
        s.subtotal, s.discount_total, s.tax_total, s.total_amount,
        b.name    AS branch_name,
        b.address AS branch_address,
        b.phone   AS branch_phone,
        e.full_name AS cashier_name,
        c.full_name AS customer_name,
        c.card_no   AS customer_card
      FROM sales s
      JOIN branches b  ON s.branch_id  = b.branch_id
      JOIN employees e ON s.cashier_id = e.employee_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.sale_id = ?
    `, [id]);

    if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = await query<any>(`
      SELECT si.sale_item_id, si.product_id, p.name AS product_name,
             si.quantity, si.unit_price, si.discount_amount, si.line_total
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      WHERE si.sale_id = ?
    `, [id]);

    const payments = await query<any>(`
      SELECT payment_id, method, amount, reference, paid_at
      FROM payments WHERE sale_id = ?
    `, [id]);

    return NextResponse.json({ ...sale, items, payments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
