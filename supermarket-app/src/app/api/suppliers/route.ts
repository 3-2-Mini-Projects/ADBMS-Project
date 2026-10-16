import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const suppliers = await query(`
      SELECT 
        s.supplier_id,
        s.supplier_code,
        s.name,
        s.contact_name,
        s.phone,
        s.email,
        s.address,
        s.is_active,
        COUNT(p.product_id) AS products_count
      FROM suppliers s
      LEFT JOIN products p ON s.supplier_id = p.supplier_id
      GROUP BY s.supplier_id, s.supplier_code, s.name, s.contact_name, s.phone, s.email, s.address, s.is_active
      ORDER BY s.name ASC
    `);

    return NextResponse.json(suppliers);
  } catch (err: any) {
    console.error("GET /api/suppliers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplier_code, name, contact_name, phone, email, address } = body;

    const result: any = await query(
      `INSERT INTO suppliers (supplier_code, name, contact_name, phone, email, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [supplier_code, name, contact_name || null, phone || null, email || null, address || null]
    );

    return NextResponse.json({ success: true, supplier_id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/suppliers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
