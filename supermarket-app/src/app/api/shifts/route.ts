import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authenticateRequest, authorizeRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await authenticateRequest();
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;
  if (session.role === "CASHIER") {
    return NextResponse.json(
      { error: "Access denied. Shifts and attendance records are not accessible to cashiers." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const branchIdParam = searchParams.get("branchId");
    const employeeIdParam = searchParams.get("employeeId");

    // Confine non-management staff to own branch / own shifts
    const isManagerial = session.role === "ADMIN" || session.role === "HR" || session.role === "MANAGER";
    const branchId = isManagerial ? branchIdParam : String(session.branch_id);
    const employeeId = isManagerial ? employeeIdParam : String(session.employee_id);

    let sql = `
      SELECT 
        s.shift_id,
        s.employee_id,
        e.full_name AS employee_name,
        e.role,
        s.branch_id,
        b.name AS branch_name,
        s.shift_date,
        s.start_time,
        s.end_time,
        s.clock_in,
        s.clock_out,
        s.status
      FROM shifts s
      JOIN employees e ON s.employee_id = e.employee_id
      JOIN branches b ON s.branch_id = b.branch_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND s.branch_id = ?`;
      params.push(branchId);
    }

    if (employeeId) {
      sql += ` AND s.employee_id = ?`;
      params.push(employeeId);
    }

    sql += ` ORDER BY s.shift_date DESC, s.start_time DESC LIMIT 100`;

    const shifts = await query(sql, params);
    return NextResponse.json(shifts);
  } catch (err: any) {
    console.error("GET /api/shifts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("manage_employees");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  try {
    const body = await req.json();
    const { employee_id, branch_id, shift_date, start_time, end_time } = body;
    const effectiveBranchId = session.role === "ADMIN" ? (branch_id || session.branch_id) : session.branch_id;
    const res: any = await query(
      `INSERT INTO shifts (employee_id, branch_id, shift_date, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, 'SCHEDULED')`,
      [employee_id, effectiveBranchId, shift_date, start_time, end_time]
    );

    return NextResponse.json({ success: true, shift_id: res.insertId });
  } catch (err: any) {
    console.error("POST /api/shifts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authenticateRequest();
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const { shift_id, action } = body; // action: 'clock_in' | 'clock_out'

    if (action === "clock_in") {
      await query(
        "UPDATE shifts SET clock_in = NOW(), status = 'PRESENT' WHERE shift_id = ?",
        [shift_id]
      );
    } else if (action === "clock_out") {
      await query(
        "UPDATE shifts SET clock_out = NOW(), status = 'COMPLETED' WHERE shift_id = ?",
        [shift_id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/shifts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
