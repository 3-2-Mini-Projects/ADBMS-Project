import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

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
        console.warn("recalculate_tiers() procedure invocation:", procErr.message);

        try {
          await query("DROP PROCEDURE IF EXISTS recalculate_tiers");
          await query(`
            CREATE PROCEDURE recalculate_tiers()
            BEGIN
                DECLARE done INT DEFAULT 0;
                DECLARE customerId INT;
                DECLARE old_tier VARCHAR(10);
                DECLARE new_tier VARCHAR(10);
                DECLARE customer_points INT;

                DECLARE cur CURSOR FOR
                    SELECT customer_id, tier, points_balance
                    FROM customers
                    WHERE is_active = 1;

                DECLARE CONTINUE HANDLER FOR NOT FOUND
                    SET done = 1;

                OPEN cur;

                tier_loop: LOOP
                    FETCH cur INTO customerId, old_tier, customer_points;
                    IF done = 1 THEN
                        LEAVE tier_loop;
                    END IF;

                    IF customer_points >= 3000 THEN
                        SET new_tier = 'PLATINUM';
                    ELSEIF customer_points >= 1500 THEN
                        SET new_tier = 'GOLD';
                    ELSEIF customer_points >= 500 THEN
                        SET new_tier = 'SILVER';
                    ELSE
                        SET new_tier = 'BRONZE';
                    END IF;

                    IF old_tier <> new_tier THEN
                        INSERT INTO customer_tier_history (customer_id, old_tier, new_tier, reason)
                        VALUES (customerId, old_tier, new_tier, 'Tier recalculated from points balance');

                        UPDATE customers
                        SET tier = new_tier
                        WHERE customer_id = customerId;
                    END IF;
                END LOOP;

                CLOSE cur;
            END
          `);
          await query("CALL recalculate_tiers()");
          return NextResponse.json({
            success: true,
            message: "Customer tiers recalculated successfully via recalculate_tiers() procedure.",
          });
        } catch {
          // Direct fallback calculation based on points balance
          const customers: any = await query(
            "SELECT customer_id, tier, points_balance FROM customers WHERE is_active = 1"
          );
          let upgraded = 0;

          for (const c of customers) {
            const customer_points = Number(c.points_balance || 0);
            let newTier = "BRONZE";
            if (customer_points >= 3000) newTier = "PLATINUM";
            else if (customer_points >= 1500) newTier = "GOLD";
            else if (customer_points >= 500) newTier = "SILVER";
            else newTier = "BRONZE";

            if (c.tier !== newTier) {
              try {
                await query(
                  "INSERT INTO customer_tier_history (customer_id, old_tier, new_tier, reason) VALUES (?, ?, ?, 'Tier recalculated from points balance')",
                  [c.customer_id, c.tier, newTier]
                );
              } catch {
                // ignore history insert error
              }
              await query("UPDATE customers SET tier = ? WHERE customer_id = ?", [newTier, c.customer_id]);
              upgraded++;
            }
          }

          return NextResponse.json({
            success: true,
            message: `Customer tiers recalculated successfully from points balance. (${upgraded} customer tiers updated)`,
          });
        }
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
    let branchId = searchParams.get("branchId");

    if (!branchId) {
      const session = await getServerSession();
      if (session?.branch_id) {
        branchId = String(session.branch_id);
      }
    }

    const hasBranch = Boolean(branchId && branchId !== "ALL" && branchId !== "0");
    let branchInfo: any = null;
    if (hasBranch) {
      const branchRows: any = await query(
        `SELECT branch_id, branch_code, name, city FROM branches WHERE branch_id = ? LIMIT 1`,
        [branchId]
      );
      if (branchRows.length > 0) {
        branchInfo = branchRows[0];
      }
    }
    const branchCity = branchInfo?.city ? String(branchInfo.city).trim() : "";
    const branchName = branchInfo?.name ? String(branchInfo.name).trim() : "";

    const branchFilter = hasBranch
      ? branchCity || branchName
        ? `AND (
            c.city IS NOT NULL AND TRIM(c.city) != ''
            AND (
              LOWER(TRIM(c.city)) = LOWER(?)
              OR LOWER(?) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
              OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(?), '%')
            )
          )`
        : `AND (
            c.city IS NOT NULL AND TRIM(c.city) != ''
            AND EXISTS (
              SELECT 1 FROM branches b
              WHERE b.branch_id = ?
                AND (
                  LOWER(TRIM(c.city)) = LOWER(TRIM(b.city))
                  OR LOWER(b.name) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
                  OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(TRIM(b.city)), '%')
                )
            )
          )`
      : "";

    const branchParams = hasBranch
      ? branchCity || branchName
        ? [branchCity, branchName, branchCity]
        : [branchId]
      : [];

    if (view === "top_customers") {
      const month = searchParams.get("month"); // e.g., '2026-10' or 'ALL'
      const isSpecificMonth = Boolean(month && month !== "ALL" && /^\d{4}-\d{2}$/.test(month));

      // Fetch distinct months from loyalty_transactions for month picker
      let availableMonths: string[] = [];
      try {
        const mRows: any = await query(`
          SELECT DISTINCT DATE_FORMAT(created_at, '%Y-%m') AS m
          FROM loyalty_transactions
          WHERE created_at IS NOT NULL
          ORDER BY m DESC
          LIMIT 24
        `);
        availableMonths = mRows.map((r: any) => r.m).filter(Boolean);
      } catch {}

      // Keep the ADBMS top_customers_vw updated with month-wise grouping and points_balance > 0
      try {
        await query(`
          CREATE OR REPLACE VIEW top_customers_vw AS
          SELECT 
            c.customer_id,
            c.card_no,
            c.full_name,
            c.tier,
            c.points_balance,
            DATE_FORMAT(lt.created_at, '%Y-%m') AS transaction_month,
            COALESCE(SUM(
              CASE 
                WHEN lt.transaction_type = 'EARNED' OR lt.transaction_type = 'EARN' 
                THEN COALESCE(lt.points_change, 0) 
                ELSE 0 
              END
            ), 0) AS total_points_earned
          FROM customers c
          LEFT JOIN loyalty_transactions lt ON c.customer_id = lt.customer_id
          WHERE c.is_active = 1 AND c.points_balance > 0
          GROUP BY c.customer_id, c.card_no, c.full_name, c.tier, c.points_balance, DATE_FORMAT(lt.created_at, '%Y-%m')
        `);
      } catch (viewErr: any) {
        console.warn("Notice: could not replace top_customers_vw:", viewErr?.message);
      }

      let sql = "";
      const params: any[] = [];

      if (isSpecificMonth) {
        sql = `
          SELECT 
            c.customer_id,
            c.card_no,
            c.full_name,
            c.tier,
            c.points_balance,
            ? AS transaction_month,
            COALESCE(lt_m.points_earned_month, 0) AS total_points_earned
          FROM customers c
          LEFT JOIN (
            SELECT 
              customer_id, 
              SUM(CASE WHEN transaction_type = 'EARNED' OR transaction_type = 'EARN' THEN COALESCE(points_change, 0) ELSE 0 END) AS points_earned_month
            FROM loyalty_transactions
            WHERE (transaction_type = 'EARNED' OR transaction_type = 'EARN')
              AND DATE_FORMAT(created_at, '%Y-%m') = ?
            GROUP BY customer_id
          ) lt_m ON c.customer_id = lt_m.customer_id
          WHERE c.is_active = 1
            AND c.points_balance > 0
        `;
        params.push(month, month);
      } else {
        sql = `
          SELECT 
            c.customer_id,
            c.card_no,
            c.full_name,
            c.tier,
            c.points_balance,
            'ALL' AS transaction_month,
            COALESCE(lt_agg.total_points_earned, c.points_balance, 0) AS total_points_earned
          FROM customers c
          LEFT JOIN (
            SELECT 
              customer_id, 
              SUM(CASE WHEN transaction_type = 'EARNED' OR transaction_type = 'EARN' THEN COALESCE(points_change, 0) ELSE 0 END) AS total_points_earned
            FROM loyalty_transactions
            WHERE (transaction_type = 'EARNED' OR transaction_type = 'EARN')
            GROUP BY customer_id
          ) lt_agg ON c.customer_id = lt_agg.customer_id
          WHERE c.is_active = 1
            AND c.points_balance > 0
        `;
      }

      if (hasBranch) {
        sql += ` ${branchFilter}`;
        params.push(...branchParams);
      }

      sql += ` ORDER BY total_points_earned DESC, c.points_balance DESC LIMIT 10`;

      try {
        const rows = await query(sql, params);
        return NextResponse.json({
          customers: rows,
          months: availableMonths,
        });
      } catch (err: any) {
        console.error("top_customers query error:", err);
        return NextResponse.json({
          customers: [],
          months: availableMonths,
        });
      }
    }

    if (view === "customer_summary") {
      if (hasBranch) {
        try {
          const rows = await query(`
            SELECT csv.*
            FROM customer_summary_vw csv
            JOIN customers c ON csv.customer_id = c.customer_id
            WHERE c.is_active = 1 ${branchFilter}
            ORDER BY csv.points_balance DESC
            LIMIT 100
          `, branchParams);
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
            WHERE c.is_active = 1 ${branchFilter}
            ORDER BY c.points_balance DESC, c.full_name ASC
            LIMIT 100
          `, branchParams);
          return NextResponse.json(rows);
        }
      }

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
        let sql = `
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
          WHERE 1=1
        `;
        const params: any[] = [];
        if (hasBranch) {
          sql += ` ${branchFilter}`;
          params.push(...branchParams);
        }
        sql += ` ORDER BY lt.created_at DESC LIMIT 100`;
        const rows = await query(sql, params);
        return NextResponse.json(rows);
      } catch (err: any) {
        return NextResponse.json([]);
      }
    }

    if (view === "customer_etl") {
      try {
        let sql = "SELECT * FROM customer_etl_vw";
        const params: any[] = [];
        if (hasBranch) {
          sql = `
            SELECT cetl.*
            FROM customer_etl_vw cetl
            JOIN customers c ON cetl.customer_id = c.customer_id
            WHERE c.is_active = 1 ${branchFilter}
          `;
          params.push(...branchParams);
        }
        sql += " LIMIT 50";
        const rows = await query(sql, params);
        return NextResponse.json(rows);
      } catch {
        let sql = `
          SELECT 
            customer_id, card_no, full_name,
            CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 3)) AS masked_phone,
            email, tier, points_balance, join_date
          FROM customers c
          WHERE c.is_active = 1
        `;
        const params: any[] = [];
        if (hasBranch) {
          sql += ` ${branchFilter}`;
          params.push(...branchParams);
        }
        sql += " LIMIT 50";
        const rows = await query(sql, params);
        return NextResponse.json(rows);
      }
    }

    return NextResponse.json({ error: "Specify view: top_customers, customer_summary, ledger, or customer_etl" }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/marketing/actions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
