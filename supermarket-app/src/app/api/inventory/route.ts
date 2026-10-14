import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
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
        stock_status
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
  try {
    const body = await req.json();
    const { inventory_id, branch_id, product_id, quantity_change, new_quantity, reorder_level, reason, changed_by } = body;

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

    if (new_quantity !== undefined) {
      await query(
        "UPDATE inventory SET quantity_on_hand = ?, last_updated = NOW() WHERE inventory_id = ?",
        [new_quantity, invId]
      );
    } else if (quantity_change !== undefined && Number(quantity_change) !== 0) {
      if (Number(quantity_change) > 0 && branch_id && product_id) {
        // ADBMS Stock Clerk Stored Procedure: sp_update_inventory
        await query("CALL sp_update_inventory(?, ?, ?)", [branch_id, product_id, Number(quantity_change)]);
      } else {
        await query(
          "UPDATE inventory SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW() WHERE inventory_id = ?",
          [quantity_change, invId]
        );
      }
    }

    if (reorder_level !== undefined) {
      await query(
        "UPDATE inventory SET reorder_level = ?, last_updated = NOW() WHERE inventory_id = ?",
        [reorder_level, invId]
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
        `employee_${changed_by || 1}`,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/inventory error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
