import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest("view_reports");
    if (auth.error) {
      return auth.error;
    }
    const { session } = auth;

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "all";
    const requestedBranch = searchParams.get("branchId");
    const branchId =
      session.role === "ADMIN"
        ? requestedBranch
        : String(session.branch_id);

    const reports: any = {};

    // 1. Daily Sales View
    try {
      reports.dailySales = await query(`
        SELECT 
          d.*,
          b.name AS branch_name
        FROM daily_sales_vw d
        LEFT JOIN branches b ON d.branch_id = b.branch_id
        ${branchId ? "WHERE d.branch_id = " + Number(branchId) : ""}
        ORDER BY d.sale_date DESC LIMIT 30
      `);
    } catch (e: any) {
      reports.dailySalesError = e.message;
    }

    // 2. Branch Sales Performance View
    try {
      reports.branchSales = await query(`
        SELECT 
          bs.*,
          b.name AS branch_name,
          b.city,
          b.region
        FROM branch_sales_vw bs
        LEFT JOIN branches b ON bs.branch_id = b.branch_id
      `);
    } catch (e: any) {
      reports.branchSalesError = e.message;
    }

    // 3. Cashier Sales Performance View
    try {
      reports.cashierSales = await query(`
        SELECT 
          cs.*,
          e.full_name AS cashier_name,
          e.email,
          b.name AS branch_name
        FROM cashier_sales_vw cs
        LEFT JOIN employees e ON cs.cashier_id = e.employee_id
        LEFT JOIN branches b ON e.branch_id = b.branch_id
      `);
    } catch (e: any) {
      reports.cashierSalesError = e.message;
    }

    // 4. Payment Method Summary View
    try {
      reports.paymentSummary = await query("SELECT * FROM payment_summary_vw");
    } catch (e: any) {
      reports.paymentSummaryError = e.message;
    }

    // 5. Returns Report View
    try {
      reports.returnReport = await query(`
        SELECT 
          rr.*,
          p.name AS product_name,
          e.full_name AS processor_name
        FROM return_report_vw rr
        LEFT JOIN products p ON rr.product_id = p.product_id
        LEFT JOIN employees e ON rr.processed_by = e.employee_id
        ORDER BY rr.return_date DESC LIMIT 30
      `);
    } catch (e: any) {
      reports.returnReportError = e.message;
    }

    // 6. Daily Sales Summary Base Table
    try {
      reports.dailySummaryTable = await query(`
        SELECT 
          dss.*,
          b.name AS branch_name
        FROM daily_sales_summary dss
        LEFT JOIN branches b ON dss.branch_id = b.branch_id
        ORDER BY dss.summary_date DESC LIMIT 30
      `);
    } catch (e: any) {
      reports.dailySummaryTableError = e.message;
    }

    return NextResponse.json(reports);
  } catch (err: any) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
