import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId  = searchParams.get("branchId");
    const startDate = searchParams.get("startDate") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate   = searchParams.get("endDate")   || new Date().toISOString().slice(0, 10);

    const params: any[] = [];
    let branchFilter = "";
    if (branchId) { branchFilter = "AND s.branch_id = ?"; params.push(branchId); }

    // Summary KPIs
    const [summary] = await query<any>(`
      SELECT
        COUNT(*)                                   AS total_sales,
        SUM(CASE WHEN s.status='COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN s.status='CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN s.total_amount END), 0) AS revenue,
        COALESCE(AVG(CASE WHEN s.status='COMPLETED' THEN s.total_amount END), 0) AS avg_sale,
        COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN s.discount_total END), 0) AS total_discounts,
        COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN s.tax_total END), 0) AS total_tax
      FROM sales s
      WHERE DATE(s.sale_date) BETWEEN ? AND ? ${branchFilter}
    `, [startDate, endDate, ...params]);

    // Daily sales trend
    const daily = await query<any>(`
      SELECT
        DATE(s.sale_date)  AS date,
        COUNT(*)           AS sales_count,
        COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN s.total_amount END), 0) AS revenue
      FROM sales s
      WHERE DATE(s.sale_date) BETWEEN ? AND ? ${branchFilter}
      GROUP BY DATE(s.sale_date)
      ORDER BY DATE(s.sale_date) ASC
    `, [startDate, endDate, ...params]);

    // Top products
    const topProducts = await query<any>(`
      SELECT
        p.name AS product_name,
        p.barcode,
        SUM(si.quantity) AS units_sold,
        SUM(si.line_total) AS revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.product_id
      JOIN sales s    ON si.sale_id    = s.sale_id
      WHERE DATE(s.sale_date) BETWEEN ? AND ? AND s.status = 'COMPLETED' ${branchFilter}
      GROUP BY p.product_id, p.name, p.barcode
      ORDER BY revenue DESC LIMIT 10
    `, [startDate, endDate, ...params]);

    // Payment method breakdown
    const paymentBreakdown = await query<any>(`
      SELECT
        pm.method,
        COUNT(*)       AS count,
        SUM(pm.amount) AS total
      FROM payments pm
      JOIN sales s ON pm.sale_id = s.sale_id
      WHERE DATE(s.sale_date) BETWEEN ? AND ? AND s.status = 'COMPLETED' ${branchFilter}
      GROUP BY pm.method
      ORDER BY total DESC
    `, [startDate, endDate, ...params]);

    // Sales by branch
    const byBranch = await query<any>(`
      SELECT
        b.name AS branch_name,
        COUNT(*) AS sales_count,
        SUM(CASE WHEN s.status='COMPLETED' THEN s.total_amount ELSE 0 END) AS revenue
      FROM sales s
      JOIN branches b ON s.branch_id = b.branch_id
      WHERE DATE(s.sale_date) BETWEEN ? AND ?
      GROUP BY s.branch_id, b.name
      ORDER BY revenue DESC
    `, [startDate, endDate]);

    return NextResponse.json({ summary, daily, topProducts, paymentBreakdown, byBranch });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
