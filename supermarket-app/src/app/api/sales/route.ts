import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const cashierId = searchParams.get("cashierId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let sql = `
      SELECT 
        s.sale_id,
        s.branch_id,
        b.name AS branch_name,
        s.cashier_id,
        e.full_name AS cashier_name,
        s.customer_id,
        c.full_name AS customer_name,
        c.card_no AS customer_card,
        s.promo_id,
        s.coupon_id,
        s.sale_date,
        s.status,
        s.subtotal,
        s.discount_total,
        s.tax_total,
        s.total_amount,
        COUNT(si.sale_item_id) AS items_count
      FROM sales s
      JOIN branches b ON s.branch_id = b.branch_id
      JOIN employees e ON s.cashier_id = e.employee_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN sale_items si ON s.sale_id = si.sale_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND s.branch_id = ?`;
      params.push(branchId);
    }

    if (cashierId) {
      sql += ` AND s.cashier_id = ?`;
      params.push(cashierId);
    }

    if (status) {
      sql += ` AND s.status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (s.sale_id = ? OR c.full_name LIKE ? OR c.card_no = ?)`;
      params.push(search, `%${search}%`, search);
    }

    sql += ` GROUP BY s.sale_id, s.branch_id, b.name, s.cashier_id, e.full_name, s.customer_id, c.full_name, c.card_no, s.promo_id, s.coupon_id, s.sale_date, s.status, s.subtotal, s.discount_total, s.tax_total, s.total_amount`;
    sql += ` ORDER BY s.sale_date DESC LIMIT 100`;

    const sales = await query(sql, params);
    return NextResponse.json(sales);
  } catch (err: any) {
    console.error("GET /api/sales error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
