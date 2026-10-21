import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/cashier/dashboard?cashierId=2&branchId=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cashierId = Number(searchParams.get("cashierId") || "2");
    const branchId = Number(searchParams.get("branchId") || "1");

    // 1. Cashier's Today Completed Sales
    const [cashierToday]: any = await query(`
      SELECT 
        COUNT(*) AS transactions_count,
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COALESCE(SUM(tax_total), 0) AS total_tax,
        COALESCE(SUM(discount_total), 0) AS total_discount,
        COALESCE(SUM(subtotal), 0) AS total_subtotal
      FROM sales
      WHERE cashier_id = ? 
        AND status = 'COMPLETED'
        AND DATE(sale_date) = CURRENT_DATE()
    `, [cashierId]);

    // Cashier All-time stats (for fallback/overall perspective)
    const [cashierAllTime]: any = await query(`
      SELECT 
        COUNT(*) AS total_transactions,
        COALESCE(SUM(total_amount), 0) AS lifetime_sales
      FROM sales
      WHERE cashier_id = ? AND status = 'COMPLETED'
    `, [cashierId]);

    // 2. Branch's Today Completed Sales
    const [branchToday]: any = await query(`
      SELECT 
        COUNT(*) AS transactions_count,
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COALESCE(SUM(tax_total), 0) AS total_tax
      FROM sales
      WHERE branch_id = ? 
        AND status = 'COMPLETED'
        AND DATE(sale_date) = CURRENT_DATE()
    `, [branchId]);

    // 3. Latest 50 transactions for the relevant branch
    const rawSales = await query<any>(`
      SELECT 
        s.sale_id,
        s.branch_id,
        b.branch_code,
        b.name AS branch_name,
        s.cashier_id,
        e.full_name AS cashier_name,
        s.sale_date,
        s.status,
        s.subtotal,
        s.discount_total,
        s.tax_total,
        s.total_amount,
        COALESCE(c.full_name, 'Walk-in Customer') AS customer_name,
        c.card_no AS customer_card,
        (SELECT GROUP_CONCAT(DISTINCT method SEPARATOR ', ') FROM payments WHERE sale_id = s.sale_id) AS payment_methods,
        (SELECT GROUP_CONCAT(DISTINCT reference SEPARATOR ', ') FROM payments WHERE sale_id = s.sale_id AND reference IS NOT NULL AND reference != '') AS payment_references,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.sale_id) AS items_count
      FROM sales s
      JOIN branches b ON s.branch_id = b.branch_id
      LEFT JOIN employees e ON s.cashier_id = e.employee_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      WHERE s.branch_id = ?
      ORDER BY s.sale_date DESC, s.sale_id DESC
      LIMIT 50
    `, [branchId]);

    const recentSales = (rawSales || []).map((s: any) => ({
      ...s,
      receipt_number: `REC-${s.branch_code || "BR"}-${String(s.sale_id).padStart(6, "0")}`,
    }));

    // 4. Latest 10 return details of that day
    const todayReturns = await query<any>(`
      SELECT 
        r.return_id,
        r.sale_item_id,
        si.sale_id,
        si.product_id,
        p.name AS product_name,
        p.barcode,
        r.quantity,
        r.reason,
        r.refund_amount,
        r.return_date,
        COALESCE(e.full_name, 'Manager Authorized') AS processor_name
      FROM returns r
      JOIN sale_items si ON r.sale_item_id = si.sale_item_id
      JOIN sales s ON si.sale_id = s.sale_id
      JOIN products p ON si.product_id = p.product_id
      LEFT JOIN employees e ON r.processed_by = e.employee_id
      WHERE s.branch_id = ?
      ORDER BY (DATE(r.return_date) = CURRENT_DATE()) DESC, r.return_date DESC
      LIMIT 10
    `, [branchId]);

    // 5. Latest Daily Sales Summary row for the branch
    const branchSummaries = await query<any>(`
      SELECT summary_id, branch_id, summary_date, transactions_count, total_sales, total_tax
      FROM daily_sales_summary
      WHERE branch_id = ?
      ORDER BY summary_date DESC
      LIMIT 5
    `, [branchId]);

    // 6. Branch low stock count
    const [lowStock]: any = await query(`
      SELECT COUNT(*) AS low_stock_count
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.branch_id = ? AND (i.quantity_on_hand - i.reserved_qty) <= i.reorder_level
    `, [branchId]);

    return NextResponse.json({
      cashierToday: {
        transactions_count: Number(cashierToday?.transactions_count || 0),
        total_sales: Number(cashierToday?.total_sales || 0),
        total_tax: Number(cashierToday?.total_tax || 0),
        total_discount: Number(cashierToday?.total_discount || 0),
        total_subtotal: Number(cashierToday?.total_subtotal || 0),
        lifetime_transactions: Number(cashierAllTime?.total_transactions || 0),
        lifetime_sales: Number(cashierAllTime?.lifetime_sales || 0),
      },
      branchToday: {
        transactions_count: Number(branchToday?.transactions_count || 0),
        total_sales: Number(branchToday?.total_sales || 0),
        total_tax: Number(branchToday?.total_tax || 0),
      },
      recentSales,
      todayReturns,
      branchSummaries,
      lowStockCount: Number(lowStock?.low_stock_count || 0),
    });
  } catch (error: any) {
    console.error("Cashier dashboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
