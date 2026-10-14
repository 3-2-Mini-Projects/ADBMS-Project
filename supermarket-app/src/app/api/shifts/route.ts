import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const employeeId = searchParams.get("employeeId");

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
  try {
    const body = await req.json();
    const { employee_id, branch_id, shift_date, start_time, end_time } = body;

    const res: any = await query(
      `INSERT INTO shifts (employee_id, branch_id, shift_date, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, 'SCHEDULED')`,
      [employee_id, branch_id, shift_date, start_time, end_time]
    );

    return NextResponse.json({ success: true, shift_id: res.insertId });
  } catch (err: any) {
    console.error("POST /api/shifts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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
