import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/cashier/summary?branchId=1&cashierId=2&date=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = Number(searchParams.get("branchId") || "1");
    const cashierId = searchParams.get("cashierId");
    
    // Default to today in YYYY-MM-DD
    const targetDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

    // 1. Branch daily sales summary history from daily_sales_summary table
    const branchSummaries = await query<any>(`
      SELECT 
        dss.summary_id,
        dss.branch_id,
        b.name AS branch_name,
        b.branch_code,
        dss.summary_date,
        dss.transactions_count,
        dss.total_sales,
        dss.total_tax
      FROM daily_sales_summary dss
      JOIN branches b ON dss.branch_id = b.branch_id
      WHERE dss.branch_id = ?
      ORDER BY dss.summary_date DESC
      LIMIT 30
    `, [branchId]);

    // 2. Cashier-specific daily aggregation for the targetDate
    let cashierSummary = null;
    let cashierPaymentsByMethod: any[] = [];
    let cashierReturns = { returns_count: 0, total_refunds: 0 };

    if (cashierId) {
      const numCashierId = Number(cashierId);
      const [cSum]: any = await query(`
        SELECT 
          COUNT(*) AS transactions_count,
          COALESCE(SUM(total_amount), 0) AS total_sales,
          COALESCE(SUM(tax_total), 0) AS total_tax,
          COALESCE(SUM(discount_total), 0) AS total_discount,
          COALESCE(SUM(subtotal), 0) AS total_subtotal,
          COALESCE(SUM(tendered_cash), 0) AS total_tendered_cash,
          COALESCE(SUM(change_amount), 0) AS total_change
        FROM sales
        WHERE cashier_id = ? 
          AND status = 'COMPLETED'
          AND DATE(sale_date) = ?
      `, [numCashierId, targetDate]);

      cashierSummary = {
        transactions_count: Number(cSum?.transactions_count || 0),
        total_sales: Number(cSum?.total_sales || 0),
        total_tax: Number(cSum?.total_tax || 0),
        total_discount: Number(cSum?.total_discount || 0),
        total_subtotal: Number(cSum?.total_subtotal || 0),
        total_tendered_cash: Number(cSum?.total_tendered_cash || 0),
        total_change: Number(cSum?.total_change || 0),
      };

      // Breakdown by payment method for this cashier on targetDate
      cashierPaymentsByMethod = await query<any>(`
        SELECT 
          p.method,
          COUNT(*) AS count,
          COALESCE(SUM(p.amount), 0) AS total_amount
        FROM payments p
        JOIN sales s ON p.sale_id = s.sale_id
        WHERE s.cashier_id = ? 
          AND s.status = 'COMPLETED'
          AND DATE(s.sale_date) = ?
        GROUP BY p.method
        ORDER BY total_amount DESC
      `, [numCashierId, targetDate]);

      // Returns/refunds processed on sales made by this cashier on targetDate
      const [cRet]: any = await query(`
        SELECT 
          COUNT(*) AS returns_count,
          COALESCE(SUM(r.refund_amount), 0) AS total_refunds
        FROM returns r
        JOIN sale_items si ON r.sale_item_id = si.sale_item_id
        JOIN sales s ON si.sale_id = s.sale_id
        WHERE s.cashier_id = ? 
          AND DATE(r.return_date) = ?
      `, [numCashierId, targetDate]);

      cashierReturns = {
        returns_count: Number(cRet?.returns_count || 0),
        total_refunds: Number(cRet?.total_refunds || 0),
      };
    }

    // 3. Branch live summary on targetDate
    const [branchLive]: any = await query(`
      SELECT 
        COUNT(*) AS transactions_count,
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COALESCE(SUM(tax_total), 0) AS total_tax,
        COALESCE(SUM(discount_total), 0) AS total_discount,
        COALESCE(SUM(subtotal), 0) AS total_subtotal
      FROM sales
      WHERE branch_id = ? 
        AND status = 'COMPLETED'
        AND DATE(sale_date) = ?
    `, [branchId, targetDate]);

    const branchSummaryForDate = {
      summary_date: targetDate,
      transactions_count: Number(branchLive?.transactions_count || 0),
      total_sales: Number(branchLive?.total_sales || 0),
      total_tax: Number(branchLive?.total_tax || 0),
      total_discount: Number(branchLive?.total_discount || 0),
      total_subtotal: Number(branchLive?.total_subtotal || 0),
    };

    // Active cashiers and their contributions on targetDate
    const activeCashiers = await query<any>(`
      SELECT 
        e.employee_id,
        e.full_name,
        COUNT(s.sale_id) AS transactions_count,
        COALESCE(SUM(s.total_amount), 0) AS total_sales
      FROM employees e
      JOIN sales s ON e.employee_id = s.cashier_id
      WHERE s.branch_id = ?
        AND s.status = 'COMPLETED'
        AND DATE(s.sale_date) = ?
      GROUP BY e.employee_id, e.full_name
      ORDER BY total_sales DESC
    `, [branchId, targetDate]);

    // 4. Cashier-specific daily aggregation history (last 15 active days)
    let cashierDailyBreakdown: any[] = [];
    if (cashierId) {
      cashierDailyBreakdown = await query<any>(`
        SELECT 
          DATE_FORMAT(sale_date, '%Y-%m-%d') AS sale_date,
          COUNT(*) AS transactions_count,
          SUM(total_amount) AS total_sales,
          SUM(tax_total) AS total_tax,
          SUM(discount_total) AS total_discount
        FROM sales
        WHERE cashier_id = ? AND status = 'COMPLETED'
        GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d')
        ORDER BY sale_date DESC
        LIMIT 15
      `, [Number(cashierId)]);
    }

    return NextResponse.json({
      targetDate,
      cashierSummary,
      cashierPaymentsByMethod,
      cashierReturns,
      branchSummaryForDate,
      activeCashiers,
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
