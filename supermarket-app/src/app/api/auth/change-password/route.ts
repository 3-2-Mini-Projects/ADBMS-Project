import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession, logAuthEvent } from "@/lib/auth";
import { queryOne, query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface EmployeePasswordRow {
  employee_id: number;
  password_hash: string | null;
  is_active: number;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Retrieve user's current password hash
    const emp = await queryOne<EmployeePasswordRow>(
      "SELECT employee_id, password_hash, is_active FROM employees WHERE employee_id = ? LIMIT 1",
      [session.employee_id]
    );

    if (!emp || emp.is_active !== 1) {
      return NextResponse.json({ error: "Account not found or inactive." }, { status: 404 });
    }

    // Verify current password if a hash exists
    if (emp.password_hash) {
      const isValid = await bcrypt.compare(currentPassword, emp.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    // Hash new password and update
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    await query(
      "UPDATE employees SET password_hash = ? WHERE employee_id = ?",
      [newHash, session.employee_id]
    );

    await logAuthEvent({
      event: "PASSWORD_CHANGED" as any,
      employee_id: session.employee_id,
      email: session.email,
      role: session.role,
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
