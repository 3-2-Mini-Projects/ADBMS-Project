import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authorizeRequest("manage_inventory");
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const requestedBranchId = searchParams.get("branchId");
    const branchId = session.role === "ADMIN" ? requestedBranchId : String(session.branch_id);
    const productId = searchParams.get("productId");
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // GOOD | NEAR_EXPIRY | EXPIRED
    const summary = searchParams.get("summary") === "true";

    // ---------- SUMMARY MODE (Directly from View) ----------
    if (summary) {
      let sqlSum = `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN expiry_status != 'EXPIRED' THEN 1 ELSE 0 END), 0) AS active,
          COALESCE(SUM(CASE WHEN expiry_status = 'EXPIRING_SOON' THEN 1 ELSE 0 END), 0) AS expiring_soon,
          COALESCE(SUM(CASE WHEN expiry_status = 'EXPIRED' THEN 1 ELSE 0 END), 0) AS expired
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
      const viewStatus = status === "GOOD" ? "NORMAL" : status === "NEAR_EXPIRY" ? "EXPIRING_SOON" : "EXPIRED";
      sql += ` AND expiry_status = ?`;
      params.push(viewStatus);
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
  const auth = await authorizeRequest("manage_inventory");
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const body = await req.json();
    const { product_id, branch_id: requestedBranchId, batch_no, quantity, received_date, expiry_date } = body;
    const productId = Number(product_id);
    const branchId = session.role === "ADMIN" ? Number(requestedBranchId) : session.branch_id;
    const qty = Number(quantity);

    if (!Number.isInteger(productId) || productId <= 0 ||
        !Number.isInteger(branchId) || branchId <= 0 ||
        !Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json({ error: "Valid product, branch, and positive integer quantity are required." }, { status: 400 });
    }

    const result: any = await query(
      `INSERT INTO product_batches (product_id, branch_id, batch_no, quantity, received_date, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, branchId, batch_no, qty, received_date || new Date().toISOString().split("T")[0], expiry_date || null]
    );

    // Also increase inventory quantity_on_hand
    await query(
      `UPDATE inventory
       SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW()
       WHERE branch_id = ? AND product_id = ?`,
      [qty, branchId, productId]
    );

    return NextResponse.json({ success: true, batch_id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/inventory/batches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
