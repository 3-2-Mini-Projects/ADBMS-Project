import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authorize Request
  const auth = await authorizeRequest("receive_purchases");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;
  const received_by = session.employee_id;

  const connection = await pool.getConnection();

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { expiry_date } = body;

    // 2. Validate Purchase Order
    const [poRows]: any = await connection.query(
      "SELECT po_id, po_number, branch_id, status FROM purchase_orders WHERE po_id = ?",
      [id]
    );

    if (!poRows || poRows.length === 0) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const po = poRows[0];
    if (po.status === "RECEIVED") {
      return NextResponse.json({ error: "Purchase order has already been received" }, { status: 400 });
    }

    if (po.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot receive a cancelled purchase order" }, { status: 400 });
    }

    if (session.role !== "ADMIN" && po.branch_id !== session.branch_id) {
      return NextResponse.json(
        { error: "Forbidden: Cross-branch order receiving is not permitted" },
        { status: 403 }
      );
    }

    // 3. Get Items
    const [items]: any = await connection.query(
      "SELECT po_item_id, product_id, quantity, unit_cost FROM purchase_order_items WHERE po_id = ?",
      [id]
    );

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Purchase order has no items to receive" }, { status: 400 });
    }

    // 4. Ensure inventory records exist before updating stock
    for (const item of items) {
      await connection.query(
        `INSERT IGNORE INTO inventory (branch_id, product_id, quantity_on_hand, reserved_qty, reorder_level, last_updated)
         VALUES (?, ?, 0, 0, 10, NOW())`,
        [po.branch_id, item.product_id]
      );
    }

    // 5. Call ADBMS Stock Clerk Stored Procedure: sp_receive_purchase_order
    // (Updates inventory stock and marks purchase_orders.status = 'RECEIVED')
    try {
      await connection.query("CALL sp_receive_purchase_order(?)", [id]);
    } catch (spErr: any) {
      console.warn("sp_receive_purchase_order warning/fallback:", spErr.message);
      // Fallback in case sp_receive_purchase_order is missing or schema differs
      await connection.query(
        `UPDATE inventory i
         JOIN purchase_order_items poi ON poi.product_id = i.product_id
         SET i.quantity_on_hand = i.quantity_on_hand + poi.quantity,
             i.last_updated = NOW()
         WHERE poi.po_id = ? AND i.branch_id = ?`,
        [id, po.branch_id]
      );
      await connection.query(
        "UPDATE purchase_orders SET status = 'RECEIVED', received_date = CURRENT_DATE WHERE po_id = ?",
        [id]
      );
    }

    // 6. Add product batches for batch tracking & expiry alerts
    const defaultExpiry =
      expiry_date ||
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +60 days

    for (const item of items) {
      const batchNo = `BATCH-${po.po_number}-${item.po_item_id}`;
      await connection.query(
        `INSERT INTO product_batches (product_id, branch_id, batch_no, quantity, received_date, expiry_date)
         VALUES (?, ?, ?, ?, CURDATE(), ?)`,
        [item.product_id, po.branch_id, batchNo, item.quantity, defaultExpiry]
      );
    }

    // 7. Record Audit Log
    await connection.query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('purchase_orders', ?, 'UPDATE', ?, ?, NOW())`,
      [
        String(id),
        JSON.stringify({ status: "RECEIVED", items_count: items.length }),
        `employee_${received_by}`,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Purchase order ${po.po_number} received successfully. Stock and batches updated.`,
    });
  } catch (err: any) {
    console.error("POST /api/purchases/[id]/receive error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
}
