import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest("view_audit_log");
    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table");
    const action = searchParams.get("action");

    let sql = `
      SELECT 
        audit_id,
        table_name,
        record_id,
        action,
        old_value,
        new_value,
        changed_by,
        changed_at
      FROM audit_log
      WHERE 1=1
    `;
    const params: any[] = [];

    if (table) {
      sql += ` AND table_name = ?`;
      params.push(table);
    }

    if (action) {
      sql += ` AND action = ?`;
      params.push(action);
    }

    sql += ` ORDER BY changed_at DESC LIMIT 100`;

    const logs = await query(sql, params);

    let errorLogs: any[] = [];
    try {
      errorLogs = await query(`
        SELECT error_id, error_code, message, stack_trace, occurred_at
        FROM error_log
        ORDER BY occurred_at DESC LIMIT 50
      `);
    } catch {
      // error_log table might have different columns or empty
    }

    return NextResponse.json({ auditLogs: logs, errorLogs });
  } catch (err: any) {
    console.error("GET /api/audit error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
