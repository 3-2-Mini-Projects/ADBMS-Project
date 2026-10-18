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

    await connection.beginTransaction();

    // 2. Validate Purchase Order
    const [poRows]: any = await connection.query(
      "SELECT po_id, po_number, branch_id, status FROM purchase_orders WHERE po_id = ? FOR UPDATE",
      [id]
    );

    if (!poRows || poRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const po = poRows[0];
    if (po.status === "RECEIVED") {
      await connection.rollback();
      return NextResponse.json({ error: "Purchase order has already been received" }, { status: 400 });
    }

    if (po.status === "CANCELLED") {
      await connection.rollback();
      return NextResponse.json({ error: "Cannot receive a cancelled purchase order" }, { status: 400 });
    }

    if (!["SENT", "PENDING"].includes(po.status)) {
      await connection.rollback();
      return NextResponse.json({ error: "Only SENT or PENDING orders can be received" }, { status: 400 });
    }

    if (session.role !== "ADMIN" && po.branch_id !== session.branch_id) {
      await connection.rollback();
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
      await connection.rollback();
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

    const { items: receivedItems, expiry_date: globalExpiryDate } = body;
    const defaultExpiry =
      globalExpiryDate ||
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +60 days fallback

    let anyDiscrepancy = false;
    let totalClaimAmount = 0;
    const discrepancies: any[] = [];

    // Process each line item with its own batch number, expiry date, good received qty, and damaged qty
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

      const damagedQty =
        customItem && customItem.damaged_quantity !== undefined && customItem.damaged_quantity !== ""
          ? Math.max(0, Number(customItem.damaged_quantity))
          : 0;

      if (!Number.isInteger(receivedQty) || !Number.isInteger(damagedQty) ||
          receivedQty < 0 || damagedQty < 0 || receivedQty + damagedQty > Number(item.quantity)) {
        throw new Error(`Invalid quantities for purchase-order item ${item.po_item_id}: received plus damaged cannot exceed ordered quantity.`);
      }

      const discrepancyReason =
        customItem && customItem.discrepancy_reason
          ? customItem.discrepancy_reason
          : (damagedQty > 0 ? "DAMAGED_IN_TRANSIT" : "NONE");

      const discrepancyNotes =
        customItem && customItem.discrepancy_notes
          ? String(customItem.discrepancy_notes).trim()
          : null;

      const orderedQty = Number(item.quantity);
      const totalAccountedFor = receivedQty + damagedQty;
      const shortageQty = Math.max(0, orderedQty - totalAccountedFor);
      const itemUnitCost = Number(item.unit_cost || 0);
      const claimAmount = (damagedQty + shortageQty) * itemUnitCost;

      const itemExpiry =
        (customItem && customItem.expiry_date) || defaultExpiry;

      const itemBatchNo =
        customItem && customItem.batch_no && customItem.batch_no.trim()
          ? customItem.batch_no.trim()
          : `BATCH-${po.po_number || po.po_id}-${item.po_item_id}`;

      // Update actual received quantity, damaged qty, shortage qty, and reason on the PO line item
      try {
        await connection.query(
          `UPDATE purchase_order_items 
           SET received_quantity = ?, 
               damaged_quantity = ?, 
               shortage_quantity = ?, 
               discrepancy_reason = ?, 
               discrepancy_notes = ? 
           WHERE po_item_id = ?`,
          [
            receivedQty,
            damagedQty,
            shortageQty,
            discrepancyReason,
            discrepancyNotes,
            item.po_item_id,
          ]
        );
      } catch (err: any) {
        console.warn("Could not update purchase_order_items discrepancy fields:", err.message);
      }

      // Add to inventory on-hand stock based ONLY on actual good, usable received quantity
      // Damaged items are rejected at the dock and NOT added to supermarket stock
      await connection.query(
        `UPDATE inventory 
         SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW()
         WHERE branch_id = ? AND product_id = ?`,
        [receivedQty, po.branch_id, item.product_id]
      );

      // Create FIFO product batch if usable quantity was received
      if (receivedQty > 0) {
        await connection.query(
          `INSERT INTO product_batches (product_id, branch_id, batch_no, quantity, received_date, expiry_date)
           VALUES (?, ?, ?, ?, CURDATE(), ?)`,
          [item.product_id, po.branch_id, itemBatchNo, receivedQty, itemExpiry]
        );
      }

      // Track discrepancy if damaged goods exist or supplier delivered short/excess
      if (damagedQty > 0 || shortageQty > 0 || receivedQty !== orderedQty) {
        anyDiscrepancy = true;
        totalClaimAmount += claimAmount;
        discrepancies.push({
          po_item_id: item.po_item_id,
          product_id: item.product_id,
          ordered_qty: orderedQty,
          received_qty: receivedQty,
          damaged_qty: damagedQty,
          shortage_qty: shortageQty,
          discrepancy_reason: discrepancyReason,
          discrepancy_notes: discrepancyNotes,
          unit_cost: itemUnitCost,
          claim_amount: claimAmount,
        });
      }
    }

    // Update purchase order header status to RECEIVED
    await connection.query(
      "UPDATE purchase_orders SET status = 'RECEIVED', received_date = CURRENT_DATE WHERE po_id = ?",
      [id]
    );

    // Record Audit Log with complete discrepancy breakdown and financial claim
    await connection.query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('purchase_orders', ?, 'UPDATE', ?, ?, NOW())`,
      [
        String(id),
        JSON.stringify({
          action_type: anyDiscrepancy ? "RECEIVE_DISCREPANCY" : "RECEIVE_ORDER",
          status: "RECEIVED",
          items_count: items.length,
          has_discrepancy: anyDiscrepancy,
          total_claim_amount: totalClaimAmount,
          discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        }),
        `employee_${received_by}`,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      has_discrepancy: anyDiscrepancy,
      total_claim_amount: totalClaimAmount,
      discrepancies,
      message: `Purchase order ${po.po_number || id} received successfully. Stock and batches registered.`,
    });
  } catch (err: any) {
    try {
      await connection.rollback();
    } catch {
      // ignore rollback error
    }
    console.error("POST /api/purchases/[id]/receive error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
}
