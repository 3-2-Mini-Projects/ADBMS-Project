import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { OkPacket, RowDataPacket } from "mysql2";

export interface TopLoyaltyCustomerRow {
  customer_id: number;
  card_no: string;
  full_name: string;
  phone: string;
  email: string | null;
  tier: string;
  points_balance: number;
  active_coupon_code: string | null;
  active_coupon_expiry: string | null;
}

export interface ActivePromoRow {
  promo_id: number;
  name: string;
  discount_percent: number | string;
  start_date: string;
  end_date: string;
}

export interface AssignedCouponRow {
  coupon_id: number;
  code: string;
  promo_id: number;
  promo_name: string;
  discount_percent: number | string;
  customer_id: number;
  customer_name: string;
  card_no: string;
  phone: string;
  expiry_date: string;
  is_used: number;
}

interface CountRow extends RowDataPacket {
  issued_count: number;
}

interface PromoIdRow extends RowDataPacket {
  promo_id: number;
}

// GET /api/marketing/coupons/reward-top10
// Returns top 10 customers with current active coupon status & active promotions for selection
export async function GET() {
  try {
    const [topCustomers, activePromotions] = await Promise.all([
      query<TopLoyaltyCustomerRow>(`
        SELECT 
          c.customer_id,
          c.card_no,
          c.full_name,
          c.phone,
          c.email,
          c.tier,
          c.points_balance,
          (
            SELECT cp.code 
            FROM coupons cp 
            WHERE cp.customer_id = c.customer_id 
              AND cp.is_used = 0 
              AND cp.expiry_date >= CURDATE()
            ORDER BY cp.coupon_id DESC 
            LIMIT 1
          ) AS active_coupon_code,
          (
            SELECT cp.expiry_date 
            FROM coupons cp 
            WHERE cp.customer_id = c.customer_id 
              AND cp.is_used = 0 
              AND cp.expiry_date >= CURDATE()
            ORDER BY cp.coupon_id DESC 
            LIMIT 1
          ) AS active_coupon_expiry
        FROM customers c
        WHERE c.is_active = 1
        ORDER BY c.points_balance DESC, c.customer_id ASC
        LIMIT 10
      `),
      query<ActivePromoRow>(`
        SELECT promo_id, name, discount_percent, start_date, end_date
        FROM promotions
        WHERE is_active = 1 AND CURDATE() <= end_date
        ORDER BY discount_percent DESC, promo_id DESC
      `)
    ]);

    return NextResponse.json({
      success: true,
      top_customers: topCustomers,
      active_promotions: activePromotions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/marketing/coupons/reward-top10 error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/marketing/coupons/reward-top10
// Assigns VIP coupons to top 10 loyalty customers using proc_assign_top10_coupons
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const payload = (typeof body === "object" && body !== null) ? (body as Record<string, unknown>) : {};
    const { promo_id, valid_days, custom_prefix } = payload;

    const days = typeof valid_days === "number" && valid_days > 0 ? valid_days : 30;

    // Resolve or fallback promo_id
    let finalPromoId: number | null = typeof promo_id === "number" ? promo_id : null;
    if (!finalPromoId) {
      const activePromos = await query<PromoIdRow>(
        "SELECT promo_id FROM promotions WHERE is_active = 1 ORDER BY discount_percent DESC, promo_id DESC LIMIT 1"
      );
      if (activePromos.length > 0) {
        finalPromoId = activePromos[0].promo_id;
      } else {
        return NextResponse.json({ error: "No active promotion found to link coupons with." }, { status: 400 });
      }
    }

    let issuedCount = 0;

    // Try executing the stored procedure proc_assign_top10_coupons
    try {
      await query("CALL proc_assign_top10_coupons(?, ?, @issued)", [finalPromoId, days]);
      const resCount = await query<CountRow>("SELECT @issued AS issued_count");
      issuedCount = Number(resCount?.[0]?.issued_count ?? 0);
    } catch (procErr: unknown) {
      const procMsg = procErr instanceof Error ? procErr.message : "Procedure execution failure";
      console.warn("proc_assign_top10_coupons failed, applying SQL fallback:", procMsg);

      // SQL Fallback
      const prefixStr = typeof custom_prefix === "string" && custom_prefix.trim() ? custom_prefix.trim().toUpperCase() : "VIP";
      const insertRes = await query<OkPacket>(`
        INSERT INTO coupons (code, promo_id, customer_id, expiry_date, is_used, sms_phone, sms_status, sms_message)
        SELECT 
          CONCAT(?, '-', REPLACE(c.card_no, ' ', ''), '-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID(), c.customer_id)), 1, 4))),
          ?,
          c.customer_id,
          DATE_ADD(CURDATE(), INTERVAL ? DAY),
          0,
          c.phone,
          'SENT',
          CONCAT('Congratulations ', c.full_name, '! As a Top 10 Loyalty Customer, you have been awarded an exclusive VIP coupon valid for ', ?, ' days.')
        FROM (
          SELECT customer_id, card_no, full_name, phone
          FROM customers
          WHERE is_active = 1
          ORDER BY points_balance DESC, customer_id ASC
          LIMIT 10
        ) c
        WHERE NOT EXISTS (
          SELECT 1 
          FROM coupons existing
          WHERE existing.customer_id = c.customer_id 
            AND existing.promo_id = ? 
            AND existing.is_used = 0 
            AND existing.expiry_date >= CURDATE()
        )
      `, [prefixStr, finalPromoId, days, days, finalPromoId]);

      const packet = insertRes as unknown as OkPacket;
      issuedCount = packet?.affectedRows || 0;
    }

    // Fetch the newly assigned / active coupons for the top 10 customers
    const recentCoupons = await query<AssignedCouponRow>(`
      SELECT 
        cp.coupon_id,
        cp.code,
        cp.promo_id,
        pr.name AS promo_name,
        pr.discount_percent,
        cp.customer_id,
        c.full_name AS customer_name,
        c.card_no,
        c.phone,
        cp.expiry_date,
        cp.is_used
      FROM coupons cp
      JOIN customers c ON cp.customer_id = c.customer_id
      JOIN promotions pr ON cp.promo_id = pr.promo_id
      WHERE cp.promo_id = ?
        AND cp.is_used = 0
        AND cp.expiry_date >= CURDATE()
      ORDER BY cp.coupon_id DESC
      LIMIT 10
    `, [finalPromoId]);

    return NextResponse.json({
      success: true,
      issued_count: issuedCount,
      message: issuedCount > 0 
        ? `Successfully assigned ${issuedCount} VIP coupons to Top 10 Loyalty Customers!`
        : `All eligible Top 10 customers already have an active coupon for this promotion.`,
      coupons: recentCoupons,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/marketing/coupons/reward-top10 error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
