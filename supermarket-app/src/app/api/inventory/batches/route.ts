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

    // ---------- SUMMARY MODE ----------
    if (summary) {
      let sqlSum = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN pb.expiry_date IS NULL OR pb.expiry_date >= CURRENT_DATE THEN 1 ELSE 0 END) AS active,
          SUM(CASE
                WHEN pb.expiry_date IS NOT NULL
                  AND pb.expiry_date >= CURRENT_DATE
                  AND DATEDIFF(pb.expiry_date, CURRENT_DATE) <= 14
                THEN 1 ELSE 0 END) AS expiring_soon,
          SUM(CASE WHEN pb.expiry_date IS NOT NULL AND pb.expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) AS expired
        FROM product_batches pb
        JOIN products p ON pb.product_id = p.product_id
        JOIN branches b ON pb.branch_id = b.branch_id
        WHERE 1=1
      `;
      const sumParams: any[] = [];

      if (branchId) {
        sqlSum += ` AND pb.branch_id = ?`;
        sumParams.push(branchId);
      }

      const rows = await query(sqlSum, sumParams);
      return NextResponse.json(rows[0] ?? { total: 0, active: 0, expiring_soon: 0, expired: 0 });
    }

    // ---------- ROWS MODE ----------
    let sql = `
      SELECT
        pb.batch_id,
        pb.product_id,
        p.name AS product_name,
        p.barcode,
        pb.branch_id,
        b.name AS branch_name,
        pb.batch_no,
        pb.quantity,
        pb.received_date,
        pb.expiry_date,
        DATEDIFF(pb.expiry_date, CURRENT_DATE) AS days_to_expiry,
        CASE
          WHEN pb.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN DATEDIFF(pb.expiry_date, CURRENT_DATE) <= 14 THEN 'NEAR_EXPIRY'
          ELSE 'GOOD'
        END AS expiry_status
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.product_id
      JOIN branches b ON pb.branch_id = b.branch_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND pb.branch_id = ?`;
      params.push(branchId);
    }

    if (productId) {
      sql += ` AND pb.product_id = ?`;
      params.push(productId);
    }

    if (search && search.trim()) {
      sql += ` AND (p.name LIKE ? OR pb.batch_no LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status && ["GOOD", "NEAR_EXPIRY", "EXPIRED"].includes(status)) {
      if (status === "EXPIRED") {
        sql += ` AND pb.expiry_date < CURRENT_DATE`;
      } else if (status === "NEAR_EXPIRY") {
        sql += ` AND pb.expiry_date >= CURRENT_DATE AND DATEDIFF(pb.expiry_date, CURRENT_DATE) <= 14`;
      } else if (status === "GOOD") {
        sql += ` AND (pb.expiry_date IS NULL OR DATEDIFF(pb.expiry_date, CURRENT_DATE) > 14)`;
      }
    }

    sql += ` ORDER BY pb.expiry_date ASC, pb.quantity DESC`;

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
