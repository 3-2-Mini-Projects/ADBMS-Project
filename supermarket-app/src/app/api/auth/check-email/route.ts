import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

interface EmployeeCheckRow {
  employee_id: number;
  full_name: string;
  role: UserRole;
  is_active: number;
  is_registered: number | boolean;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { email } = body as { email?: unknown };

    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json({ error: "Please enter your work email address" }, { status: 400 });
    }

    let normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      normalizedEmail = `${normalizedEmail}@shop.lk`;
    }

    const employee = await queryOne<EmployeeCheckRow>(
      `SELECT employee_id, full_name, role, is_active, (password_hash IS NOT NULL) AS is_registered
         FROM employees
        WHERE email = ?
        LIMIT 1`,
      [normalizedEmail]
    );

    if (!employee) {
      return NextResponse.json(
        {
          exists: false,
          error: "No employee record found with this email. Please contact your administrator.",
        },
        { status: 404 }
      );
    }

    if (employee.is_active !== 1) {
      return NextResponse.json(
        {
          exists: false,
          error: "This employee account is currently deactivated. Please contact your branch manager.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      exists: true,
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      role: employee.role,
      is_registered: Boolean(employee.is_registered),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/auth/check-email error:", message);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
