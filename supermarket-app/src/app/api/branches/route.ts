import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { pool, query, queryOne } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export async function GET() {
  try {
    const branches = await query(`
      SELECT 
        b.branch_id,
        b.branch_code,
        b.name,
        b.city,
        b.region,
        b.address,
        b.phone,
        b.manager_id,
        e.full_name AS manager_name,
        b.opened_date,
        b.is_active
      FROM branches b
      LEFT JOIN employees e ON b.manager_id = e.employee_id
      ORDER BY b.branch_id ASC
    `);

    return NextResponse.json(branches);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/branches error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("manage_branches");
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const { branch_code, name, city, region, address, phone, manager_id, opened_date } = body;

    if (manager_id) {
      const validManager = await queryOne<{ employee_id: number }>(
        "SELECT employee_id FROM employees WHERE employee_id = ? AND role = 'MANAGER' AND is_active = 1 LIMIT 1",
        [Number(manager_id)]
      );
      if (!validManager) {
        return NextResponse.json(
          { error: "Assigned branch manager must be an active employee with role MANAGER" },
          { status: 400 }
        );
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO branches (branch_code, name, city, region, address, phone, manager_id, opened_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        branch_code,
        name,
        city,
        region,
        address || null,
        phone || null,
        manager_id || null,
        opened_date || new Date().toISOString().split("T")[0],
      ]
    );

    return NextResponse.json({ success: true, branch_id: result.insertId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/branches error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeRequest("manage_branches");
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const {
      branch_id,
      name,
      city,
      region,
      address,
      phone,
      manager_id,
      is_active,
    } = body as {
      branch_id?: unknown;
      name?: unknown;
      city?: unknown;
      region?: unknown;
      address?: unknown;
      phone?: unknown;
      manager_id?: unknown;
      is_active?: unknown;
    };

    if (!branch_id || Number.isNaN(Number(branch_id))) {
      return NextResponse.json({ error: "Valid branch_id is required" }, { status: 400 });
    }

    const branchIdNum = Number(branch_id);

    // Verify branch exists
    const existing = await queryOne<{ branch_id: number; branch_code: string; name: string }>(
      "SELECT branch_id, branch_code, name FROM branches WHERE branch_id = ? LIMIT 1",
      [branchIdNum]
    );

    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // If manager_id is passed, validate that the employee has role 'MANAGER' and is active
    if (manager_id !== undefined && manager_id !== null && manager_id !== "") {
      const validManager = await queryOne<{ employee_id: number }>(
        "SELECT employee_id FROM employees WHERE employee_id = ? AND role = 'MANAGER' AND is_active = 1 LIMIT 1",
        [Number(manager_id)]
      );
      if (!validManager) {
        return NextResponse.json(
          { error: "Assigned branch manager must be an active employee with role MANAGER" },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (typeof name === "string" && name.trim().length > 0) {
      updates.push("name = ?");
      params.push(name.trim());
    }
    if (typeof city === "string" && city.trim().length > 0) {
      updates.push("city = ?");
      params.push(city.trim());
    }
    if (typeof region === "string" && region.trim().length > 0) {
      updates.push("region = ?");
      params.push(region.trim());
    }
    if (address !== undefined) {
      updates.push("address = ?");
      params.push(typeof address === "string" && address.trim().length > 0 ? address.trim() : null);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      params.push(typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : null);
    }
    if (manager_id !== undefined) {
      updates.push("manager_id = ?");
      params.push(manager_id ? Number(manager_id) : null);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    params.push(branchIdNum);

    await pool.query<ResultSetHeader>(
      `UPDATE branches SET ${updates.join(", ")} WHERE branch_id = ?`,
      params
    );

    return NextResponse.json({
      success: true,
      message: `Branch "${existing.branch_code}" updated successfully`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("PATCH /api/branches error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
