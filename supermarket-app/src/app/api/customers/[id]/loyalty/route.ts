import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export interface LoyaltyLedgerRow {
  loyalty_id: number;
  customer_id: number;
  sale_id: number | null;
  branch_id: number | null;
  branch_name: string | null;
  points: number;
  points_change: number;
  type: string;
  transaction_type: string;
  note: string | null;
  sale_total: number | string | null;
  created_at: string;
}

export interface TierHistoryRow {
  history_id: number;
  customer_id: number;
  old_tier: string;
  new_tier: string;
  changed_at: string;
  reason: string | null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = Number(id);

    if (!customerId) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const [transactions, tierHistory] = await Promise.all([
      query<LoyaltyLedgerRow & RowDataPacket>(
        `SELECT 
          lt.loyalty_id,
          lt.customer_id,
          lt.sale_id,
          lt.branch_id,
          COALESCE(b.name, CONCAT('Branch #', lt.branch_id)) AS branch_name,
          lt.points,
          CASE 
            WHEN lt.type = 'REDEEM' THEN -ABS(lt.points)
            ELSE ABS(lt.points)
          END AS points_change,
          lt.type,
          CASE 
            WHEN lt.type = 'EARN' THEN 'EARNED'
            WHEN lt.type = 'REDEEM' THEN 'REDEEMED'
            ELSE lt.type
          END AS transaction_type,
          lt.note,
          lt.created_at,
          s.total_amount AS sale_total
        FROM loyalty_transactions lt
        LEFT JOIN branches b ON lt.branch_id = b.branch_id
        LEFT JOIN sales s ON lt.sale_id = s.sale_id
        WHERE lt.customer_id = ?
        ORDER BY lt.created_at DESC, lt.loyalty_id DESC`,
        [customerId]
      ),
      query<TierHistoryRow & RowDataPacket>(
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
        [customerId]
      )
    ]);

    return NextResponse.json({
      success: true,
      transactions,
      tierHistory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/customers/[id]/loyalty error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
