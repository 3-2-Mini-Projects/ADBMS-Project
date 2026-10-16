import { NextResponse } from "next/server";
import crypto from "crypto";
import { ResultSetHeader } from "mysql2/promise";
import { pool, query, queryOne } from "@/lib/db";
import { requireAdmin, logAuthEvent } from "@/lib/auth";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: UserRole[] = [
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "STOCK_CLERK",
  "CATALOG_MANAGER",
  "MARKETING",
  "HR",
];

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
        (e.password_hash IS NOT NULL) AS is_activated,
        e.created_at
      FROM employees e
      JOIN branches b ON e.branch_id = b.branch_id
    `;
    const params: unknown[] = [];

    if (branchId) {
      sql += ` WHERE e.branch_id = ?`;
      params.push(branchId);
    }

    sql += ` ORDER BY e.role ASC, e.full_name ASC`;

    const employees = await query(sql, params);
    return NextResponse.json(employees);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/employees error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 1. Authorize: Only authenticated administrators can create employees
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  const connection = await pool.getConnection();

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const {
      branch_id,
      full_name,
      role,
      email,
      phone,
      monthly_salary,
      hire_date,
    } = body as {
      branch_id?: unknown;
      full_name?: unknown;
      role?: unknown;
      email?: unknown;
      phone?: unknown;
      monthly_salary?: unknown;
      hire_date?: unknown;
    };

    // 2. Validate input fields
    if (typeof full_name !== "string" || full_name.trim().length === 0) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (typeof email !== "string" || email.trim().length === 0 || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }
    if (!branch_id || Number.isNaN(Number(branch_id))) {
      return NextResponse.json({ error: "A valid branch ID is required" }, { status: 400 });
    }
    if (typeof role !== "string" || !ALLOWED_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const branchIdNum = Number(branch_id);
    const salaryNum =
      monthly_salary !== undefined && !Number.isNaN(Number(monthly_salary))
        ? Number(monthly_salary)
        : 50000;
    const hireDateVal =
      typeof hire_date === "string" && hire_date.trim().length > 0
        ? hire_date.trim()
        : new Date().toISOString().split("T")[0];
    const phoneVal = typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : null;

    // 3. Check email uniqueness
    const existing = await queryOne<{ employee_id: number }>(
      "SELECT employee_id FROM employees WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing) {
      return NextResponse.json(
        { error: "An employee with this email address already exists" },
        { status: 409 }
      );
    }

    // 4. Verify branch exists
    const branch = await queryOne<{ branch_id: number }>(
      "SELECT branch_id FROM branches WHERE branch_id = ? LIMIT 1",
      [branchIdNum]
    );
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }

    // 5. Begin transaction to insert employee and activation token
    await connection.beginTransaction();

    const [empResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO employees (branch_id, full_name, role, email, phone, monthly_salary, hire_date, is_active, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
      [
        branchIdNum,
        full_name.trim(),
        role,
        normalizedEmail,
        phoneVal,
        salaryNum,
        hireDateVal,
      ]
    );

    const newEmployeeId = empResult.insertId;

    // 6. Generate high-entropy one-time activation token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await connection.query(
      `INSERT INTO employee_activations (employee_id, token_hash, expires_at, created_by)
       VALUES (?, ?, ?, ?)`,
      [newEmployeeId, tokenHash, expiresAt, session.employee_id]
    );

    await connection.commit();

    // 7. Audit log creation event
    await logAuthEvent({
      event: "EMPLOYEE_CREATED",
      employee_id: session.employee_id,
      email: session.email,
      role: session.role,
      action: "INSERT",
      details: {
        action: "EMPLOYEE_CREATED",
        created_employee_id: newEmployeeId,
        created_email: normalizedEmail,
        assigned_role: role,
      },
    });

    const activationUrl = `/activate-account?token=${rawToken}`;

    return NextResponse.json({
      success: true,
      employee_id: newEmployeeId,
      activation: {
        token: rawToken,
        activation_url: activationUrl,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    await connection.rollback().catch(() => {});
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/employees error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { employee_id, role, monthly_salary, is_active } = body;

    if (!employee_id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (role !== undefined) {
      if (!ALLOWED_ROLES.includes(role as UserRole)) {
        return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
      }
      updates.push("role = ?");
      params.push(role);
    }
    if (monthly_salary !== undefined) {
      updates.push("monthly_salary = ?");
      params.push(Number(monthly_salary));
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    params.push(employee_id);
    await query(`UPDATE employees SET ${updates.join(", ")} WHERE employee_id = ?`, params);


    await logAuthEvent({
      event: "EMPLOYEE_UPDATED",
      employee_id: auth.session.employee_id,
      email: auth.session.email,
      role: auth.session.role,
      action: "UPDATE",
      details: {
        target_employee_id: employee_id,
        updated_role: role,
        updated_salary: monthly_salary,
        updated_active: is_active,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("PATCH /api/employees error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
