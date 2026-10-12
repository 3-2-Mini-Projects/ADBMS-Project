import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transactions = await query(
      `SELECT 
        lt.loyalty_id,
        lt.customer_id,
        lt.sale_id,
        lt.points_change,
        lt.transaction_type,
        lt.created_at
       FROM loyalty_transactions lt
       WHERE lt.customer_id = ?
       ORDER BY lt.created_at DESC`,
      [id]
    );

    const tierHistory = await query(
      `SELECT 
        th.history_id,
        th.customer_id,
        th.old_tier,
        th.new_tier,
        th.changed_at,
        th.reason
       FROM customer_tier_history th
       WHERE th.customer_id = ?
       ORDER BY th.changed_at DESC`,
      [id]
    );

    return NextResponse.json({
      transactions,
      tierHistory,
    });
  } catch (err: any) {
    console.error("GET /api/customers/[id]/loyalty error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
