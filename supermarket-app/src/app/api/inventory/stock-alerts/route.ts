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
      `UPDATE stock_alerts SET is_resolved = ? WHERE alert_id = ?`,
      [is_resolved !== undefined ? is_resolved : 1, alert_id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/inventory/stock-alerts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const branchId = body.branchId;

    // 1. Insert LOW_STOCK alerts automatically if not already unresolved
    let lowStockSql = `
      INSERT INTO stock_alerts (branch_id, product_id, alert_type, message, is_resolved, created_at)
      SELECT 
          i.branch_id, 
          i.product_id, 
          'LOW_STOCK', 
          CONCAT('Product "', p.name, '" is low on stock (', i.quantity_on_hand, ' remaining, reorder level is ', i.reorder_level, ')'),
          0, 
          NOW()
      FROM inventory i
      JOIN products p ON p.product_id = i.product_id
      WHERE i.quantity_on_hand <= i.reorder_level
    `;
    const lowParams: any[] = [];
    if (branchId) {
      lowStockSql += ` AND i.branch_id = ?`;
      lowParams.push(branchId);
    }
    lowStockSql += `
      AND NOT EXISTS (
          SELECT 1 FROM stock_alerts sa 
          WHERE sa.branch_id = i.branch_id 
            AND sa.product_id = i.product_id 
            AND sa.alert_type = 'LOW_STOCK' 
            AND sa.is_resolved = 0
      )
    `;
    await query(lowStockSql, lowParams);

    // 2. Insert EXPIRY alerts for batches expiring within 14 days
    let expirySql = `
      INSERT INTO stock_alerts (branch_id, product_id, alert_type, message, is_resolved, created_at)
      SELECT 
          pb.branch_id, 
          pb.product_id, 
          'EXPIRY',
          CONCAT('Batch "', pb.batch_no, '" of "', p.name, '" is expiring soon on ', pb.expiry_date),
          0, 
          NOW()
      FROM product_batches pb
      JOIN products p ON p.product_id = pb.product_id
      WHERE pb.quantity > 0
        AND pb.expiry_date <= CURRENT_DATE + INTERVAL 14 DAY
    `;
    const expParams: any[] = [];
    if (branchId) {
      expirySql += ` AND pb.branch_id = ?`;
      expParams.push(branchId);
    }
    expirySql += `
      AND NOT EXISTS (
          SELECT 1 FROM stock_alerts sa
          WHERE sa.branch_id = pb.branch_id
            AND sa.product_id = pb.product_id
            AND sa.alert_type = 'EXPIRY'
            AND sa.is_resolved = 0
      )
    `;
    await query(expirySql, expParams);

    // Fetch count of active alerts for this branch
    let countSql = `SELECT COUNT(*) as count FROM stock_alerts WHERE is_resolved = 0`;
    const countParams: any[] = [];
    if (branchId) {
      countSql += ` AND branch_id = ?`;
      countParams.push(branchId);
    }
    const [countRow]: any = await query(countSql, countParams);

    return NextResponse.json({
      success: true,
      message: "Stock alerts scan completed",
      active_count: countRow?.count || 0,
    });
  } catch (err: any) {
    console.error("POST /api/inventory/stock-alerts error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
