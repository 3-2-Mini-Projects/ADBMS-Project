import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";

// GET /api/customers/[id]/loyalty - Fetch complete point transactions and tier history
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
        lt.points,
        lt.points AS points_change,
        lt.type,
        lt.type AS transaction_type,
        lt.note,
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

// POST /api/customers/[id]/loyalty - Perform atomic loyalty point operations (EARN, REDEEM, ADJUST, EXPIRE)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = Number(id);
    const body = await req.json();
    const { type, points, sale_id, note } = body;

    if (!type || !["EARN", "REDEEM", "ADJUST", "EXPIRE"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type. Must be EARN, REDEEM, ADJUST, or EXPIRE." },
        { status: 400 }
      );
    }

    const numPoints = Number(points);
    if (isNaN(numPoints) || numPoints === 0) {
      return NextResponse.json(
        { error: "Valid non-zero points amount is required." },
        { status: 400 }
      );
    }

    // Execute atomic transaction
    const result = await withTransaction(async (conn) => {
      // 1. Fetch current customer with lock
      const [custRows]: any = await conn.query(
        `SELECT customer_id, card_no, full_name, tier, points_balance, is_active 
         FROM customers 
         WHERE customer_id = ? 
         FOR UPDATE`,
        [customerId]
      );

      if (!custRows || custRows.length === 0) {
        throw new Error("Customer not found");
      }

      const cust = custRows[0];
      if (!cust.is_active) {
        throw new Error("Cannot process loyalty points for an inactive customer");
      }

      let currentBal = Number(cust.points_balance || 0);
      let effectivePoints = numPoints;

      if (type === "REDEEM") {
        const redeemAmt = Math.abs(numPoints);
        if (currentBal < redeemAmt) {
          throw new Error(
            `Insufficient loyalty balance. Customer has ${currentBal} points available, cannot redeem ${redeemAmt} points.`
          );
        }
        effectivePoints = -redeemAmt;
      } else if (type === "EXPIRE") {
        const expireAmt = Math.abs(numPoints);
        if (currentBal < expireAmt) {
          throw new Error(
            `Cannot expire more points (${expireAmt}) than customer's current balance (${currentBal}).`
          );
        }
        effectivePoints = -expireAmt;
      } else if (type === "EARN") {
        effectivePoints = Math.abs(numPoints);
      } else if (type === "ADJUST") {
        if (numPoints < 0 && currentBal < Math.abs(numPoints)) {
          throw new Error(
            `Adjustment would result in negative points balance (${currentBal + numPoints}). Points balance must never be negative.`
          );
        }
        effectivePoints = numPoints;
      }

      const newBal = currentBal + effectivePoints;

      let branchId = body.branch_id ? Number(body.branch_id) : null;
      if (!branchId && sale_id) {
        const [saleRow]: any = await conn.query(`SELECT branch_id FROM sales WHERE sale_id = ?`, [Number(sale_id)]);
        if (saleRow && saleRow.length > 0) branchId = saleRow[0].branch_id;
      }
      if (!branchId) branchId = 1;

      // 2. Insert transaction history record
      const [insertRes]: any = await conn.query(
        `INSERT INTO loyalty_transactions (
          customer_id, branch_id, sale_id, points, type, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          customerId,
          branchId,
          sale_id ? Number(sale_id) : null,
          effectivePoints,
          type,
          note?.trim() || `${type} transaction processed`,
        ]
      );

      // 3. Update customer's cached points_balance
      await conn.query(
        `UPDATE customers SET points_balance = ? WHERE customer_id = ?`,
        [newBal, customerId]
      );

      // 4. Check for tier progression
      let updatedTier = cust.tier;
      if (type === "EARN" || (type === "ADJUST" && effectivePoints > 0)) {
        // Tiers: BRONZE (0-999), SILVER (1,000-4,999), GOLD (5,000-9,999), PLATINUM (10,000+)
        // Calculate lifetime points earned
        const [earnedRow]: any = await conn.query(
          `SELECT COALESCE(SUM(points), 0) AS lifetime_earned 
           FROM loyalty_transactions 
           WHERE customer_id = ? AND (type = 'EARN' OR (type = 'ADJUST' AND points > 0))`,
          [customerId]
        );
        const lifetime = Number(earnedRow[0]?.lifetime_earned || 0);

        let targetTier = "BRONZE";
        if (lifetime >= 10000) targetTier = "PLATINUM";
        else if (lifetime >= 5000) targetTier = "GOLD";
        else if (lifetime >= 1000) targetTier = "SILVER";

        if (targetTier !== cust.tier) {
          await conn.query(`UPDATE customers SET tier = ? WHERE customer_id = ?`, [targetTier, customerId]);
          try {
            await conn.query(
              `INSERT INTO customer_tier_history (customer_id, old_tier, new_tier, reason, changed_at)
               VALUES (?, ?, ?, 'Tier upgraded based on lifetime loyalty points accumulated', NOW())`,
              [customerId, cust.tier, targetTier]
            );
          } catch (thErr) {
            console.warn("Tier history write error:", thErr);
          }
          updatedTier = targetTier;
        }
      }

      return {
        transaction_id: insertRes.insertId,
        customer_id: customerId,
        type,
        points: effectivePoints,
        previous_balance: currentBal,
        new_balance: newBal,
        tier: updatedTier,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${type} of ${Math.abs(result.points)} points. New balance: ${result.new_balance} pts.`,
      result,
    });
  } catch (err: any) {
    console.error("POST /api/customers/[id]/loyalty error:", err);
    return NextResponse.json({ error: err.message || "Failed to process loyalty transaction" }, { status: 400 });
  }
}
