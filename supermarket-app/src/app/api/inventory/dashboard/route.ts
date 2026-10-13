import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const branchFilter = branchId ? "AND i.branch_id = ?" : "";
    const batchBranchFilter = branchId ? "AND pb.branch_id = ?" : "";
    const params = branchId ? [branchId] : [];

    // 1. Overall inventory metrics
    const [summary]: any = await query(
      `SELECT
        COUNT(*) AS total_sku_count,
        COALESCE(SUM(i.quantity_on_hand), 0) AS total_units,
        COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0) AS total_stock_value,
        COALESCE(SUM(CASE WHEN i.quantity_on_hand <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
        COALESCE(SUM(CASE WHEN i.quantity_on_hand > 0 AND i.quantity_on_hand <= i.reorder_level THEN 1 ELSE 0 END), 0) AS low_stock_count,
        COALESCE(SUM(CASE WHEN i.quantity_on_hand > i.reorder_level THEN 1 ELSE 0 END), 0) AS healthy_stock_count
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE 1=1 ${branchFilter}`,
      params
    );

    // 2. Expiry overview
    const [expirySummary]: any = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN pb.expiry_date IS NOT NULL AND pb.expiry_date < CURRENT_DATE AND pb.quantity > 0 THEN 1 ELSE 0 END), 0) AS expired_batches,
        COALESCE(SUM(CASE WHEN pb.expiry_date IS NOT NULL AND pb.expiry_date >= CURRENT_DATE AND pb.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY) AND pb.quantity > 0 THEN 1 ELSE 0 END), 0) AS expiring_7d,
        COALESCE(SUM(CASE WHEN pb.expiry_date IS NOT NULL AND pb.expiry_date >= CURRENT_DATE AND pb.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY) AND pb.quantity > 0 THEN 1 ELSE 0 END), 0) AS expiring_30d,
        COUNT(*) AS total_batches
      FROM product_batches pb
      WHERE 1=1 ${batchBranchFilter}`,
      params
    );

    // 3. Stock status distribution by category
    const categoryBreakdown = await query(
      `SELECT
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COUNT(i.inventory_id) AS sku_count,
        COALESCE(SUM(i.quantity_on_hand), 0) AS total_qty,
        COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0) AS stock_value,
        COALESCE(SUM(CASE WHEN i.quantity_on_hand <= i.reorder_level THEN 1 ELSE 0 END), 0) AS low_stock_skus
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE 1=1 ${branchFilter}
      GROUP BY c.category_id, c.name
      ORDER BY stock_value DESC
      LIMIT 8`,
      params
    );

    // 4. Top low-stock items needing reorder
    const lowStockItems = await query(
      `SELECT
        i.inventory_id,
        p.barcode,
        p.name AS product_name,
        b.name AS branch_name,
        COALESCE(c.name, 'General') AS category_name,
        i.quantity_on_hand,
        i.reorder_level,
        p.unit_price,
        CASE
          WHEN i.quantity_on_hand <= 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END AS status
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      JOIN branches b ON i.branch_id = b.branch_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE i.quantity_on_hand <= i.reorder_level ${branchFilter}
      ORDER BY i.quantity_on_hand ASC
      LIMIT 10`,
      params
    );

    // 5. Items expiring soon (next 30 days)
    const expiringBatches = await query(
      `SELECT
        pb.batch_id,
        pb.batch_no,
        p.name AS product_name,
        p.barcode,
        b.name AS branch_name,
        pb.quantity,
        pb.expiry_date,
        DATEDIFF(pb.expiry_date, CURRENT_DATE) AS days_to_expiry
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.product_id
      JOIN branches b ON pb.branch_id = b.branch_id
      WHERE pb.expiry_date IS NOT NULL
        AND pb.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
        AND pb.quantity > 0
        ${batchBranchFilter}
      ORDER BY pb.expiry_date ASC
      LIMIT 10`,
      params
    );

    // 6. Branch stock comparison
    const branchStockComparison = await query(
      `SELECT
        b.branch_id,
        b.name AS branch_name,
        COUNT(i.inventory_id) AS sku_count,
        COALESCE(SUM(i.quantity_on_hand), 0) AS total_units,
        COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0) AS stock_value,
        COALESCE(SUM(CASE WHEN i.quantity_on_hand <= i.reorder_level THEN 1 ELSE 0 END), 0) AS alerts
      FROM branches b
      LEFT JOIN inventory i ON b.branch_id = i.branch_id
      LEFT JOIN products p ON i.product_id = p.product_id
      WHERE b.is_active = 1
      GROUP BY b.branch_id, b.name
      ORDER BY stock_value DESC`
    );

    // 7. Recently updated inventory
    const recentActivity = await query(
      `SELECT
        i.inventory_id,
        p.name AS product_name,
        p.barcode,
        b.name AS branch_name,
        i.quantity_on_hand,
        i.last_updated
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      JOIN branches b ON i.branch_id = b.branch_id
      WHERE 1=1 ${branchFilter}
      ORDER BY i.last_updated DESC
      LIMIT 8`,
      params
    );

    return NextResponse.json({
      summary: {
        total_sku_count: summary?.total_sku_count ?? 0,
        total_units: summary?.total_units ?? 0,
        total_stock_value: summary?.total_stock_value ?? 0,
        out_of_stock_count: summary?.out_of_stock_count ?? 0,
        low_stock_count: summary?.low_stock_count ?? 0,
        healthy_stock_count: summary?.healthy_stock_count ?? 0,
      },
      expiry: {
        expired_batches: expirySummary?.expired_batches ?? 0,
        expiring_7d: expirySummary?.expiring_7d ?? 0,
        expiring_30d: expirySummary?.expiring_30d ?? 0,
        total_batches: expirySummary?.total_batches ?? 0,
      },
      categoryBreakdown,
      lowStockItems,
      expiringBatches,
      branchStockComparison,
      recentActivity,
    });
  } catch (err: any) {
    console.error("GET /api/inventory/dashboard error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
