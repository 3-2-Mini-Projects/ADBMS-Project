import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("saleId");

    let sql = `
      SELECT 
        r.return_id,
        r.sale_item_id,
        si.sale_id,
        si.product_id,
        p.name AS product_name,
        p.barcode,
        si.unit_price,
        r.quantity,
        r.reason,
        r.refund_amount,
        r.processed_by,
        e.full_name AS processor_name,
        r.return_date,
        s.branch_id,
        b.name AS branch_name
      FROM returns r
      JOIN sale_items si ON r.sale_item_id = si.sale_item_id
      JOIN sales s ON si.sale_id = s.sale_id
      JOIN branches b ON s.branch_id = b.branch_id
      JOIN products p ON si.product_id = p.product_id
      LEFT JOIN employees e ON r.processed_by = e.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (saleId) {
      sql += ` AND si.sale_id = ?`;
      params.push(saleId);
    }

    sql += ` ORDER BY r.return_date DESC LIMIT 100`;

    const returns = await query(sql, params);
    return NextResponse.json(returns);
  } catch (err: any) {
    console.error("GET /api/returns error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const { sale_item_id, quantity, reason, processed_by, restock } = body;

    if (!sale_item_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Valid sale_item_id and quantity are required" }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Get original sale item and branch
    const [itemRows]: any = await connection.query(
      `SELECT si.sale_item_id, si.sale_id, si.product_id, si.quantity, si.unit_price, s.branch_id, s.status
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.sale_id
       WHERE si.sale_item_id = ? FOR UPDATE`,
      [sale_item_id]
    );

    if (itemRows.length === 0) {
      throw new Error("Sale item not found");
    }

    const item = itemRows[0];
    if (item.status !== "COMPLETED") {
      throw new Error("Cannot return items from uncompleted sales");
    }

    // 2. Check previous returns on this item
    const [priorReturns]: any = await connection.query(
      "SELECT COALESCE(SUM(quantity), 0) AS total_returned FROM returns WHERE sale_item_id = ?",
      [sale_item_id]
    );

    const alreadyReturned = Number(priorReturns[0].total_returned);
    const returnable = item.quantity - alreadyReturned;

    if (quantity > returnable) {
      throw new Error(`Cannot return ${quantity} units. Only ${returnable} units remaining returnable.`);
    }

    const refundAmount = Number(item.unit_price) * quantity;

    // 3. Insert return
    const [retRes]: any = await connection.query(
      `INSERT INTO returns (sale_item_id, quantity, reason, refund_amount, processed_by, return_date)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [sale_item_id, quantity, reason || "Customer return", refundAmount.toFixed(2), processed_by || 1]
    );

    // 4. Optionally restock into inventory if sellable
    if (restock !== false) {
      await connection.query(
        `UPDATE inventory 
         SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW()
         WHERE branch_id = ? AND product_id = ?`,
        [quantity, item.branch_id, item.product_id]
      );
    }

    // 5. Audit log
    await connection.query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('returns', ?, 'INSERT', ?, ?, NOW())`,
      [
        String(retRes.insertId),
        JSON.stringify({
          sale_item_id,
          quantity,
          refund_amount: refundAmount,
          restocked: restock !== false,
        }),
        `employee_${processed_by || 1}`,
      ]
    );

    await connection.commit();
    return NextResponse.json({
      success: true,
      return_id: retRes.insertId,
      refund_amount: refundAmount,
    });
  } catch (err: any) {
    await connection.rollback();
    console.error("POST /api/returns error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
}
