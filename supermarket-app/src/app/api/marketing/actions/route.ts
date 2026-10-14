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

    if (action === "add_points") {
      const { customer_id, points, sale_id, note } = body;
      const parsedPoints = parseInt(points, 10);
      if (!customer_id || !parsedPoints || parsedPoints <= 0) {
        return NextResponse.json({ error: "Customer ID and positive points amount are required" }, { status: 400 });
      }

      try {
        await query("CALL add_ltpoints(?, ?, ?, ?)", [
          customer_id,
          parsedPoints,
          sale_id || null,
          note || "Points awarded by Marketing Manager",
        ]);
        return NextResponse.json({
          success: true,
          message: `Successfully awarded ${parsedPoints} points using add_ltpoints() procedure.`,
        });
      } catch (procErr: any) {
        console.warn("add_ltpoints procedure fallback:", procErr.message);
        await query("UPDATE customers SET points_balance = points_balance + ? WHERE customer_id = ?", [
          parsedPoints,
          customer_id,
        ]);
        await query(
          "INSERT INTO loyalty_transactions (customer_id, sale_id, points_change, transaction_type, created_at) VALUES (?, ?, ?, 'EARNED', NOW())",
          [customer_id, sale_id || null, parsedPoints]
        );
        return NextResponse.json({
          success: true,
          message: `Successfully awarded ${parsedPoints} points to customer.`,
        });
      }
    }

    if (action === "redeem_points") {
      const { customer_id, points, sale_id } = body;
      const parsedPoints = parseInt(points, 10);
      if (!customer_id || !parsedPoints || parsedPoints <= 0) {
        return NextResponse.json({ error: "Customer ID and positive points amount are required" }, { status: 400 });
      }

      try {
        await query("CALL redeem_points(?, ?, ?)", [
          customer_id,
          parsedPoints,
          sale_id || null,
        ]);
        return NextResponse.json({
          success: true,
          message: `Successfully redeemed ${parsedPoints} points using redeem_points() procedure.`,
        });
      } catch (procErr: any) {
        console.warn("redeem_points procedure fallback:", procErr.message);
        const [cust]: any = await query("SELECT points_balance FROM customers WHERE customer_id = ?", [customer_id]);
        if (!cust || cust.points_balance < parsedPoints) {
          return NextResponse.json({ error: "Customer has insufficient points balance" }, { status: 400 });
        }
        await query("UPDATE customers SET points_balance = points_balance - ? WHERE customer_id = ?", [
          parsedPoints,
          customer_id,
        ]);
        await query(
          "INSERT INTO loyalty_transactions (customer_id, sale_id, points_change, transaction_type, created_at) VALUES (?, ?, ?, 'REDEEMED', NOW())",
          [customer_id, sale_id || null, -parsedPoints]
        );
        return NextResponse.json({
          success: true,
          message: `Successfully redeemed ${parsedPoints} points from customer.`,
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
        const rows = await query("SELECT * FROM customer_summary_vw ORDER BY points_balance DESC LIMIT 100");
        return NextResponse.json(rows);
      } catch {
        const rows = await query(`
          SELECT 
            c.customer_id, c.card_no, c.full_name, c.phone, c.email, c.tier, c.points_balance,
            COALESCE(lt_agg.total_points_earned, 0) AS total_points_earned,
            COALESCE(lt_agg.total_points_redeemed, 0) AS total_points_redeemed,
            COALESCE(s.total_spent, 0) AS total_spent,
            COALESCE(s.total_orders, 0) AS total_orders
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              SUM(CASE WHEN transaction_type = 'EARNED' THEN points_change ELSE 0 END) AS total_points_earned,
              SUM(CASE WHEN transaction_type = 'REDEEMED' THEN ABS(points_change) ELSE 0 END) AS total_points_redeemed
            FROM loyalty_transactions
            GROUP BY customer_id
          ) lt_agg ON c.customer_id = lt_agg.customer_id
          LEFT JOIN (
            SELECT customer_id, SUM(total_amount) AS total_spent, COUNT(sale_id) AS total_orders
            FROM sales
            WHERE status = 'COMPLETED' AND customer_id IS NOT NULL
            GROUP BY customer_id
          ) s ON c.customer_id = s.customer_id
          WHERE c.is_active = 1
          ORDER BY c.points_balance DESC, c.full_name ASC
          LIMIT 100
        `);
        return NextResponse.json(rows);
      }
    }

    if (view === "ledger") {
      try {
        const rows = await query(`
          SELECT 
            lt.loyalty_id,
            lt.customer_id,
            c.full_name AS customer_name,
            c.card_no,
            c.tier,
            lt.sale_id,
            lt.points_change,
            lt.transaction_type,
            lt.created_at
          FROM loyalty_transactions lt
          JOIN customers c ON lt.customer_id = c.customer_id
          ORDER BY lt.created_at DESC
          LIMIT 100
        `);
        return NextResponse.json(rows);
      } catch (err: any) {
        return NextResponse.json([]);
      }
    }

    if (view === "customer_etl") {
      try {
        const rows = await query("SELECT * FROM customer_etl_vw LIMIT 50");
        return NextResponse.json(rows);
      } catch {
        const rows = await query(`
          SELECT 
            customer_id, card_no, full_name,
            CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 3)) AS masked_phone,
            email, tier, points_balance, join_date
          FROM customers
          WHERE is_active = 1
          LIMIT 50
        `);
        return NextResponse.json(rows);
      }
    }

    return NextResponse.json({ error: "Specify view: top_customers, customer_summary, ledger, or customer_etl" }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/marketing/actions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
