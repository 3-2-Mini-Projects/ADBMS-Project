import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let branchId = searchParams.get("branchId");

    if (!branchId) {
      const session = await getServerSession();
      if (session?.branch_id) {
        branchId = String(session.branch_id);
      }
    }

    // Fetch branch info if branchId is provided
    let branchInfo: any = null;
    if (branchId) {
      const branchRows: any = await query(
        `SELECT branch_id, branch_code, name, city, region FROM branches WHERE branch_id = ? LIMIT 1`,
        [branchId]
      );
      if (branchRows.length > 0) {
        branchInfo = branchRows[0];
      }
    }

    const branchFilter = branchId ? "AND s.branch_id = ?" : "";
    const salesParams = branchId ? [branchId] : [];

    const branchCity = branchInfo?.city ? String(branchInfo.city).trim() : "";
    const branchName = branchInfo?.name ? String(branchInfo.name).trim() : "";

    // Filter customers related to this branch strictly by branch name and customer city
    const custBranchFilter = branchId
      ? branchCity || branchName
        ? `AND (
            c.city IS NOT NULL AND TRIM(c.city) != ''
            AND (
              LOWER(TRIM(c.city)) = LOWER(?)
              OR LOWER(?) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
              OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(?), '%')
            )
          )`
        : `AND (
            c.city IS NOT NULL AND TRIM(c.city) != ''
            AND EXISTS (
              SELECT 1 FROM branches b
              WHERE b.branch_id = ?
                AND (
                  LOWER(TRIM(c.city)) = LOWER(TRIM(b.city))
                  OR LOWER(b.name) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
                  OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(TRIM(b.city)), '%')
                )
            )
          )`
      : "";

    const custParams = branchId
      ? branchCity || branchName
        ? [branchCity, branchName, branchCity]
        : [branchId]
      : [];

    // 1. Customer Loyalty Summary (Filtered by branch)
    const [custSummary]: any = await query(`
      SELECT 
        COUNT(*) AS total_customers,
        COALESCE(SUM(c.points_balance), 0) AS total_points_balance,
        COALESCE(AVG(c.points_balance), 0) AS avg_points_per_customer,
        COALESCE(SUM(CASE WHEN c.join_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0) AS new_customers_30d
      FROM customers c
      WHERE c.is_active = 1 ${custBranchFilter}
    `, custParams);

    // 2. Customer Tier Breakdown (Filtered by branch)
    const tierBreakdown = await query(`
      SELECT 
        c.tier,
        COUNT(*) AS customer_count,
        COALESCE(SUM(c.points_balance), 0) AS tier_points
      FROM customers c
      WHERE c.is_active = 1 ${custBranchFilter}
      GROUP BY c.tier
      ORDER BY 
        CASE c.tier
          WHEN 'PLATINUM' THEN 1
          WHEN 'GOLD' THEN 2
          WHEN 'SILVER' THEN 3
          WHEN 'BRONZE' THEN 4
          ELSE 5
        END
    `, custParams);

    // 2b. Detailed Customers per tier (Filtered by branch)
    let tierCustomers: any[] = [];
    try {
      tierCustomers = await query(`
        SELECT 
          c.customer_id,
          c.card_no,
          c.full_name,
          c.phone,
          c.email,
          c.city,
          c.tier,
          c.points_balance,
          c.join_date
        FROM customers c
        WHERE c.is_active = 1 ${custBranchFilter}
        ORDER BY c.points_balance DESC, c.full_name ASC
      `, custParams);
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

    // 5. Loyalty vs Regular Sales Impact (from sales table for branch)
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
    `, salesParams);

    // 6. Points payments from payments table (Filtered by branch sale)
    let pointsPaymentSql = `
      SELECT 
        COUNT(*) AS points_redemption_count,
        COALESCE(SUM(p.amount), 0) AS total_points_currency_redeemed
      FROM payments p
    `;
    const pointsParams: any[] = [];
    if (branchId) {
      pointsPaymentSql += `
        JOIN sales s ON p.sale_id = s.sale_id
        WHERE p.method = 'POINTS' AND s.branch_id = ?
      `;
      pointsParams.push(branchId);
    } else {
      pointsPaymentSql += ` WHERE p.method = 'POINTS'`;
    }
    const [pointsPayment]: any = await query(pointsPaymentSql, pointsParams);

    // 7. Active Campaign Promotions List (using active_promotions_vw)
    let activePromotions: any[] = [];
    try {
      activePromotions = await query(`
        SELECT 
          promo_id,
          promotion_name AS name,
          discount_percent,
          start_date,
          end_date,
          product_name,
          category_name,
          DATEDIFF(end_date, CURRENT_DATE) AS days_left
        FROM active_promotions_vw
        ORDER BY end_date ASC
        LIMIT 5
      `);
    } catch {
      activePromotions = await query(`
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
    }

    // 7b. Top Customers (Calculated for branch)
    let topCustomers: any[] = [];
    try {
      if (branchId) {
        topCustomers = await query(`
          SELECT 
            c.customer_id,
            c.card_no,
            c.full_name,
            c.city,
            c.tier,
            COALESCE(s_agg.total_spent, 0) AS total_spent,
            COALESCE(s_agg.total_orders, 0) AS total_orders,
            c.points_balance
          FROM customers c
          JOIN (
            SELECT customer_id, SUM(total_amount) AS total_spent, COUNT(sale_id) AS total_orders
            FROM sales
            WHERE status = 'COMPLETED' AND branch_id = ? AND customer_id IS NOT NULL
            GROUP BY customer_id
          ) s_agg ON c.customer_id = s_agg.customer_id
          WHERE c.is_active = 1 ${custBranchFilter}
          ORDER BY s_agg.total_spent DESC
          LIMIT 5
        `, [branchId, ...custParams]);
      } else {
        topCustomers = await query(`
          SELECT 
            c.customer_id,
            c.card_no,
            c.full_name,
            c.tier,
            COALESCE(s_agg.total_spent, 0) AS total_spent,
            COALESCE(s_agg.total_orders, 0) AS total_orders,
            c.points_balance
          FROM customers c
          JOIN (
            SELECT customer_id, SUM(total_amount) AS total_spent, COUNT(sale_id) AS total_orders
            FROM sales
            WHERE status = 'COMPLETED' AND customer_id IS NOT NULL
            GROUP BY customer_id
          ) s_agg ON c.customer_id = s_agg.customer_id
          ORDER BY s_agg.total_spent DESC
          LIMIT 5
        `);
      }
    } catch {
      topCustomers = [];
    }

    // 8. Recent Loyalty Points Transactions (Filtered by branch sale/customer)
    let recentLoyaltyActivity: any[] = [];
    try {
      let loyaltySql = `
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
      `;
      const loyaltyParams: any[] = [];
      if (branchId) {
        loyaltySql += ` WHERE 1=1 ${custBranchFilter}`;
        loyaltyParams.push(...custParams);
      }
      loyaltySql += ` ORDER BY lt.created_at DESC LIMIT 50`;
      recentLoyaltyActivity = await query(loyaltySql, loyaltyParams);
    } catch {
      recentLoyaltyActivity = [];
    }

    // 9. Recent Customer Tier Upgrades (Filtered by branch customers)
    let tierHistory: any[] = [];
    try {
      let tierHistorySql = `
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
      `;
      const tierParams: any[] = [];
      if (branchId) {
        tierHistorySql += ` WHERE 1=1 ${custBranchFilter}`;
        tierParams.push(...custParams);
      }
      tierHistorySql += ` ORDER BY th.changed_at DESC LIMIT 100`;
      tierHistory = await query(tierHistorySql, tierParams);
    } catch {
      tierHistory = [];
    }

    // 10. Daily Discount and Revenue trend (using daily_sales_vw with branch filter)
    let discountTrend: any[] = [];
    try {
      if (branchId) {
        discountTrend = await query(`
          SELECT 
            DATE(sale_date) AS sale_date,
            SUM(total_discount) AS total_discount,
            SUM(total_sales) AS total_sales,
            SUM(transaction_count) AS transactions
          FROM daily_sales_vw
          WHERE branch_id = ?
          GROUP BY DATE(sale_date)
          ORDER BY sale_date DESC
          LIMIT 7
        `, [branchId]);
      } else {
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
      }
    } catch {
      discountTrend = [];
    }

    return NextResponse.json({
      branch: branchInfo,
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
      topCustomers,
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
