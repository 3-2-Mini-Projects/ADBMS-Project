import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING_SUPERVISOR_APPROVAL";
    const productId = searchParams.get("productId");

    let sql = `
      SELECT 
        h.history_id,
        h.product_id,
        p.barcode,
        p.name AS product_name,
        p.brand,
        c.name AS category_name,
        p.cost_price,
        h.old_price,
        h.new_price,
        ROUND(h.new_price - h.old_price, 2) AS price_diff,
        COALESCE(h.price_variance_pct, ROUND(((h.new_price - h.old_price) / h.old_price) * 100, 2)) AS price_variance_pct,
        ROUND(h.new_price - p.cost_price, 2) AS proposed_margin,
        CASE WHEN h.new_price < p.cost_price THEN 1 ELSE 0 END AS is_below_cost,
        h.changed_by,
        e_req.full_name AS requester_name,
        e_req.role AS requester_role,
        h.changed_at,
        h.reason,
        COALESCE(h.supervisor_approval_status, 'APPROVED') AS supervisor_approval_status,
        h.supervisor_id,
        e_sup.full_name AS supervisor_name,
        h.supervisor_comment,
        h.approved_at
      FROM product_price_history h
      JOIN products p ON h.product_id = p.product_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN employees e_req ON h.changed_by = e_req.employee_id
      LEFT JOIN employees e_sup ON h.supervisor_id = e_sup.employee_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== "ALL") {
      conditions.push("h.supervisor_approval_status = ?");
      params.push(status);
    }

    if (productId) {
      conditions.push("h.product_id = ?");
      params.push(productId);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY h.changed_at DESC LIMIT 100";

    const approvals = await query(sql, params);
    return NextResponse.json(approvals);
  } catch (err: any) {
    console.error("GET /api/catalog/price-approvals error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Only Managers or Admins can act as supervisors to approve/reject
  const auth = await authorizeRequest("manage_catalog");
  if (auth.error) {
    return auth.error;
  }

  const supervisorId = auth.session.employee_id;
  const connection = await pool.getConnection();

  try {
    const body = await req.json();
    const { history_id, decision, comment } = body;

    if (!history_id || !decision || !["APPROVED", "REJECTED"].includes(decision)) {
      return NextResponse.json(
        { error: "history_id and decision ('APPROVED' | 'REJECTED') are required" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `SELECT h.history_id, h.product_id, h.old_price, h.new_price, h.supervisor_approval_status, p.unit_price AS current_unit_price
       FROM product_price_history h
       JOIN products p ON h.product_id = p.product_id
       WHERE h.history_id = ?
       FOR UPDATE`,
      [history_id]
    );

    if (rows.length === 0) {
      throw new Error("Price revision record not found");
    }

    const item = rows[0];

    if (item.supervisor_approval_status !== "PENDING_SUPERVISOR_APPROVAL") {
      throw new Error(`This price revision request has already been ${item.supervisor_approval_status.toLowerCase()}`);
    }

    if (decision === "APPROVED") {
      // 1. Update product price
      await connection.query(
        "UPDATE products SET unit_price = ?, updated_at = NOW() WHERE product_id = ?",
        [item.new_price, item.product_id]
      );

      // 2. Mark history approved
      await connection.query(
        `UPDATE product_price_history
         SET supervisor_approval_status = 'APPROVED',
             supervisor_id = ?,
             supervisor_comment = ?,
             approved_at = NOW()
         WHERE history_id = ?`,
        [supervisorId || 1, comment || "Approved by Supervisor", history_id]
      );

      // 3. Write to audit_log
      await connection.query(
        `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
         VALUES ('products', ?, 'UPDATE', ?, ?, ?, NOW())`,
        [
          String(item.product_id),
          JSON.stringify({ unit_price: item.old_price }),
          JSON.stringify({ unit_price: item.new_price, supervisor_approved: true, comment }),
          `supervisor_${supervisorId || 1}`,
        ]
      );
    } else {
      // REJECTED
      await connection.query(
        `UPDATE product_price_history
         SET supervisor_approval_status = 'REJECTED',
             supervisor_id = ?,
             supervisor_comment = ?,
             approved_at = NOW()
         WHERE history_id = ?`,
        [supervisorId || 1, comment || "Rejected by Supervisor", history_id]
      );
    }

    await connection.commit();
    return NextResponse.json({
      success: true,
      decision,
      message: decision === "APPROVED"
        ? `Price revision approved. Product unit price updated to Rs. ${item.new_price}.`
        : "Price revision rejected. Product original price retained."
    });
  } catch (err: any) {
    await connection.rollback();
    console.error("POST /api/catalog/price-approvals error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
