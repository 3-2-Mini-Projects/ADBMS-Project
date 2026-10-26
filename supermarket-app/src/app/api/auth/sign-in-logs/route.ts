import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface UserSignInLog {
  audit_id: number;
  event: string;
  action: string;
  timestamp: string;
  email: string | null;
  role: string | null;
  details?: Record<string, unknown>;
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = session.employee_id;
    const empIdStr = String(employeeId);
    const changedBy = `employee_${employeeId}`;

    const auditRows: any = await query(
      `SELECT audit_id, record_id, action, new_value, changed_by, changed_at
       FROM audit_log
       WHERE (table_name = 'employees' AND record_id = ?)
          OR changed_by = ?
          OR new_value LIKE ?
       ORDER BY changed_at DESC
       LIMIT 25`,
      [empIdStr, changedBy, `%"employee_id":${employeeId}%`]
    );

    const logs: UserSignInLog[] = (Array.isArray(auditRows) ? auditRows : []).map((row: any) => {
      let parsedValue: any = {};
      try {
        if (typeof row.new_value === "string") {
          parsedValue = JSON.parse(row.new_value);
        } else if (typeof row.new_value === "object" && row.new_value !== null) {
          parsedValue = row.new_value;
        }
      } catch {
        parsedValue = { raw: row.new_value };
      }

      const eventType =
        parsedValue.event ||
        (row.action === "INSERT"
          ? "LOGIN_SUCCESS"
          : row.action === "DELETE"
          ? "LOGOUT"
          : "SESSION_ACTIVITY");

      return {
        audit_id: row.audit_id,
        event: eventType,
        action: row.action,
        timestamp: row.changed_at,
        email: parsedValue.email || session.email,
        role: parsedValue.role || session.role,
        details: parsedValue,
      };
    });

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
