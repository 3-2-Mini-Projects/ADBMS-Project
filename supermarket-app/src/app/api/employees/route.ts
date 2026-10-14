import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    let sql = `
      SELECT 
        e.employee_id,
        e.branch_id,
        b.name AS branch_name,
        e.full_name,
        e.role,
        e.email,
        e.phone,
        e.hire_date,
        e.monthly_salary,
        e.is_active,
        e.created_at
      FROM employees e
      JOIN branches b ON e.branch_id = b.branch_id
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` WHERE e.branch_id = ?`;
      params.push(branchId);
    }

    sql += ` ORDER BY e.role ASC, e.full_name ASC`;

    const employees = await query(sql, params);
    return NextResponse.json(employees);
  } catch (err: any) {
    console.error("GET /api/employees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { branch_id, full_name, role, email, phone, monthly_salary, hire_date } = body;

    const result: any = await query(
      `INSERT INTO employees (branch_id, full_name, role, email, phone, monthly_salary, hire_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        branch_id,
        full_name,
        role,
        email,
        phone || null,
        monthly_salary || 50000,
        hire_date || new Date().toISOString().split("T")[0],
      ]
    );

    return NextResponse.json({ success: true, employee_id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/employees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { employee_id, role, monthly_salary, is_active } = body;

    const updates: string[] = [];
    const params: any[] = [];

    if (role !== undefined) {
      updates.push("role = ?");
      params.push(role);
    }
    if (monthly_salary !== undefined) {
      updates.push("monthly_salary = ?");
      params.push(monthly_salary);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    params.push(employee_id);
    await query(`UPDATE employees SET ${updates.join(", ")} WHERE employee_id = ?`, params);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/employees error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
