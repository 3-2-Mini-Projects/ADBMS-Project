import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/cashier/customers?q=... — Lookup customers by card number, phone, or name
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json([]);
    }

    const customers = await query<any>(`
      SELECT customer_id, card_no, full_name, phone, email, tier, points_balance, is_active
      FROM customers
      WHERE is_active = 1 
        AND (card_no LIKE ? OR phone LIKE ? OR full_name LIKE ?)
      ORDER BY full_name ASC
      LIMIT 10
    `, [`%${q}%`, `%${q}%`, `%${q}%`]);

    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("Customer lookup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
