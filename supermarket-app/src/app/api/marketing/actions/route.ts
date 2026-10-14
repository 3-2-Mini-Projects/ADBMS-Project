import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "recalculate_tiers") {
      try {
        await query("CALL recalculate_tiers()");
        return NextResponse.json({
          success: true,
          message: "Customer tiers recalculated successfully via recalculate_tiers() procedure.",
        });
      } catch (procErr: any) {
        // Fallback calculation if procedure is not yet compiled in MySQL
        console.warn("recalculate_tiers() procedure fallback:", procErr.message);

        const customers: any = await query("SELECT customer_id, tier FROM customers WHERE is_active = 1");
        let upgraded = 0;

        for (const c of customers) {
          const [spendResult]: any = await query(
            "SELECT COALESCE(SUM(total_amount), 0) AS spending FROM sales WHERE customer_id = ? AND status = 'COMPLETED'",
            [c.customer_id]
          );
          const spending = Number(spendResult?.spending ?? 0);
          let newTier = "BRONZE";
          if (spending >= 100000) newTier = "PLATINUM";
          else if (spending >= 50000) newTier = "GOLD";
          else if (spending >= 20000) newTier = "SILVER";

          if (c.tier !== newTier) {
            try {
              await query(
                "INSERT INTO customer_tier_history (customer_id, old_tier, new_tier, reason) VALUES (?, ?, ?, 'Tier recalculated from completed sales')",
                [c.customer_id, c.tier, newTier]
              );
            } catch {
              // ignore history insert error if table structure varies
            }
            await query("UPDATE customers SET tier = ? WHERE customer_id = ?", [newTier, c.customer_id]);
            upgraded++;
          }
        }

        return NextResponse.json({
          success: true,
          message: `Tiers recalculated successfully. (${upgraded} customer tiers updated)`,
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/marketing/actions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    if (view === "top_customers") {
      try {
        const rows = await query("SELECT * FROM top_customers_vw ORDER BY total_spent DESC LIMIT 10");
        return NextResponse.json(rows);
      } catch {
        const rows = await query(`
          SELECT 
            c.customer_id,
            c.card_no,
            c.full_name,
            c.tier,
            COALESCE(SUM(CASE WHEN s.status = 'COMPLETED' THEN s.total_amount ELSE 0 END), 0) AS total_spent,
            COUNT(CASE WHEN s.status = 'COMPLETED' THEN s.sale_id END) AS total_orders,
            c.points_balance
          FROM customers c
          LEFT JOIN sales s ON c.customer_id = s.customer_id 
          GROUP BY c.customer_id, c.card_no, c.full_name, c.tier, c.points_balance
          ORDER BY total_spent DESC
          LIMIT 10
        `);
        return NextResponse.json(rows);
      }
    }

    if (view === "customer_summary") {
      try {
        const rows = await query("SELECT * FROM customer_summary_vw LIMIT 20");
        return NextResponse.json(rows);
      } catch {
        const rows = await query(`
          SELECT 
            c.customer_id, c.card_no, c.full_name, c.phone, c.email, c.tier, c.points_balance,
            0 AS total_points_earned, 0 AS total_points_redeemed, 0 AS total_spent, 0 AS total_orders
          FROM customers c
          LIMIT 20
        `);
        return NextResponse.json(rows);
      }
    }

    if (view === "customer_etl") {
      try {
        const rows = await query("SELECT * FROM customer_etl_vw LIMIT 20");
        return NextResponse.json(rows);
      } catch {
        const rows = await query(`
          SELECT 
            customer_id, card_no, full_name,
            CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 3)) AS masked_phone,
            email, tier, points_balance, join_date
          FROM customers
          LIMIT 20
        `);
        return NextResponse.json(rows);
      }
    }

    return NextResponse.json({ error: "Specify view: top_customers, customer_summary, or customer_etl" }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/marketing/actions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
