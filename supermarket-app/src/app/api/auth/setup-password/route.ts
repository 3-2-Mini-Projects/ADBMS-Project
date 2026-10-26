import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ResultSetHeader } from "mysql2/promise";
import { pool, queryOne } from "@/lib/db";
import {
  createSessionToken,
  AUTH_COOKIE_OPTIONS,
  SessionEmployee,
  logAuthEvent,
} from "@/lib/auth";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

interface EmployeeRow {
  employee_id: number;
  branch_id: number;
  full_name: string;
  role: UserRole;
  email: string;
  password_hash: string | null;
  is_active: number;
}

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { email, password, confirm_password } = body as {
      email?: unknown;
      password?: unknown;
      confirm_password?: unknown;
    };

    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (
      typeof password !== "string" ||
      typeof confirm_password !== "string" ||
      password.length === 0
    ) {
      return NextResponse.json(
        { error: "Password and password confirmation are required" },
        { status: 400 }
      );
    }

    if (password !== confirm_password) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (!PASSWORD_POLICY_REGEX.test(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const employee = await queryOne<EmployeeRow>(
      `SELECT employee_id, branch_id, full_name, role, email, password_hash, is_active
         FROM employees
        WHERE email = ?
        LIMIT 1`,
      [normalizedEmail]
    );

    if (!employee || employee.is_active !== 1) {
      return NextResponse.json(
        { error: "No active employee found with this email" },
        { status: 400 }
      );
    }

    if (employee.password_hash !== null) {
      return NextResponse.json(
        {
          error:
            "This account is already registered with a password. Please sign in using your existing password.",
          is_already_registered: true,
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const connection = await pool.getConnection();

    try {
      const [updateResult] = await connection.query<ResultSetHeader>(
        `UPDATE employees
            SET password_hash = ?
          WHERE employee_id = ?
            AND password_hash IS NULL
            AND is_active = 1`,
        [passwordHash, employee.employee_id]
      );

      if (updateResult.affectedRows === 0) {
        return NextResponse.json(
          { error: "Account credentials have already been configured." },
          { status: 400 }
        );
      }
    } finally {
      connection.release();
    }

    // Audit log
    await logAuthEvent({
      event: "ACCOUNT_ACTIVATED",
      employee_id: employee.employee_id,
      email: employee.email,
      role: employee.role,
      action: "UPDATE",
    });

    // Automatically establish authenticated session
    const sessionEmployee: SessionEmployee = {
      employee_id: employee.employee_id,
      email: employee.email,
      full_name: employee.full_name,
      role: employee.role,
      branch_id: employee.branch_id,
    };

    const token = createSessionToken(sessionEmployee);

    const response = NextResponse.json({
      success: true,
      message: "Password configured successfully.",
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

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/auth/setup-password error:", message);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
