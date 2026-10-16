import { NextResponse } from "next/server";
import { getServerSession, AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ActiveEmployeeRow {
  employee_id: number;
  branch_id: number;
  full_name: string;
  role: UserRole;
  email: string;
  is_active: number;
  branch_name: string | null;
}

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ user: null, error: "Unauthorized" }, { status: 401 });
    }

    const employee = await queryOne<ActiveEmployeeRow>(
      `SELECT e.employee_id, e.branch_id, e.full_name, e.role, e.email, e.is_active,
              b.name AS branch_name
         FROM employees e
         LEFT JOIN branches b ON e.branch_id = b.branch_id
        WHERE e.employee_id = ?
        LIMIT 1`,
      [session.employee_id]
    );

    if (!employee || employee.is_active !== 1) {
      // Clear invalidated/inactive session cookie
      const response = NextResponse.json(
        { user: null, error: "Account inactive or session invalid" },
        { status: 401 }
      );
      response.cookies.set({
        name: AUTH_COOKIE_OPTIONS.name,
        value: "",
        path: AUTH_COOKIE_OPTIONS.path,
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      user: {
        employee_id: employee.employee_id,
        email: employee.email,
        full_name: employee.full_name,
        role: employee.role,
        branch_id: employee.branch_id,
        branch_name: employee.branch_name,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Current-user endpoint error:", message);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
