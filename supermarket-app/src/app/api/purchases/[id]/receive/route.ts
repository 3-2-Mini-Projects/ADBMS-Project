import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { received_by } = body;

    // Call ADBMS Stock Clerk Stored Procedure: sp_receive_purchase_order
    await query("CALL sp_receive_purchase_order(?)", [id]);

    // Audit log
    await query(
      `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
       VALUES ('purchase_orders', ?, 'UPDATE', ?, ?, NOW())`,
      [
        String(id),
        JSON.stringify({ status: "RECEIVED" }),
        `employee_${received_by || 1}`,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Purchase order received and inventory updated via sp_receive_purchase_order",
    });
  } catch (err: any) {
    console.error("POST /api/purchases/[id]/receive error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
