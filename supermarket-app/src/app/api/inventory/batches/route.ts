import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const productId = searchParams.get("productId");

    let sql = `
      SELECT 
        pb.batch_id,
        pb.product_id,
        p.name AS product_name,
        p.barcode,
        pb.branch_id,
        b.name AS branch_name,
        pb.batch_no,
        pb.quantity,
        pb.received_date,
        pb.expiry_date,
        DATEDIFF(pb.expiry_date, CURRENT_DATE) AS days_to_expiry,
        CASE
          WHEN pb.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN DATEDIFF(pb.expiry_date, CURRENT_DATE) <= 14 THEN 'NEAR_EXPIRY'
          ELSE 'GOOD'
        END AS expiry_status
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.product_id
      JOIN branches b ON pb.branch_id = b.branch_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND pb.branch_id = ?`;
      params.push(branchId);
    }

    if (productId) {
      sql += ` AND pb.product_id = ?`;
      params.push(productId);
    }

    sql += ` ORDER BY pb.expiry_date ASC, pb.quantity DESC`;

    const batches = await query(sql, params);
    return NextResponse.json(batches);
  } catch (err: any) {
    console.error("GET /api/inventory/batches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_id, branch_id, batch_no, quantity, received_date, expiry_date } = body;

    const result: any = await query(
      `INSERT INTO product_batches (product_id, branch_id, batch_no, quantity, received_date, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, branch_id, batch_no, quantity, received_date || new Date().toISOString().split("T")[0], expiry_date || null]
    );

    // Also increase inventory quantity_on_hand
    await query(
      `UPDATE inventory 
       SET quantity_on_hand = quantity_on_hand + ?, last_updated = NOW()
       WHERE branch_id = ? AND product_id = ?`,
      [quantity, branch_id, product_id]
    );

    return NextResponse.json({ success: true, batch_id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/inventory/batches error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
