import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/cashier/summary?branchId=1&cashierId=2&date=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = Number(searchParams.get("branchId") || "1");
    const cashierId = searchParams.get("cashierId");

    // 1. Branch daily sales summary history from daily_sales_summary table
    const branchSummaries = await query<any>(`
      SELECT 
        dss.summary_id,
        dss.branch_id,
        b.name AS branch_name,
        dss.summary_date,
        dss.transactions_count,
        dss.total_sales,
        dss.total_tax
      FROM daily_sales_summary dss
      JOIN branches b ON dss.branch_id = b.branch_id
      WHERE dss.branch_id = ?
      ORDER BY dss.summary_date DESC
      LIMIT 15
    `, [branchId]);

    // 2. Cashier-specific daily aggregation from sales table
    let cashierDailyBreakdown: any[] = [];
    if (cashierId) {
      cashierDailyBreakdown = await query<any>(`
        SELECT 
          DATE(sale_date) AS sale_date,
          COUNT(*) AS transactions_count,
          SUM(total_amount) AS total_sales,
          SUM(tax_total) AS total_tax,
          SUM(discount_total) AS total_discount
        FROM sales
        WHERE cashier_id = ? AND status = 'COMPLETED'
        GROUP BY DATE(sale_date)
        ORDER BY sale_date DESC
        LIMIT 10
      `, [Number(cashierId)]);
    }

    return NextResponse.json({
      branchSummaries,
      cashierDailyBreakdown,
    });
  } catch (error: any) {
    console.error("Daily summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/cashier/summary/sync — Trigger a safe aggregation into daily_sales_summary
export async function POST(req: Request) {
  try {
    const { branchId, date } = await req.json();
    const targetBranch = Number(branchId || 1);
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Aggregate from sales
    const [calc]: any = await query(`
      SELECT 
        COUNT(*) AS tx_count,
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COALESCE(SUM(tax_total), 0) AS total_tax
      FROM sales
      WHERE branch_id = ? 
        AND status = 'COMPLETED'
        AND DATE(sale_date) = ?
    `, [targetBranch, targetDate]);

    const txCount = Number(calc?.tx_count || 0);
    const totalSales = Number(calc?.total_sales || 0);
    const totalTax = Number(calc?.total_tax || 0);

    // Upsert or delete & insert to prevent duplicate summary records for the same branch and date
    await query(`
      DELETE FROM daily_sales_summary WHERE branch_id = ? AND summary_date = ?
    `, [targetBranch, targetDate]);

    await query(`
      INSERT INTO daily_sales_summary (branch_id, summary_date, transactions_count, total_sales, total_tax)
      VALUES (?, ?, ?, ?, ?)
    `, [targetBranch, targetDate, txCount, totalSales.toFixed(2), totalTax.toFixed(2)]);

    return NextResponse.json({
      success: true,
      message: `Daily sales summary synced for branch ${targetBranch} on ${targetDate}`,
      summary: {
        branch_id: targetBranch,
        summary_date: targetDate,
        transactions_count: txCount,
        total_sales: totalSales,
        total_tax: totalTax,
      },
    });
  } catch (error: any) {
    console.error("Daily summary sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
