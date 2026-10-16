import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest("receive_purchases").catch(() => null);
  const connection = await pool.getConnection();

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { expiry_date } = body;
    const received_by = auth?.session?.employee_id || body.received_by || 1;

    await connection.beginTransaction();

    const [poRows]: any = await connection.query(
      "SELECT po_id, po_number, branch_id, status FROM purchase_orders WHERE po_id = ? FOR UPDATE",
      [id]
    );

    if (!poRows || poRows.length === 0) {
      throw new Error("Purchase order not found");
    }

    const po = poRows[0];
    if (po.status === "RECEIVED") {
      throw new Error("Purchase order has already been received");
    }

    if (auth?.session && auth.session.role !== "ADMIN" && po.branch_id !== auth.session.branch_id) {
      throw new Error("Forbidden: Cross-branch order receiving is not permitted");
    }

    // Get all items in this PO
    const [items]: any = await connection.query(
      "SELECT po_item_id, product_id, quantity, unit_cost FROM purchase_order_items WHERE po_id = ?",
      [id]
    );

    const defaultExpiry =
      expiry_date ||
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +60 days

    for (const item of items) {
      // 1. Update inventory
      await connection.query(
        `INSERT INTO inventory (branch_id, product_id, quantity_on_hand, reserved_qty, reorder_level, last_updated)
         VALUES (?, ?, ?, 0, 10, NOW())
         ON DUPLICATE KEY UPDATE 
         quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand),
         last_updated = NOW()`,
        [po.branch_id, item.product_id, item.quantity]
      );

      // 2. Add product batch
      const batchNo = `BATCH-${po.po_number}-${item.po_item_id}`;
      await connection.query(
        `INSERT INTO product_batches (product_id, branch_id, batch_no, quantity, received_date, expiry_date)
         VALUES (?, ?, ?, ?, CURDATE(), ?)`,
        [item.product_id, po.branch_id, batchNo, item.quantity, defaultExpiry]
      );
    }

    // 3. Update PO status
    await connection.query(
      "UPDATE purchase_orders SET status = 'RECEIVED', received_date = CURRENT_DATE WHERE po_id = ?",
      [id]
    );

    // 4. Audit log
    await connection.query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('purchase_orders', ?, 'UPDATE', ?, ?, NOW())`,
      [
        String(id),
        JSON.stringify({ status: "RECEIVED", items_count: items.length }),
        `employee_${received_by}`,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Purchase order ${po.po_number} received successfully. Stock and batches updated.`,
    });
  } catch (err: any) {
    await connection.rollback().catch(() => {});
    console.error("POST /api/purchases/[id]/receive error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
}
