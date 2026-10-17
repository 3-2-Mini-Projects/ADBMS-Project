import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ADBMS Stock Clerk View: vw_purchase_order_details
    const items = await query(
      `SELECT * FROM vw_purchase_order_details WHERE po_id = ? ORDER BY product_name ASC`,
      [id]
    );

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("GET /api/purchases/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["DRAFT", "SENT", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    await query(`UPDATE purchase_orders SET status = ? WHERE po_id = ?`, [status, id]);
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("PATCH /api/purchases/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
