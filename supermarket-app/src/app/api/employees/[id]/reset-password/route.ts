import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAdmin, logAuthEvent } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface EmployeeRow {
  employee_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: number;
  password_hash: string | null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  try {
    const { id } = await params;
    const employeeId = Number(id);

    if (!employeeId || Number.isNaN(employeeId)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 });
    }

    if (employeeId === session.employee_id) {
      return NextResponse.json(
        { error: "You cannot reset your own administrator credentials here. Use your profile settings." },
        { status: 400 }
      );
    }

    const employee = await queryOne<EmployeeRow>(
      `SELECT employee_id, full_name, email, role, is_active, password_hash
         FROM employees
        WHERE employee_id = ?
        LIMIT 1`,
      [employeeId]
    );

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee.is_active !== 1) {
      return NextResponse.json(
        { error: "Cannot reset password for an inactive or archived employee." },
        { status: 400 }
      );
    }

    // Clear existing password hash to require first-time password setup on login
    await query(
      "UPDATE employees SET password_hash = NULL WHERE employee_id = ?",
      [employeeId]
    );

    // Audit log password reset event
    await logAuthEvent({
      event: "EMPLOYEE_UPDATED",
      employee_id: session.employee_id,
      email: session.email,
      role: session.role,
      action: "UPDATE",
      details: {
        action: "EMPLOYEE_PASSWORD_RESET",
        target_employee_id: employeeId,
        target_email: employee.email,
        target_name: employee.full_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${employee.full_name}. Their status is now Pending Activation.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/employees/[id]/reset-password error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
