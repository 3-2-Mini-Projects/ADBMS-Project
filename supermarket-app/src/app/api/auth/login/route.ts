import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import { createSessionToken, AUTH_COOKIE_OPTIONS, SessionEmployee, logAuthEvent } from "@/lib/auth";
import { UserRole } from "@/lib/types";

interface EmployeeRow {
  employee_id: number;
  branch_id: number;
  full_name: string;
  role: UserRole;
  email: string;
  password_hash: string | null;
  is_active: number;
}

const GENERIC_AUTH_ERROR = "Invalid email or password";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    const { email, password } = body as { email?: unknown; password?: unknown };

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.trim().length === 0 ||
      password.length === 0 ||
      email.length > 100 ||
      password.length > 255
    ) {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const employee = await queryOne<EmployeeRow>(
      `SELECT employee_id, branch_id, full_name, role, email, password_hash, is_active
         FROM employees
        WHERE email = ?
        LIMIT 1`,
      [normalizedEmail]
    );

    if (!employee || employee.is_active !== 1 || !employee.password_hash) {
      await logAuthEvent({
        event: "LOGIN_FAILURE",
        email: normalizedEmail,
        details: { reason: "ACCOUNT_NOT_ELIGIBLE" },
      });
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, employee.password_hash);
    if (!isMatch) {
      await logAuthEvent({
        event: "LOGIN_FAILURE",
        employee_id: employee.employee_id,
        email: normalizedEmail,
        role: employee.role,
        details: { reason: "INVALID_CREDENTIALS" },
      });
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }

    const sessionEmployee: SessionEmployee = {
      employee_id: employee.employee_id,
      email: employee.email,
      full_name: employee.full_name,
      role: employee.role,
      branch_id: employee.branch_id,
    };

    const token = createSessionToken(sessionEmployee);

    const response = NextResponse.json({
      user: sessionEmployee,
    });

    response.cookies.set({
      name: AUTH_COOKIE_OPTIONS.name,
      value: token,
      httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
      secure: AUTH_COOKIE_OPTIONS.secure,
      sameSite: AUTH_COOKIE_OPTIONS.sameSite,
      path: AUTH_COOKIE_OPTIONS.path,
      maxAge: AUTH_COOKIE_OPTIONS.maxAge,
    });


    await logAuthEvent({
      event: "LOGIN_SUCCESS",
      employee_id: employee.employee_id,
      email: normalizedEmail,
      role: employee.role,
      details: { branch_id: employee.branch_id },
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Login processing failure:", message);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
