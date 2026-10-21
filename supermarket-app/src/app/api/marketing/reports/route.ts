import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export interface MarketingSummaryRow {
  total_revenue: number;
  total_discounts: number;
  discount_ratio_pct: number;
  member_revenue: number;
  member_revenue_pct: number;
  member_transactions: number;
  non_member_transactions: number;
  total_transactions: number;
  avg_member_basket: number;
  avg_non_member_basket: number;
  basket_lift_pct: number;
  total_customers: number;
  new_customers_30d: number;
  total_points_balance: number;
  points_currency_redeemed: number;
  total_promotions: number;
  active_promotions: number;
  scheduled_promotions: number;
  expired_promotions: number;
  total_coupons: number;
  available_coupons: number;
  redeemed_coupons: number;
  expired_coupons: number;
  vip_coupons: number;
  public_coupons: number;
  coupon_redemption_rate: number;
}

export interface PromoReportRow {
  promo_id: number;
  name: string;
  discount_percent: number | string;
  start_date: string;
  end_date: string;
  is_active: number;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
  associated_coupons: number;
  redeemed_coupons: number;
}

export interface BranchReportRow {
  branch_id: number;
  branch_name: string;
  city: string;
  transactions: number;
  subtotal: number;
  total_sales: number;
  total_discount: number;
  discount_pct: number;
}

export interface TierReportRow {
  tier: string;
  customer_count: number;
  tier_points: number;
}

export interface DailyTrendRow {
  sale_date: string;
  transactions: number;
  total_discount: number;
  total_sales: number;
}

