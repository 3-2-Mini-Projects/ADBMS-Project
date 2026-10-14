import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");

    let sql = `
      SELECT 
        po.po_id,
        po.po_number,
        po.supplier_id,
        s.name AS supplier_name,
        po.branch_id,
        b.name AS branch_name,
        po.order_date,
        po.expected_date,
        po.status,
        po.total_cost,
        po.created_by,
        e.full_name AS creator_name,
        COUNT(poi.po_item_id) AS items_count
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      JOIN branches b ON po.branch_id = b.branch_id
      LEFT JOIN employees e ON po.created_by = e.employee_id
      LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND po.branch_id = ?`;
      params.push(branchId);
    }

    if (status) {
      sql += ` AND po.status = ?`;
      params.push(status);
    }

    sql += ` GROUP BY po.po_id, po.po_number, po.supplier_id, s.name, po.branch_id, b.name, po.order_date, po.expected_date, po.status, po.total_cost, po.created_by, e.full_name`;
    sql += ` ORDER BY po.po_id DESC`;

    const orders = await query(sql, params);
    return NextResponse.json(orders);
  } catch (err: any) {
    console.error("GET /api/purchases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const { supplier_id, branch_id, expected_date, created_by, items } = body;

    if (!supplier_id || !branch_id || !items || items.length === 0) {
      return NextResponse.json({ error: "Supplier, Branch, and items are required" }, { status: 400 });
    }

    await connection.beginTransaction();

    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    let totalCost = 0;

    for (const item of items) {
      totalCost += Number(item.quantity) * Number(item.unit_cost);
    }

    const [poRes]: any = await connection.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, branch_id, order_date, expected_date, status, total_cost, created_by)
       VALUES (?, ?, ?, NOW(), ?, 'PENDING', ?, ?)`,
      [poNumber, supplier_id, branch_id, expected_date || null, totalCost.toFixed(2), created_by || 1]
    );

    const poId = poRes.insertId;

    for (const item of items) {
      const lineTotal = Number(item.quantity) * Number(item.unit_cost);
      await connection.query(
        `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [poId, item.product_id, item.quantity, item.unit_cost, lineTotal.toFixed(2)]
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
