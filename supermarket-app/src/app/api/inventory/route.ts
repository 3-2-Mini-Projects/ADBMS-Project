import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const lowStock = searchParams.get("lowStock") === "true";
    const search = searchParams.get("search");

    let sql = `
      SELECT 
        i.inventory_id,
        i.branch_id,
        b.name AS branch_name,
        i.product_id,
        p.barcode,
        p.name AS product_name,
        p.brand,
        c.name AS category_name,
        i.quantity_on_hand,
        i.reserved_qty,
        i.reorder_level,
        p.unit_price,
        p.cost_price,
        i.last_updated,
        CASE
          WHEN i.quantity_on_hand <= 0 THEN 'OUT_OF_STOCK'
          WHEN i.quantity_on_hand <= i.reorder_level THEN 'LOW_STOCK'
          ELSE 'NORMAL'
        END AS stock_status
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      JOIN branches b ON i.branch_id = b.branch_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND i.branch_id = ?`;
      params.push(branchId);
    }

    if (lowStock) {
      sql += ` AND i.quantity_on_hand <= i.reorder_level`;
    }

    if (search) {
      sql += ` AND (p.barcode = ? OR p.name LIKE ? OR p.brand LIKE ?)`;
      params.push(search, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY stock_status DESC, p.name ASC`;

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

    if (new_quantity !== undefined) {
      await query(
        "UPDATE inventory SET quantity_on_hand = ?, last_updated = NOW() WHERE inventory_id = ?",
        [new_quantity, invId]
      );
    } else if (quantity_change !== undefined) {
      await query(
        "UPDATE inventory SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW() WHERE inventory_id = ?",
        [quantity_change, invId]
      );
    }

    if (reorder_level !== undefined) {
      await query(
        "UPDATE inventory SET reorder_level = ?, last_updated = NOW() WHERE inventory_id = ?",
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
