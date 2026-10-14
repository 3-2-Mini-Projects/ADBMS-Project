import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const params: any[] = [];
    const branchFilter = branchId ? "AND s.branch_id = ?" : "";
    if (branchId) params.push(branchId);

    // 1. Customer Loyalty Summary
    const [custSummary]: any = await query(`
      SELECT 
        COUNT(*) AS total_customers,
        COALESCE(SUM(points_balance), 0) AS total_points_balance,
        COALESCE(AVG(points_balance), 0) AS avg_points_per_customer,
        COALESCE(SUM(CASE WHEN join_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0) AS new_customers_30d
      FROM customers
      WHERE is_active = 1
    `);

    // 2. Customer Tier Breakdown
    const tierBreakdown = await query(`
      SELECT 
        tier,
        COUNT(*) AS customer_count,
        COALESCE(SUM(points_balance), 0) AS tier_points
      FROM customers
      WHERE is_active = 1
      GROUP BY tier
      ORDER BY 
        CASE tier
          WHEN 'PLATINUM' THEN 1
          WHEN 'GOLD' THEN 2
          WHEN 'SILVER' THEN 3
          WHEN 'BRONZE' THEN 4
          ELSE 5
        END
    `);

    // 2b. Detailed Customers per tier
    let tierCustomers: any[] = [];
    try {
      tierCustomers = await query(`
        SELECT 
          customer_id,
          card_no,
          full_name,
          phone,
          email,
          city,
          tier,
          points_balance,
          join_date
        FROM customers
        WHERE is_active = 1
        ORDER BY points_balance DESC, full_name ASC
      `);
    } catch {
      tierCustomers = [];
    }

    // 3. Promotions Overview
    const [promoSummary]: any = await query(`
      SELECT 
        COUNT(*) AS total_promotions,
        COALESCE(SUM(CASE WHEN CURRENT_DATE BETWEEN start_date AND end_date AND is_active = 1 THEN 1 ELSE 0 END), 0) AS active_promotions,
        COALESCE(SUM(CASE WHEN CURRENT_DATE < start_date AND is_active = 1 THEN 1 ELSE 0 END), 0) AS scheduled_promotions,
        COALESCE(SUM(CASE WHEN CURRENT_DATE > end_date OR is_active = 0 THEN 1 ELSE 0 END), 0) AS expired_promotions
      FROM promotions
    `);

    // 4. Coupons Overview
    const [couponSummary]: any = await query(`
      SELECT 
        COUNT(*) AS total_coupons,
        COALESCE(SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END), 0) AS redeemed_coupons,
        COALESCE(SUM(CASE WHEN is_used = 0 AND expiry_date >= CURRENT_DATE THEN 1 ELSE 0 END), 0) AS available_coupons,
        COALESCE(SUM(CASE WHEN is_used = 0 AND expiry_date < CURRENT_DATE THEN 1 ELSE 0 END), 0) AS expired_coupons
      FROM coupons
    `);

    // 5. Loyalty vs Regular Sales Impact (from sales table)
    const [salesImpact]: any = await query(`
      SELECT 
        COUNT(s.sale_id) AS total_sales_count,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.discount_total), 0) AS total_discounts_given,
        COALESCE(SUM(CASE WHEN s.customer_id IS NOT NULL THEN s.total_amount ELSE 0 END), 0) AS member_revenue,
        COALESCE(SUM(CASE WHEN s.customer_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS member_transactions,
        COALESCE(AVG(CASE WHEN s.customer_id IS NOT NULL THEN s.total_amount ELSE NULL END), 0) AS avg_member_basket,
        COALESCE(AVG(CASE WHEN s.customer_id IS NULL THEN s.total_amount ELSE NULL END), 0) AS avg_non_member_basket
      FROM sales s
      WHERE s.status = 'COMPLETED' ${branchFilter}
    `, params);

    // 6. Points payments from payments table
    const [pointsPayment]: any = await query(`
      SELECT 
        COUNT(*) AS points_redemption_count,
        COALESCE(SUM(amount), 0) AS total_points_currency_redeemed
      FROM payments
      WHERE method = 'POINTS'
    `);

    // 7. Active Campaign Promotions List
    const activePromotions = await query(`
      SELECT 
        pr.promo_id,
        pr.name,
        pr.discount_percent,
        pr.start_date,
        pr.end_date,
        p.name AS product_name,
        c.name AS category_name,
        DATEDIFF(pr.end_date, CURRENT_DATE) AS days_left
      FROM promotions pr
      LEFT JOIN products p ON pr.product_id = p.product_id
      LEFT JOIN categories c ON pr.category_id = c.category_id
      WHERE pr.is_active = 1 AND CURRENT_DATE BETWEEN pr.start_date AND pr.end_date
      ORDER BY pr.end_date ASC
      LIMIT 5
    `);

    // 8. Recent Loyalty Points Transactions
    let recentLoyaltyActivity: any[] = [];
    try {
      recentLoyaltyActivity = await query(`
        SELECT 
          lt.loyalty_id,
          lt.customer_id,
          c.full_name AS customer_name,
          c.card_no,
          c.tier,
          lt.sale_id,
          lt.points_change,
          lt.transaction_type,
          lt.created_at
        FROM loyalty_transactions lt
        JOIN customers c ON lt.customer_id = c.customer_id
        ORDER BY lt.created_at DESC
        LIMIT 6
      `);
    } catch {
      recentLoyaltyActivity = [];
    }

    // 9. Recent Customer Tier Upgrades (from customer_tier_history)
    let tierHistory: any[] = [];
    try {
      tierHistory = await query(`
        SELECT 
          th.history_id,
          c.full_name AS customer_name,
          c.card_no,
          th.old_tier,
          th.new_tier,
          th.reason,
          th.changed_at
        FROM customer_tier_history th
        JOIN customers c ON th.customer_id = c.customer_id
        ORDER BY th.changed_at DESC
        LIMIT 100
      `);
    } catch {
      tierHistory = [];
    }

    // 10. Daily Discount and Revenue trend (using daily_sales_vw)
    let discountTrend: any[] = [];
    try {
      discountTrend = await query(`
        SELECT 
          DATE(sale_date) AS sale_date,
          SUM(total_discount) AS total_discount,
          SUM(total_sales) AS total_sales,
          SUM(transaction_count) AS transactions
        FROM daily_sales_vw
        GROUP BY DATE(sale_date)
        ORDER BY sale_date DESC
        LIMIT 7
      `);
    } catch {
      discountTrend = [];
    }

    return NextResponse.json({
      summary: {
        total_customers: custSummary?.total_customers ?? 0,
        total_points_balance: custSummary?.total_points_balance ?? 0,
        avg_points_per_customer: Math.round(Number(custSummary?.avg_points_per_customer ?? 0)),
        new_customers_30d: custSummary?.new_customers_30d ?? 0,
        active_promotions: promoSummary?.active_promotions ?? 0,
        total_promotions: promoSummary?.total_promotions ?? 0,
        total_coupons: couponSummary?.total_coupons ?? 0,
        redeemed_coupons: couponSummary?.redeemed_coupons ?? 0,
        available_coupons: couponSummary?.available_coupons ?? 0,
        redemption_rate:
          Number(couponSummary?.total_coupons) > 0
            ? Math.round((Number(couponSummary.redeemed_coupons) / Number(couponSummary.total_coupons)) * 100)
            : 0,
        total_discounts_given: Number(salesImpact?.total_discounts_given ?? 0),
        member_revenue: Number(salesImpact?.member_revenue ?? 0),
        total_revenue: Number(salesImpact?.total_revenue ?? 0),
        member_revenue_percent:
          Number(salesImpact?.total_revenue) > 0
            ? Math.round((Number(salesImpact.member_revenue) / Number(salesImpact.total_revenue)) * 100)
            : 0,
        member_transactions: salesImpact?.member_transactions ?? 0,
        avg_member_basket: Number(salesImpact?.avg_member_basket ?? 0),
        avg_non_member_basket: Number(salesImpact?.avg_non_member_basket ?? 0),
        points_currency_redeemed: Number(pointsPayment?.total_points_currency_redeemed ?? 0),
        points_redemption_count: pointsPayment?.points_redemption_count ?? 0,
      },
      tierBreakdown,
      tierCustomers,
      activePromotions,
      recentLoyaltyActivity,
      tierHistory,
      discountTrend: discountTrend.reverse(),
    });
  } catch (err: any) {
    console.error("GET /api/marketing/dashboard error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
