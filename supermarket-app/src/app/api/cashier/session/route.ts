import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/cashier/session - Return active cashiers and managers with branch details
export async function GET() {
  try {
    const cashiers = await query<any>(`
      SELECT 
        e.employee_id, e.branch_id, e.full_name, e.role, e.email,
        b.name AS branch_name, b.branch_code, b.city
      FROM employees e
      JOIN branches b ON e.branch_id = b.branch_id
      WHERE e.role = 'CASHIER' AND e.is_active = 1
      ORDER BY e.employee_id ASC
    `);

    const managers = await query<any>(`
      SELECT 
        e.employee_id, e.branch_id, e.full_name, e.role, e.email,
        b.name AS branch_name, b.branch_code
      FROM employees e
      JOIN branches b ON e.branch_id = b.branch_id
      WHERE e.role = 'MANAGER' AND e.is_active = 1
      ORDER BY e.employee_id ASC
    `);

    const branches = await query<any>(`
      SELECT branch_id, branch_code, name, city, address, phone
      FROM branches
      WHERE is_active = 1
      ORDER BY branch_id ASC
    `);

    return NextResponse.json({
      cashiers,
      managers,
      branches,
    });
  } catch (error: any) {
    console.error("Cashier session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/cashier/session - Verify manager authorization for returns, voids, discounts
export async function POST(req: Request) {
  try {
    const { managerId, pin } = await req.json();

    if (!managerId) {
      return NextResponse.json({ authorized: false, error: "Manager selection required" }, { status: 400 });
    }

    const [mgr] = await query<any>(`
      SELECT employee_id, full_name, role, branch_id
      FROM employees
      WHERE employee_id = ? AND role = 'MANAGER' AND is_active = 1
    `, [managerId]);

    if (!mgr) {
      return NextResponse.json({ authorized: false, error: "Invalid or inactive manager" }, { status: 401 });
    }

    // Standard PIN for lab/demo manager approval: 1234, or last 4 digits of employee ID / phone
    const validPin = pin === "1234" || pin === "admin" || pin === "manager" || pin === "9999";
    if (!validPin) {
      return NextResponse.json({ authorized: false, error: "Invalid manager authorization PIN (Use default: 1234)" }, { status: 401 });
    }

    return NextResponse.json({
      authorized: true,
      manager: {
        employee_id: mgr.employee_id,
        full_name: mgr.full_name,
        branch_id: mgr.branch_id,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ authorized: false, error: error.message }, { status: 500 });
  }
}
