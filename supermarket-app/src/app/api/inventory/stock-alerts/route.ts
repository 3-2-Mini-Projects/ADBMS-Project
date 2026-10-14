import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status"); // "active" | "resolved" | "all"

    // ADBMS Stock Clerk View: vw_stock_alert_dashboard
    let sql = `
      SELECT 
        alert_id,
        alert_type,
        message,
        is_resolved,
        created_at,
        branch_id,
        branch_name,
        product_id,
        barcode,
        product_name,
        quantity_on_hand,
        reorder_level
      FROM vw_stock_alert_dashboard
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND branch_id = ?`;
      params.push(branchId);
    }

    if (status === "active" || !status) {
      sql += ` AND is_resolved = 0`;
    } else if (status === "resolved") {
      sql += ` AND is_resolved = 1`;
    }

    sql += ` ORDER BY is_resolved ASC, created_at DESC`;

    const alerts = await query(sql, params);
    return NextResponse.json(alerts);
  } catch (err: any) {
    console.error("GET /api/inventory/stock-alerts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { alert_id, is_resolved } = body;

    if (!alert_id) {
      return NextResponse.json({ error: "alert_id is required" }, { status: 400 });
    }

    await query(
      `UPDATE stock_alerts SET is_resolved = ?, updated_at = NOW() WHERE alert_id = ?`,
      [is_resolved !== undefined ? is_resolved : 1, alert_id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/inventory/stock-alerts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
