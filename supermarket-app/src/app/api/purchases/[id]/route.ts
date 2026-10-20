import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest("receive_purchases");
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;

    // ADBMS Stock Clerk View: vw_purchase_order_details
    const items = await query(
      `SELECT * FROM vw_purchase_order_details
       WHERE po_id = ? AND (? = 'ADMIN' OR branch_id = ?)
       ORDER BY product_name ASC`,
      [id, session.role, session.branch_id]
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
  const auth = await authorizeRequest("receive_purchases");
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["DRAFT", "SENT", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    const result: any = await query(
      `UPDATE purchase_orders SET status = ? WHERE po_id = ?
       AND (? = 'ADMIN' OR branch_id = ?)`,
      [status, id, session.role, session.branch_id]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Purchase order not found or not accessible" }, { status: 404 });
    }
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("PATCH /api/purchases/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
