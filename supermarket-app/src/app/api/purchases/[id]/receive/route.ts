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

    await connection.beginTransaction();

    const { items: receivedItems, expiry_date: globalExpiryDate } = body;
    const defaultExpiry =
      globalExpiryDate ||
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +60 days fallback

    let anyDiscrepancy = false;
    const discrepancies: any[] = [];

    // Process each line item with its own batch number, expiry date, and actual received qty
    for (const item of items) {
      const customItem = Array.isArray(receivedItems)
        ? receivedItems.find(
            (r: any) =>
              Number(r.po_item_id) === Number(item.po_item_id) ||
              Number(r.product_id) === Number(item.product_id)
          )
        : null;

      const receivedQty =
        customItem && customItem.received_quantity !== undefined && customItem.received_quantity !== ""
          ? Math.max(0, Number(customItem.received_quantity))
          : Number(item.quantity);

      const itemExpiry =
        (customItem && customItem.expiry_date) || defaultExpiry;

      const itemBatchNo =
        customItem && customItem.batch_no && customItem.batch_no.trim()
          ? customItem.batch_no.trim()
          : `BATCH-${po.po_number || po.po_id}-${item.po_item_id}`;

      // Update actual received quantity on the PO line item
      try {
        await connection.query(
          "UPDATE purchase_order_items SET received_quantity = ? WHERE po_item_id = ?",
          [receivedQty, item.po_item_id]
        );
      } catch (err: any) {
        console.warn("Could not update received_quantity column:", err.message);
      }

      // Add to inventory on-hand stock based on actual received quantity
      await connection.query(
        `UPDATE inventory 
         SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW()
         WHERE branch_id = ? AND product_id = ?`,
        [receivedQty, po.branch_id, item.product_id]
      );

      // Create FIFO product batch if quantity was received
      if (receivedQty > 0) {
        await connection.query(
          `INSERT INTO product_batches (product_id, branch_id, batch_no, quantity, received_date, expiry_date)
           VALUES (?, ?, ?, ?, CURDATE(), ?)`,
          [item.product_id, po.branch_id, itemBatchNo, receivedQty, itemExpiry]
        );
      }

      // Track discrepancy if supplier delivered less or more than ordered
      if (receivedQty !== Number(item.quantity)) {
        anyDiscrepancy = true;
        discrepancies.push({
          po_item_id: item.po_item_id,
          product_id: item.product_id,
          ordered_qty: Number(item.quantity),
          received_qty: receivedQty,
          difference: receivedQty - Number(item.quantity),
        });
      }
    }

    // Update purchase order header status to RECEIVED
    await connection.query(
      "UPDATE purchase_orders SET status = 'RECEIVED', received_date = CURRENT_DATE WHERE po_id = ?",
      [id]
    );

    // Record Audit Log with discrepancy details
    await connection.query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('purchase_orders', ?, 'UPDATE', ?, ?, NOW())`,
      [
        String(id),
        JSON.stringify({
          status: "RECEIVED",
          items_count: items.length,
          has_discrepancy: anyDiscrepancy,
          discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        }),
        `employee_${received_by}`,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      has_discrepancy: anyDiscrepancy,
      message: `Purchase order ${po.po_number || id} received successfully. Stock and batches registered.`,
    });
  } catch (err: any) {
    console.error("POST /api/purchases/[id]/receive error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
}
