import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sale = await queryOne(
      `SELECT 
        s.sale_id,
        s.branch_id,
        b.name AS branch_name,
        b.address AS branch_address,
        b.phone AS branch_phone,
        s.cashier_id,
        e.full_name AS cashier_name,
        s.customer_id,
        c.full_name AS customer_name,
        c.card_no AS customer_card,
        c.points_balance AS customer_points,
        s.promo_id,
        p.name AS promo_name,
        s.coupon_id,
        cp.code AS coupon_code,
        s.sale_date,
        s.status,
        s.subtotal,
        s.discount_total,
        s.tax_total,
        s.total_amount
       FROM sales s
       JOIN branches b ON s.branch_id = b.branch_id
       JOIN employees e ON s.cashier_id = e.employee_id
       LEFT JOIN customers c ON s.customer_id = c.customer_id
       LEFT JOIN promotions p ON s.promo_id = p.promo_id
       LEFT JOIN coupons cp ON s.coupon_id = cp.coupon_id
       WHERE s.sale_id = ?`,
      [id]
    );

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const items = await query(
      `SELECT 
        si.sale_item_id,
        si.sale_id,
        si.product_id,
        p.name AS product_name,
        p.barcode,
        si.quantity,
        si.unit_price,
        si.discount_amount,
        si.line_total
       FROM sale_items si
       JOIN products p ON si.product_id = p.product_id
       WHERE si.sale_id = ?`,
      [id]
    );

    const payments = await query(
      `SELECT payment_id, sale_id, method, amount, reference, paid_at
       FROM payments
       WHERE sale_id = ?`,
      [id]
    );

    return NextResponse.json({
      ...sale,
      items,
      payments,
    });
  } catch (err: any) {
    console.error("GET /api/sales/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
