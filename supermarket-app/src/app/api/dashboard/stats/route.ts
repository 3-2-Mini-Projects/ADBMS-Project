import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const branchFilter = branchId ? "AND s.branch_id = ?" : "";
    const invBranchFilter = branchId ? "WHERE i.branch_id = ?" : "";
    const batchBranchFilter = branchId ? "WHERE pb.branch_id = ?" : "";
    const params = branchId ? [branchId] : [];

    // 1. Overall Sales Metrics
    const [salesSummary]: any = await query(`
      SELECT 
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COUNT(s.sale_id) AS total_transactions,
        COALESCE(SUM(s.discount_total), 0) AS total_discount,
        COALESCE(SUM(s.tax_total), 0) AS total_tax
      FROM sales s
      WHERE s.status = 'COMPLETED' ${branchFilter}
    `, params);

    // 2. Total items sold
    const [itemsSummary]: any = await query(`
      SELECT COALESCE(SUM(si.quantity), 0) AS total_items_sold
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.sale_id
      WHERE s.status = 'COMPLETED' ${branchFilter}
    `, params);

    // 3. Low stock count
    const [lowStockSummary]: any = await query(`
      SELECT COUNT(*) AS low_stock_count
      FROM inventory i
      ${invBranchFilter}
      ${branchId ? "AND" : "WHERE"} i.quantity_on_hand <= i.reorder_level
    `, params);

    // 4. Batches expiring within 30 days
    const [expiringSummary]: any = await query(`
      SELECT COUNT(*) AS expiring_batches_count
      FROM product_batches pb
      ${batchBranchFilter}
      ${branchId ? "AND" : "WHERE"} pb.expiry_date IS NOT NULL 
        AND pb.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
        AND pb.quantity > 0
    `, params);

    // 5. Active promotions count
    const [promoSummary]: any = await query(`
      SELECT COUNT(*) AS active_promotions_count
      FROM promotions
      WHERE is_active = 1 
        AND CURRENT_DATE BETWEEN start_date AND end_date
    `);

    // 6. Recent Sales
    const recentSales = await query(`
      SELECT 
        s.sale_id,
        s.sale_date,
        s.status,
        s.total_amount,
        b.name AS branch_name,
        e.full_name AS cashier_name,
        c.full_name AS customer_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.branch_id
      JOIN employees e ON s.cashier_id = e.employee_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      ${branchId ? "WHERE s.branch_id = ?" : ""}
      ORDER BY s.sale_date DESC
      LIMIT 6
    `, params);

    // 7. Branch sales comparison (from branch_sales_vw or direct query)
    const branchSales = await query(`
      SELECT 
        b.branch_id,
        b.name AS branch_name,
        COALESCE(SUM(s.total_amount), 0) AS total_sales,
        COUNT(s.sale_id) AS transactions
      FROM branches b
      LEFT JOIN sales s ON b.branch_id = s.branch_id AND s.status = 'COMPLETED'
      GROUP BY b.branch_id, b.name
      ORDER BY total_sales DESC
    `);

    // 8. Payment method breakdown
    const paymentMethods = await query(`
      SELECT 
        p.method,
        COUNT(p.payment_id) AS payment_count,
        COALESCE(SUM(p.amount), 0) AS total_amount
      FROM payments p
      JOIN sales s ON p.sale_id = s.sale_id
      ${branchId ? "WHERE s.branch_id = ?" : ""}
      GROUP BY p.method
    `, params);

    // 9. Top selling products
    const topProducts = await query(`
      SELECT 
        p.product_id,
        p.name AS product_name,
        p.barcode,
        p.unit_price,
        c.name AS category_name,
        COALESCE(SUM(si.quantity), 0) AS units_sold,
        COALESCE(SUM(si.line_total), 0) AS total_revenue
      FROM products p
      JOIN sale_items si ON p.product_id = si.product_id
      JOIN sales s ON si.sale_id = s.sale_id AND s.status = 'COMPLETED'
      LEFT JOIN categories c ON p.category_id = c.category_id
      ${branchId ? "WHERE s.branch_id = ?" : ""}
      GROUP BY p.product_id, p.name, p.barcode, p.unit_price, c.name
      ORDER BY units_sold DESC
      LIMIT 5
    `, params);

    // 10. Daily sales trend (last 7 recorded days)
    const dailySalesTrend = await query(`
      SELECT 
        DATE(s.sale_date) AS sale_date,
        COUNT(s.sale_id) AS transaction_count,
        COALESCE(SUM(s.total_amount), 0) AS total_sales
      FROM sales s
      WHERE s.status = 'COMPLETED' ${branchFilter}
      GROUP BY DATE(s.sale_date)
      ORDER BY sale_date DESC
      LIMIT 7
    `, params);

    return NextResponse.json({
      metrics: {
        total_revenue: salesSummary?.total_revenue ?? 0,
        total_transactions: salesSummary?.total_transactions ?? 0,
        total_discount: salesSummary?.total_discount ?? 0,
        total_tax: salesSummary?.total_tax ?? 0,
        total_items_sold: itemsSummary?.total_items_sold ?? 0,
        low_stock_count: lowStockSummary?.low_stock_count ?? 0,
        expiring_batches_count: expiringSummary?.expiring_batches_count ?? 0,
        active_promotions_count: promoSummary?.active_promotions_count ?? 0,
      },
      recentSales,
      branchSales,
      paymentMethods,
      topProducts,
      dailySalesTrend: dailySalesTrend.reverse(),
    });
  } catch (err: any) {
    console.error("GET /api/dashboard/stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
