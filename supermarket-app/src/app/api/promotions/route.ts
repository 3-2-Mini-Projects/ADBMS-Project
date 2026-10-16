import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export async function GET() {
  try {
    const promotions = await query(`
      SELECT 
        pr.promo_id,
        pr.name,
        pr.discount_percent,
        pr.start_date,
        pr.end_date,
        pr.product_id,
        p.name AS product_name,
        pr.category_id,
        c.name AS category_name,
        pr.is_active,
        CASE
          WHEN CURRENT_DATE BETWEEN pr.start_date AND pr.end_date AND pr.is_active = 1 THEN 'ACTIVE'
          WHEN CURRENT_DATE < pr.start_date THEN 'SCHEDULED'
          ELSE 'EXPIRED'
        END AS status
      FROM promotions pr
      LEFT JOIN products p ON pr.product_id = p.product_id
      LEFT JOIN categories c ON pr.category_id = c.category_id
      ORDER BY pr.promo_id DESC
    `);

    const coupons = await query(`
      SELECT 
        cp.coupon_id,
        cp.code,
        cp.promo_id,
        pr.name AS promo_name,
        pr.discount_percent,
        cp.customer_id,
        c.full_name AS customer_name,
        cp.expiry_date,
        cp.is_used,
        cp.used_at
      FROM coupons cp
      JOIN promotions pr ON cp.promo_id = pr.promo_id
      LEFT JOIN customers c ON cp.customer_id = c.customer_id
      ORDER BY cp.coupon_id DESC
    `);

    return NextResponse.json({ promotions, coupons });
  } catch (err: any) {
    console.error("GET /api/promotions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("manage_promotions");
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_coupon") {
      const { code, promo_id, customer_id, expiry_date } = body;
      const res: any = await query(
        `INSERT INTO coupons (code, promo_id, customer_id, expiry_date, is_used)
         VALUES (?, ?, ?, ?, 0)`,
        [code, promo_id, customer_id || null, expiry_date]
      );
      return NextResponse.json({ success: true, coupon_id: res.insertId });
    } else {
      // create promotion
      const { name, discount_percent, start_date, end_date, product_id, category_id } = body;
      const res: any = await query(
        `INSERT INTO promotions (name, discount_percent, start_date, end_date, product_id, category_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [name, discount_percent, start_date, end_date, product_id || null, category_id || null]
      );
      return NextResponse.json({ success: true, promo_id: res.insertId });
    }
  } catch (err: any) {
    console.error("POST /api/promotions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeRequest("manage_promotions");
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const { promo_id, is_active } = body;

    await query("UPDATE promotions SET is_active = ? WHERE promo_id = ?", [is_active, promo_id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/promotions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
