import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const productId = searchParams.get("productId");
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // GOOD | NEAR_EXPIRY | EXPIRED
    const summary = searchParams.get("summary") === "true";

    // ---------- SUMMARY MODE (Directly from View) ----------
    if (summary) {
      let sqlSum = `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN status != 'EXPIRED' THEN 1 ELSE 0 END), 0) AS active,
          COALESCE(SUM(CASE WHEN status = 'NEAR_EXPIRY' THEN 1 ELSE 0 END), 0) AS expiring_soon,
          COALESCE(SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END), 0) AS expired
        FROM vw_batch_expiry_status
        WHERE 1=1
      `;
      const sumParams: any[] = [];

      if (branchId) {
        sqlSum += ` AND branch_id = ?`;
        sumParams.push(branchId);
      }

      const rows = await query(sqlSum, sumParams);
      return NextResponse.json(rows[0] ?? { total: 0, active: 0, expiring_soon: 0, expired: 0 });
    }

    // ---------- ROWS MODE (Directly from View) ----------
    let sql = `SELECT * FROM vw_batch_expiry_status WHERE 1=1`;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND branch_id = ?`;
      params.push(branchId);
    }

    if (productId) {
      sql += ` AND product_id = ?`;
      params.push(productId);
    }

    if (search && search.trim()) {
      sql += ` AND (product_name LIKE ? OR batch_no LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status && ["GOOD", "NEAR_EXPIRY", "EXPIRED"].includes(status)) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY expiry_date ASC, quantity DESC`;

    const batches = await query(sql, params);
    return NextResponse.json(batches);
  } catch (err: any) {
    console.error("GET /api/inventory/batches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_id, branch_id, batch_no, quantity, received_date, expiry_date } = body;

    const result: any = await query(
      `INSERT INTO product_batches (product_id, branch_id, batch_no, quantity, received_date, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, branch_id, batch_no, quantity, received_date || new Date().toISOString().split("T")[0], expiry_date || null]
    );

    // Also increase inventory quantity_on_hand
    await query(
      `UPDATE inventory
       SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW()
       WHERE branch_id = ? AND product_id = ?`,
      [quantity, branch_id, product_id]
    );

    return NextResponse.json({ success: true, batch_id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/inventory/batches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
