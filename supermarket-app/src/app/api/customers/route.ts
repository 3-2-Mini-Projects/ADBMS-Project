import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let sql = `
      SELECT 
        customer_id,
        card_no,
        full_name,
        phone,
        email,
        city,
        join_date,
        tier,
        points_balance,
        is_active
      FROM customers
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (card_no = ? OR phone LIKE ? OR full_name LIKE ?)`;
      params.push(search, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY customer_id DESC`;

    const customers = await query(sql, params);
    return NextResponse.json(customers);
  } catch (err: any) {
    console.error("GET /api/customers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, phone, email, city } = body;

    if (!full_name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Auto-generate card number
    const card_no = `C${Date.now().toString().slice(-5)}`;

    const result: any = await query(
      `INSERT INTO customers (card_no, full_name, phone, email, city, join_date, tier, points_balance, is_active)
       VALUES (?, ?, ?, ?, ?, CURDATE(), 'BRONZE', 0, 1)`,
      [card_no, full_name, phone, email || null, city || null]
    );

    return NextResponse.json({
      success: true,
      customer_id: result.insertId,
      card_no,
    });
  } catch (err: any) {
    console.error("POST /api/customers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