// GET /api/marketing/reports
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchIdParam = searchParams.get("branchId");
    const branchId = branchIdParam ? Number(branchIdParam) : null;
    const branchFilter = branchId ? "AND s.branch_id = ?" : "";
    const branchParams = branchId ? [branchId] : [];

    const branchInfo = branchId
      ? await query<{ branch_id: number; name: string; city: string }>(
          "SELECT branch_id, name, city FROM branches WHERE branch_id = ? LIMIT 1",
          [branchId]
        ).then((rows) => rows[0] || null)
      : null;

    const [
      salesImpactRows,
      customerMetricRows,
      couponMetricRows,
      promoMetricRows,
      pointsPaymentRows,
      promoRows,
      branchSalesRows,
      tierRows,
      dailyTrendRows,
    ] = await Promise.all([
      // 1. Sales & Loyalty Member Impact
      query<RowDataPacket & {
        total_sales_count: number;
        total_revenue: number | string;
        total_discounts_given: number | string;
        member_revenue: number | string;
        member_transactions: number;
        non_member_transactions: number;
        avg_member_basket: number | string;
        avg_non_member_basket: number | string;
      }>(`
        SELECT 
          COUNT(s.sale_id) AS total_sales_count,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue,
          COALESCE(SUM(s.discount_total), 0) AS total_discounts_given,
          COALESCE(SUM(CASE WHEN s.customer_id IS NOT NULL THEN s.total_amount ELSE 0 END), 0) AS member_revenue,
          COALESCE(SUM(CASE WHEN s.customer_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS member_transactions,
          COALESCE(SUM(CASE WHEN s.customer_id IS NULL THEN 1 ELSE 0 END), 0) AS non_member_transactions,
          COALESCE(AVG(CASE WHEN s.customer_id IS NOT NULL THEN s.total_amount ELSE NULL END), 0) AS avg_member_basket,
          COALESCE(AVG(CASE WHEN s.customer_id IS NULL THEN s.total_amount ELSE NULL END), 0) AS avg_non_member_basket
        FROM sales s
        WHERE s.status = 'COMPLETED' ${branchFilter}
      `, branchParams),

      // 2. Customer metrics
      query<RowDataPacket & {
        total_customers: number;
        total_points_balance: number | string;
        new_customers_30d: number;
      }>(`
        SELECT 
          COUNT(*) AS total_customers,
          COALESCE(SUM(points_balance), 0) AS total_points_balance,
          COALESCE(SUM(CASE WHEN join_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0) AS new_customers_30d
        FROM customers
        WHERE is_active = 1
      `),

      // 3. Coupon metrics
      query<RowDataPacket & {
        total_coupons: number;
        redeemed_coupons: number;
        available_coupons: number;
        expired_coupons: number;
        vip_coupons: number;
        public_coupons: number;
      }>(`
        SELECT 
          COUNT(*) AS total_coupons,
          COALESCE(SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END), 0) AS redeemed_coupons,
          COALESCE(SUM(CASE WHEN is_used = 0 AND expiry_date >= CURRENT_DATE THEN 1 ELSE 0 END), 0) AS available_coupons,
          COALESCE(SUM(CASE WHEN is_used = 0 AND expiry_date < CURRENT_DATE THEN 1 ELSE 0 END), 0) AS expired_coupons,
          COALESCE(SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS vip_coupons,
          COALESCE(SUM(CASE WHEN customer_id IS NULL THEN 1 ELSE 0 END), 0) AS public_coupons
        FROM coupons
      `),

      // 4. Promotions Overview metrics
      query<RowDataPacket & {
        total_promotions: number;
        active_promotions: number;
        scheduled_promotions: number;
        expired_promotions: number;
      }>(`
        SELECT 
          COUNT(*) AS total_promotions,
          COALESCE(SUM(CASE WHEN CURRENT_DATE BETWEEN start_date AND end_date AND is_active = 1 THEN 1 ELSE 0 END), 0) AS active_promotions,
          COALESCE(SUM(CASE WHEN CURRENT_DATE < start_date AND is_active = 1 THEN 1 ELSE 0 END), 0) AS scheduled_promotions,
          COALESCE(SUM(CASE WHEN CURRENT_DATE > end_date OR is_active = 0 THEN 1 ELSE 0 END), 0) AS expired_promotions
        FROM promotions
      `),

      // 5. Points redeemed as currency
      query<RowDataPacket & {
        total_points_currency_redeemed: number | string;
      }>(`
        SELECT COALESCE(SUM(p.amount), 0) AS total_points_currency_redeemed
        FROM payments p
        ${branchId ? "JOIN sales s ON p.sale_id = s.sale_id WHERE p.method = 'POINTS' AND s.branch_id = ?" : "WHERE p.method = 'POINTS'"}
      `, branchParams),

      // 6. Active Promotions Detail List with linked coupon stats
      query<PromoReportRow & RowDataPacket>(`
        SELECT 
          p.promo_id,
          p.name,
          p.discount_percent,
          p.start_date,
          p.end_date,
          p.is_active,
          'ACTIVE' AS status,
          (SELECT COUNT(*) FROM coupons cp WHERE cp.promo_id = p.promo_id) AS associated_coupons,
          (SELECT COUNT(*) FROM coupons cp WHERE cp.promo_id = p.promo_id AND cp.is_used = 1) AS redeemed_coupons
        FROM promotions p
        WHERE p.is_active = 1 AND CURDATE() BETWEEN p.start_date AND p.end_date
        ORDER BY p.start_date DESC, p.promo_id DESC
      `),

      // 7. Branch comparison from branch_sales_vw
      query<BranchReportRow & RowDataPacket>(`
        SELECT 
          bs.branch_id,
          COALESCE(b.name, CONCAT('Branch #', bs.branch_id)) AS branch_name,
          COALESCE(b.city, 'Main City') AS city,
          COALESCE(bs.transactions, 0) AS transactions,
          COALESCE(bs.subtotal, 0) AS subtotal,
          COALESCE(bs.total_sales, 0) AS total_sales,
          COALESCE(bs.total_discount, 0) AS total_discount,
          ROUND(
            CASE 
              WHEN bs.total_sales > 0 THEN (bs.total_discount / bs.total_sales) * 100 
              ELSE 0 
            END, 
            1
          ) AS discount_pct
        FROM branch_sales_vw bs
        LEFT JOIN branches b ON bs.branch_id = b.branch_id
        ${branchId ? "WHERE bs.branch_id = " + Number(branchId) : ""}
        ORDER BY bs.total_sales DESC
      `),

      // 8. Tier breakdown
      query<TierReportRow & RowDataPacket>(`
        SELECT 
          c.tier,
          COUNT(*) AS customer_count,
          COALESCE(SUM(c.points_balance), 0) AS tier_points
        FROM customers c
        WHERE c.is_active = 1
        GROUP BY c.tier
        ORDER BY 
          CASE c.tier
            WHEN 'PLATINUM' THEN 1
            WHEN 'GOLD' THEN 2
            WHEN 'SILVER' THEN 3
            ELSE 4
          END
      `),

      // 9. Daily sales and promotional discount trend from daily_sales_vw
      query<DailyTrendRow & RowDataPacket>(`
        SELECT 
          DATE(sale_date) AS sale_date,
          SUM(transaction_count) AS transactions,
          SUM(total_discount) AS total_discount,
          SUM(total_sales) AS total_sales
        FROM daily_sales_vw
        ${branchId ? "WHERE branch_id = " + Number(branchId) : ""}
        GROUP BY DATE(sale_date)
        ORDER BY sale_date DESC
        LIMIT 14
      `),
    ]);

    const sImpact = salesImpactRows[0];
    const cMetrics = customerMetricRows[0];
    const cpMetrics = couponMetricRows[0];
    const pMetrics = promoMetricRows[0];
    const ptMetrics = pointsPaymentRows[0];

    const totalRev = Number(sImpact?.total_revenue || 0);
    const memberRev = Number(sImpact?.member_revenue || 0);
    const totalDisc = Number(sImpact?.total_discounts_given || 0);
    const discountRatioPct = totalRev > 0 ? Math.round((totalDisc / totalRev) * 1000) / 10 : 0;
    const memberRevPct = totalRev > 0 ? Math.round((memberRev / totalRev) * 100) : 0;
    const avgMemberBasket = Number(sImpact?.avg_member_basket || 0);
    const avgNonMemberBasket = Number(sImpact?.avg_non_member_basket || 0);
    const basketLiftPct = avgNonMemberBasket > 0 
      ? Math.round(((avgMemberBasket - avgNonMemberBasket) / avgNonMemberBasket) * 100)
      : 0;

    const totalCoupons = Number(cpMetrics?.total_coupons || 0);
    const redeemedCoupons = Number(cpMetrics?.redeemed_coupons || 0);
    const redemptionRate = totalCoupons > 0 ? Math.round((redeemedCoupons / totalCoupons) * 100) : 0;

    const summary: MarketingSummaryRow = {
      total_revenue: totalRev,
      total_discounts: totalDisc,
      discount_ratio_pct: discountRatioPct,
      member_revenue: memberRev,
      member_revenue_pct: memberRevPct,
      member_transactions: Number(sImpact?.member_transactions || 0),
      non_member_transactions: Number(sImpact?.non_member_transactions || 0),
      total_transactions: Number(sImpact?.total_sales_count || 0),
      avg_member_basket: avgMemberBasket,
      avg_non_member_basket: avgNonMemberBasket,
      basket_lift_pct: basketLiftPct,
      total_customers: Number(cMetrics?.total_customers || 0),
      new_customers_30d: Number(cMetrics?.new_customers_30d || 0),
      total_points_balance: Number(cMetrics?.total_points_balance || 0),
      points_currency_redeemed: Number(ptMetrics?.total_points_currency_redeemed || 0),
      total_promotions: Number(pMetrics?.total_promotions || 0),
      active_promotions: Number(pMetrics?.active_promotions || 0),
      scheduled_promotions: Number(pMetrics?.scheduled_promotions || 0),
      expired_promotions: Number(pMetrics?.expired_promotions || 0),
      total_coupons: totalCoupons,
      available_coupons: Number(cpMetrics?.available_coupons || 0),
      redeemed_coupons: redeemedCoupons,
      expired_coupons: Number(cpMetrics?.expired_coupons || 0),
      vip_coupons: Number(cpMetrics?.vip_coupons || 0),
      public_coupons: Number(cpMetrics?.public_coupons || 0),
      coupon_redemption_rate: redemptionRate,
    };

    return NextResponse.json({
      success: true,
      branch: branchInfo,
      summary,
      promotions: promoRows,
      branchSales: branchSalesRows,
      tierBreakdown: tierRows,
      dailyTrend: dailyTrendRows.reverse(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/marketing/reports error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
