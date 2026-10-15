import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export async function GET() {
  try {
    const branches = await query(`
      SELECT 
        b.branch_id,
        b.branch_code,
        b.name,
        b.city,
        b.region,
        b.address,
        b.phone,
        b.manager_id,
        e.full_name AS manager_name,
        b.opened_date,
        b.is_active
      FROM branches b
      LEFT JOIN employees e ON b.manager_id = e.employee_id
      ORDER BY b.branch_id ASC
    `);

    return NextResponse.json(branches);
  } catch (err: any) {
    console.error("GET /api/branches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("manage_branches");
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const { branch_code, name, city, region, address, phone, manager_id, opened_date } = body;

    const result: any = await query(
      `INSERT INTO branches (branch_code, name, city, region, address, phone, manager_id, opened_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        branch_code,
        name,
        city,
        region,
        address || null,
        phone || null,
        manager_id || null,
        opened_date || new Date().toISOString().split("T")[0],
      ]
    );

    return NextResponse.json({ success: true, branch_id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/branches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
