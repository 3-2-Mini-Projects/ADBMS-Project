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
