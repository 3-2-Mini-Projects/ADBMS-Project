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
    const branchId = session.role === "ADMIN" ? searchParams.get("branchId") : String(session.branch_id);
    const lowStock = searchParams.get("lowStock") === "true";
    const search = searchParams.get("search");

    // ADBMS Stock Clerk View: vw_branch_inventory
    let sql = `
      SELECT 
        inventory_id,
        branch_id,
        branch_name,
        product_id,
        barcode,
        product_name,
        brand,
        category_name,
        supplier_name,
        quantity_on_hand,
        reserved_qty,
        reorder_level,
        unit_price,
        cost_price,
        last_updated,
        stock_status,
        fn_product_sales_velocity(branch_id, product_id) AS sales_velocity,
        fn_suggested_reorder_qty(branch_id, product_id, 4, 1) AS suggested_reorder_qty
      FROM vw_branch_inventory
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND branch_id = ?`;
      params.push(branchId);
    }

    if (lowStock) {
      sql += ` AND stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')`;
    }

    if (search) {
      sql += ` AND (barcode = ? OR product_name LIKE ? OR brand LIKE ?)`;
      params.push(search, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY stock_status DESC, product_name ASC`;

    const inventory = await query(sql, params);
    return NextResponse.json(inventory);
  } catch (err: any) {
    console.error("GET /api/inventory error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeRequest("manage_inventory");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  try {
    const body = await req.json();
    const { inventory_id, branch_id: reqBranchId, product_id, quantity_change, new_quantity, reorder_level, reason } = body;
    const branch_id = session.role === "ADMIN" ? (reqBranchId || session.branch_id) : session.branch_id;
    const changed_by = `employee_${session.employee_id}`;

    if (!inventory_id && (!branch_id || !product_id)) {
      return NextResponse.json({ error: "inventory_id or branch_id and product_id required" }, { status: 400 });
    }

    let invId = inventory_id;
    if (!invId) {
      const existing: any = await query(
        "SELECT inventory_id FROM inventory WHERE branch_id = ? AND product_id = ?",
        [branch_id, product_id]
      );
      if (existing.length === 0) {
        return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
      }
      invId = existing[0].inventory_id;
    }

    const ownedRows: any = await query(
      "SELECT branch_id, quantity_on_hand FROM inventory WHERE inventory_id = ?",
      [invId]
    );
    if (ownedRows.length === 0) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
    }
    if (session.role !== "ADMIN" && Number(ownedRows[0].branch_id) !== Number(session.branch_id)) {
      return NextResponse.json({ error: "Forbidden: inventory belongs to another branch" }, { status: 403 });
    }
    if (new_quantity !== undefined &&
        (!Number.isInteger(Number(new_quantity)) || Number(new_quantity) < 0)) {
      return NextResponse.json({ error: "new_quantity must be a non-negative integer" }, { status: 400 });
    }
    if (reorder_level !== undefined &&
        (!Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0)) {
      return NextResponse.json({ error: "reorder_level must be a non-negative integer" }, { status: 400 });
    }
    if (quantity_change !== undefined &&
        (!Number.isInteger(Number(quantity_change)) ||
          Number(ownedRows[0].quantity_on_hand) + Number(quantity_change) < 0)) {
      return NextResponse.json({ error: "quantity_change must be an integer and cannot reduce stock below zero" }, { status: 400 });
    }

    if (new_quantity !== undefined) {
      await query(
        "UPDATE inventory SET quantity_on_hand = ?, last_updated = NOW() WHERE inventory_id = ? AND (? = 'ADMIN' OR branch_id = ?)",
        [new_quantity, invId, session.role, session.branch_id]
      );
    } else if (quantity_change !== undefined && Number(quantity_change) !== 0) {
      if (Number(quantity_change) > 0 && branch_id && product_id) {
        // ADBMS Stock Clerk Stored Procedure: sp_update_inventory
        await query("CALL sp_update_inventory(?, ?, ?)", [branch_id, product_id, Number(quantity_change)]);
      } else {
        await query(
          "UPDATE inventory SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW() WHERE inventory_id = ? AND (? = 'ADMIN' OR branch_id = ?)",
          [quantity_change, invId, session.role, session.branch_id]
        );
      }
    }

    if (reorder_level !== undefined) {
      await query(
        "UPDATE inventory SET reorder_level = ?, last_updated = NOW() WHERE inventory_id = ? AND (? = 'ADMIN' OR branch_id = ?)",
        [reorder_level, invId, session.role, session.branch_id]
      );
      // Keep product-level default reorder level synchronized
      await query(
        "UPDATE products p JOIN inventory i ON p.product_id = i.product_id SET p.reorder_level = ?, p.updated_at = NOW() WHERE i.inventory_id = ?",
        [reorder_level, invId]
      );
    }

    // Log to audit_log
    await query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('inventory', ?, 'UPDATE', ?, ?, NOW())`,
      [
        String(invId),
        JSON.stringify({ quantity_change, new_quantity, reorder_level, reason }),
        changed_by,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/inventory error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
