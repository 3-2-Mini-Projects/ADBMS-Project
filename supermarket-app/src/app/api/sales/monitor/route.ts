import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const params: any[] = [];
    let branchFilter = "";
    if (branchId) { branchFilter = "AND s.branch_id = ?"; params.push(branchId); }

    // Last 20 sales (live feed)
    const recent = await query<any>(`
      SELECT
        s.sale_id, s.sale_date, s.status, s.total_amount,
        b.name AS branch_name,
        e.full_name AS cashier_name,
        c.full_name AS customer_name,
        COUNT(si.sale_item_id) AS items_count
      FROM sales s
      JOIN branches b  ON s.branch_id  = b.branch_id
      JOIN employees e ON s.cashier_id = e.employee_id
      LEFT JOIN customers c   ON s.customer_id = c.customer_id
      LEFT JOIN sale_items si ON s.sale_id     = si.sale_id
      WHERE 1=1 ${branchFilter}
      GROUP BY s.sale_id, s.sale_date, s.status, s.total_amount, b.name, e.full_name, c.full_name
      ORDER BY s.sale_date DESC LIMIT 20
    `, params);

    // Today stats
    const [todayStats] = await query<any>(`
      SELECT
        COUNT(*) AS total_txns,
        COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN s.total_amount END), 0) AS today_revenue,
        COALESCE(SUM(CASE WHEN s.status='CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_count,
        COALESCE(AVG(CASE WHEN s.status='COMPLETED' THEN s.total_amount END), 0) AS avg_ticket
      FROM sales s
      WHERE DATE(s.sale_date) = CURDATE() ${branchFilter}
    `, params);

    // Active cashiers today
    const activeCashiers = await query<any>(`
      SELECT
        e.full_name AS cashier_name,
        COUNT(s.sale_id) AS sales_count,
        COALESCE(SUM(s.total_amount), 0) AS total
      FROM sales s
      JOIN employees e ON s.cashier_id = e.employee_id
      WHERE DATE(s.sale_date) = CURDATE() AND s.status = 'COMPLETED' ${branchFilter}
      GROUP BY e.employee_id, e.full_name
      ORDER BY total DESC LIMIT 8
    `, params);

    return NextResponse.json({ recent, todayStats, activeCashiers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
