import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await authorizeRequest("receive_purchases");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const branchIdParam = searchParams.get("branchId");
    const branchId = session.role === "ADMIN" ? branchIdParam : String(session.branch_id);
    const status = searchParams.get("status");

    // ADBMS Stock Clerk View: vw_purchase_order_summary
    let sql = `
      SELECT 
        po_id,
        po_number,
        supplier_id,
        supplier_name,
        branch_id,
        branch_name,
        order_date,
        expected_date,
        received_date,
        status,
        total_cost,
        created_by,
        creator_name,
        items_count,
        total_ordered_qty,
        calculated_total_cost
      FROM vw_purchase_order_summary
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND branch_id = ?`;
      params.push(branchId);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY po_id DESC`;

    const orders = await query(sql, params);
    return NextResponse.json(orders);
  } catch (err: any) {
    console.error("GET /api/purchases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("receive_purchases");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const { supplier_id, branch_id: reqBranchId, expected_date, items } = body;
    const branch_id = session.role === "ADMIN" ? (reqBranchId || session.branch_id) : session.branch_id;
    const created_by = session.employee_id;
    if (!supplier_id || !branch_id || !items || items.length === 0) {
      return NextResponse.json({ error: "Supplier, Branch, and items are required" }, { status: 400 });
    }

    await connection.beginTransaction();

    let totalCost = 0;

    for (const item of items) {
      totalCost += Number(item.quantity) * Number(item.unit_cost);
    }

    const initialStatus = body.status === "DRAFT" ? "DRAFT" : "SENT";

    const [poRes]: any = await connection.query(
      `INSERT INTO purchase_orders (supplier_id, branch_id, order_date, expected_date, status, total_cost, created_by)
       VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
      [supplier_id, branch_id, expected_date || null, initialStatus, totalCost.toFixed(2), created_by || 1]
    );

    const poId = poRes.insertId;
    const poNumber = `PO-${String(poId).padStart(5, '0')}`;

    await connection.query(
      `UPDATE purchase_orders SET po_number = ? WHERE po_id = ?`,
      [poNumber, poId]
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost)
         VALUES (?, ?, ?, ?)`,
        [poId, item.product_id, item.quantity, item.unit_cost]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, po_id: poId, po_number: poNumber });
  } catch (err: any) {
    await connection.rollback();
    console.error("POST /api/purchases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
