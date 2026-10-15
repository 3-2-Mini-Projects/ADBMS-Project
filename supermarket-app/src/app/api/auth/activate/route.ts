import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ResultSetHeader } from "mysql2/promise";
import { pool, queryOne } from "@/lib/db";
import { logAuthEvent } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ActivationRow {
  activation_id: number;
  employee_id: number;
  expires_at: string | Date;
  used_at: string | Date | null;
  email: string;
  full_name: string;
  is_active: number;
  password_hash: string | null;
}

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { token, password, confirm_password } = body as {
      token?: unknown;
      password?: unknown;
      confirm_password?: unknown;
    };

    if (typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { error: "Activation token is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
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

    // Hash the incoming token with SHA-256 to look up in employee_activations
    const tokenHash = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const record = await queryOne<ActivationRow>(
      `SELECT 
         a.activation_id,
         a.employee_id,
         a.expires_at,
         a.used_at,
         e.email,
         e.full_name,
         e.is_active,
         e.password_hash
       FROM employee_activations a
       JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.token_hash = ?
      LIMIT 1`,
      [tokenHash]
    );

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or unrecognized activation link" },
        { status: 400 }
      );
    }

    if (record.used_at !== null) {
      return NextResponse.json(
        { error: "This activation link has already been used" },
        { status: 400 }
      );
    }

    const expiryTime = new Date(record.expires_at).getTime();
    if (Date.now() > expiryTime) {
      return NextResponse.json(
        { error: "This activation link has expired. Please contact an administrator." },
        { status: 400 }
      );
    }

    if (record.is_active !== 1) {
      return NextResponse.json(
        { error: "This employee account is inactive. Please contact an administrator." },
        { status: 400 }
      );
    }

    if (record.password_hash !== null) {
      return NextResponse.json(
        { error: "This account has already completed password activation." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Atomically invalidate token and store password_hash
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [actResult] = await connection.query<ResultSetHeader>(
        `UPDATE employee_activations
            SET used_at = NOW()
          WHERE activation_id = ?
            AND used_at IS NULL
            AND expires_at > NOW()`,
        [record.activation_id]
      );

      if (actResult.affectedRows === 0) {
        throw new Error("Activation token was already consumed or expired.");
      }

      const [empResult] = await connection.query<ResultSetHeader>(
        `UPDATE employees
            SET password_hash = ?
          WHERE employee_id = ?
            AND is_active = 1`,
        [passwordHash, record.employee_id]
      );

      if (empResult.affectedRows === 0) {
        throw new Error("Failed to update employee credentials.");
      }

      await connection.commit();
    } catch (txErr: unknown) {
      await connection.rollback().catch(() => {});
      throw txErr;
    } finally {
      connection.release();
    }

    // Audit log account activation event
    await logAuthEvent({
      event: "ACCOUNT_ACTIVATED",
      employee_id: record.employee_id,
      email: record.email,
      details: { action: "ACCOUNT_ACTIVATED" },
    });

    return NextResponse.json({
      success: true,
      message: "Account activated successfully. You can now log in.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/auth/activate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
