import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const categories = await query(`
      SELECT 
        c.category_id,
        c.name,
        c.parent_id,
        c.parent_key,
        p.name AS parent_name,
        COUNT(prod.product_id) AS product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.category_id
      LEFT JOIN products prod ON c.category_id = prod.category_id
      GROUP BY c.category_id, c.name, c.parent_id, c.parent_key, p.name
      ORDER BY c.name ASC
    `);

    return NextResponse.json(categories);
  } catch (err: any) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, parent_id } = body;

    const result: any = await query(
      "INSERT INTO categories (name, parent_id, parent_key) VALUES (?, ?, 0)",
      [name, parent_id || null]
    );

    return NextResponse.json({ success: true, category_id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/categories error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
