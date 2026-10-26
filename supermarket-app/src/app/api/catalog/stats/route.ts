import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    // 1. Products summary
    const [prodStats]: any = await query(`
      SELECT 
        COUNT(*) AS total_products,
        COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) AS active_products,
        COALESCE(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) AS inactive_products,
        COALESCE(AVG(CASE WHEN unit_price > 0 THEN ((unit_price - cost_price) / unit_price) * 100 ELSE 0 END), 0) AS avg_margin_pct
      FROM products
    `);

    // 2. Categories count
    const [catStats]: any = await query(`
      SELECT COUNT(*) AS total_categories FROM categories
    `);

    // 3. Suppliers count
    const [supStats]: any = await query(`
      SELECT COUNT(*) AS total_suppliers FROM suppliers WHERE is_active = 1
    `);

    // 4. Inventory Valuation & Retail Revenue
    const invBranchFilter = branchId ? "WHERE i.branch_id = ?" : "";
    const invParams = branchId ? [branchId] : [];
    const [invStats]: any = await query(`
      SELECT 
        COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0) AS total_inventory_valuation,
        COALESCE(SUM(i.quantity_on_hand * p.unit_price), 0) AS potential_retail_revenue,
        COALESCE(SUM(i.quantity_on_hand), 0) AS total_stock_units
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      ${invBranchFilter}
    `, invParams);

    // 5. Pending Supervisor Price Approvals
    let pendingApprovalsCount = 0;
    try {
      const [approvalStats]: any = await query(`
        SELECT COUNT(*) AS pending_count 
        FROM product_price_history 
        WHERE supervisor_approval_status = 'PENDING_SUPERVISOR_APPROVAL'
      `);
      pendingApprovalsCount = Number(approvalStats?.pending_count ?? 0);
    } catch {
      // If table doesn't have the column yet, fallback to 0
      pendingApprovalsCount = 0;
    }

    // 6. Slow Movers Stats
    let slowMoversCount = 0;
    let slowMoversTiedUpCapital = 0;
    try {
      const smBranchFilter = branchId ? "AND branch_id = ?" : "";
      const smParams = branchId ? [branchId] : [];
      const [smStats]: any = await query(`
        SELECT 
          COUNT(*) AS sm_count,
          COALESCE(SUM(tied_up_capital), 0) AS total_tied_capital
        FROM slow_movers
        WHERE status = 'ACTIVE' ${smBranchFilter}
      `, smParams);
      slowMoversCount = Number(smStats?.sm_count ?? 0);
      slowMoversTiedUpCapital = Number(smStats?.total_tied_capital ?? 0);
    } catch {
      // Dynamic fallback calculation if slow_movers table is empty/not populated
      try {
        const [smFallback]: any = await query(`
          SELECT 
            COUNT(DISTINCT i.product_id) AS sm_count,
            COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0) AS total_tied_capital
          FROM inventory i
          JOIN products p ON i.product_id = p.product_id
          WHERE i.quantity_on_hand > 20
            AND i.product_id NOT IN (
              SELECT DISTINCT si.product_id 
              FROM sale_items si
              JOIN sales s ON si.sale_id = s.sale_id
              WHERE s.sale_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
            )
        `);
        slowMoversCount = Number(smFallback?.sm_count ?? 0);
        slowMoversTiedUpCapital = Number(smFallback?.total_tied_capital ?? 0);
      } catch {
        slowMoversCount = 0;
        slowMoversTiedUpCapital = 0;
      }
    }

    // 7. Category Breakdown with Valuation
    const categoryBreakdown = await query(`
      SELECT 
        c.category_id,
        c.name AS category_name,
        COUNT(p.product_id) AS product_count,
        COALESCE(SUM(i.quantity_on_hand), 0) AS total_stock,
        COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0) AS total_valuation,
        ROUND(AVG(CASE WHEN p.unit_price > 0 THEN ((p.unit_price - p.cost_price) / p.unit_price) * 100 ELSE 0 END), 1) AS avg_margin
      FROM categories c
      LEFT JOIN products p ON c.category_id = p.category_id
      LEFT JOIN inventory i ON p.product_id = i.product_id ${branchId ? "AND i.branch_id = " + Number(branchId) : ""}
      GROUP BY c.category_id, c.name
      ORDER BY total_valuation DESC
      LIMIT 10
    `);

    // 8. Recent Price Adjustments
    let recentPriceChanges: any[] = [];
    try {
      recentPriceChanges = await query(`
        SELECT 
          h.history_id,
          h.product_id,
          p.name AS product_name,
          p.barcode,
          h.old_price,
          h.new_price,
          ROUND(h.new_price - h.old_price, 2) AS price_diff,
          h.reason,
          h.changed_at,
          h.supervisor_approval_status,
          e.full_name AS changed_by_name
        FROM product_price_history h
        JOIN products p ON h.product_id = p.product_id
        LEFT JOIN employees e ON h.changed_by = e.employee_id
        ORDER BY h.changed_at DESC
        LIMIT 6
      `);
    } catch {
      recentPriceChanges = [];
    }

    // 9. Margin Distribution Analysis
    const marginDistribution = {
      highMargin: 0,   // > 30%
      healthyMargin: 0,// 15% - 30%
      lowMargin: 0,    // 0% - 15%
      negativeMargin: 0// < 0% (cost > selling price)
    };

    try {
      const [margins]: any = await query(`
        SELECT 
          SUM(CASE WHEN unit_price > cost_price * 1.30 THEN 1 ELSE 0 END) AS high_margin,
          SUM(CASE WHEN unit_price > cost_price * 1.15 AND unit_price <= cost_price * 1.30 THEN 1 ELSE 0 END) AS healthy_margin,
          SUM(CASE WHEN unit_price >= cost_price AND unit_price <= cost_price * 1.15 THEN 1 ELSE 0 END) AS low_margin,
          SUM(CASE WHEN unit_price < cost_price THEN 1 ELSE 0 END) AS negative_margin
        FROM products
        WHERE is_active = 1
      `);
      marginDistribution.highMargin = Number(margins?.high_margin ?? 0);
      marginDistribution.healthyMargin = Number(margins?.healthy_margin ?? 0);
      marginDistribution.lowMargin = Number(margins?.low_margin ?? 0);
      marginDistribution.negativeMargin = Number(margins?.negative_margin ?? 0);
    } catch {
      // Defaults
    }

    return NextResponse.json({
      metrics: {
        total_products: Number(prodStats?.total_products ?? 0),
        active_products: Number(prodStats?.active_products ?? 0),
        inactive_products: Number(prodStats?.inactive_products ?? 0),
        total_categories: Number(catStats?.total_categories ?? 0),
        total_suppliers: Number(supStats?.total_suppliers ?? 0),
        total_inventory_valuation: Number(invStats?.total_inventory_valuation ?? 0),
        potential_retail_revenue: Number(invStats?.potential_retail_revenue ?? 0),
        average_profit_margin_pct: Number(Number(prodStats?.avg_margin_pct ?? 0).toFixed(2)),
        pending_price_approvals: pendingApprovalsCount,
        slow_movers_count: slowMoversCount,
        tied_up_capital: slowMoversTiedUpCapital,
        total_stock_units: Number(invStats?.total_stock_units ?? 0),
      },
      categoryBreakdown,
      recentPriceChanges,
      marginDistribution,
    });
  } catch (err: any) {
    console.error("GET /api/catalog/stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
