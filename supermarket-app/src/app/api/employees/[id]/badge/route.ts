import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { generateBadgeQrDataUrl } from "@/lib/badge";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

interface EmployeeRow {
  employee_id: number;
  full_name: string;
  role: UserRole;
  email: string;
  is_active: number;
  branch_name: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest();
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const employeeId = Number(id);

    if (!employeeId || Number.isNaN(employeeId)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 });
    }

    const employee = await queryOne<EmployeeRow>(
      `SELECT e.employee_id, e.full_name, e.role, e.email, e.is_active, b.name AS branch_name
         FROM employees e
         JOIN branches b ON e.branch_id = b.branch_id
        WHERE e.employee_id = ?
        LIMIT 1`,
      [employeeId]
    );

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const qrDataUrl = await generateBadgeQrDataUrl(employee.employee_id, employee.role);
    const badgeCode = `EMP-${String(employee.employee_id).padStart(4, "0")}`;

    return NextResponse.json({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      role: employee.role,
      email: employee.email,
      branch_name: employee.branch_name,
      badge_code: badgeCode,
      qr_data_url: qrDataUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/employees/[id]/badge error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
