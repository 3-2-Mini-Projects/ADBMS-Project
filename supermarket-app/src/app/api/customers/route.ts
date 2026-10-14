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

    let customer_id: number;
    try {
      const procRes: any = await query(
        `CALL register_customer(?, ?, ?, ?, ?)`,
        [card_no, full_name, phone, email || null, city || "Colombo"]
      );
      customer_id = procRes?.[0]?.[0]?.customer_id || procRes?.insertId;
    } catch {
      const result: any = await query(
        `INSERT INTO customers (card_no, full_name, phone, email, city, join_date, tier, points_balance, is_active)
         VALUES (?, ?, ?, ?, ?, CURDATE(), 'BRONZE', 0, 1)`,
        [card_no, full_name, phone, email || null, city || null]
      );
      customer_id = result.insertId;
    }

    return NextResponse.json({
      success: true,
      customer_id,
      card_no,
    });
  } catch (err: any) {
    console.error("POST /api/customers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, full_name, phone, email, city, tier, points_balance, join_date, is_active } = body;

    if (!customer_id || !full_name || !phone) {
      return NextResponse.json({ error: "Customer ID, full name and phone number are required" }, { status: 400 });
    }

    // Format join_date if provided (YYYY-MM-DD)
    let formattedJoinDate: string | null = null;
    if (join_date) {
      formattedJoinDate = new Date(join_date).toISOString().slice(0, 10);
    }

    await query(
      `UPDATE customers
       SET full_name = ?,
           phone = ?,
           email = ?,
           city = ?,
           tier = COALESCE(?, tier),
           points_balance = COALESCE(?, points_balance),
           join_date = COALESCE(?, join_date),
           is_active = COALESCE(?, is_active)
       WHERE customer_id = ?`,
      [
        full_name,
        phone,
        email || null,
        city || null,
        tier || null,
        points_balance !== undefined ? points_balance : null,
        formattedJoinDate,
        is_active !== undefined ? is_active : null,
        customer_id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch (err: any) {
    console.error("PUT /api/customers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
