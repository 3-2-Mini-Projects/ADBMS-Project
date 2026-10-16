import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await query(
      `SELECT 
        h.history_id,
        h.product_id,
        p.name AS product_name,
        h.old_price,
        h.new_price,
        h.changed_by,
        e.full_name AS changer_name,
        h.changed_at,
        h.reason
       FROM product_price_history h
       JOIN products p ON h.product_id = p.product_id
       LEFT JOIN employees e ON h.changed_by = e.employee_id
       WHERE h.product_id = ?
       ORDER BY h.changed_at DESC`,
      [id]
    );

    return NextResponse.json(history);
  } catch (err: any) {
    console.error("GET /api/products/[id]/price-history error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
