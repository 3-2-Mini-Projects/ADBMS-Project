import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const minDays = Number(searchParams.get("minDays") || 30);
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status") || "ACTIVE";

    // Attempt to query from slow_movers table
    let slowMovers: any[] = [];
    try {
      let sql = `
        SELECT 
          sm.slow_mover_id,
          sm.product_id,
          p.barcode,
          p.name AS product_name,
          p.brand,
          c.category_id,
          c.name AS category_name,
          s.name AS supplier_name,
          sm.branch_id,
          b.name AS branch_name,
          sm.quantity_on_hand,
          sm.cost_price,
          sm.selling_price,
          sm.tied_up_capital,
          sm.last_sale_date,
          sm.days_without_sales,
          sm.sales_velocity,
          sm.turnover_ratio,
          sm.recommended_action,
          sm.recommended_discount_pct,
          sm.status,
          sm.action_taken_notes,
          sm.last_analyzed,
          CASE
            WHEN sm.days_without_sales >= 90 THEN 'CRITICAL'
            WHEN sm.days_without_sales >= 60 THEN 'HIGH'
            WHEN sm.days_without_sales >= 30 THEN 'MODERATE'
            ELSE 'LOW'
          END AS stagnation_level
        FROM slow_movers sm
        JOIN products p ON sm.product_id = p.product_id
        JOIN branches b ON sm.branch_id = b.branch_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      `;

      const conditions: string[] = [];
      const params: any[] = [];

      if (status && status !== "ALL") {
        conditions.push("sm.status = ?");
        params.push(status);
      }

      if (branchId) {
        conditions.push("sm.branch_id = ?");
        params.push(branchId);
      }

      if (categoryId) {
        conditions.push("p.category_id = ?");
        params.push(categoryId);
      }

      if (minDays > 0) {
        conditions.push("sm.days_without_sales >= ?");
        params.push(minDays);
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      sql += " ORDER BY sm.tied_up_capital DESC, sm.days_without_sales DESC LIMIT 100";

      slowMovers = await query(sql, params);
    } catch {
      slowMovers = [];
    }

    // If slow_movers table is empty or does not have records yet, compute dynamically from inventory and sales
    if (slowMovers.length === 0) {
      const dynamicFilter = branchId ? "AND i.branch_id = " + Number(branchId) : "";
      const dynamicCatFilter = categoryId ? "AND p.category_id = " + Number(categoryId) : "";

      const dynamicRows: any = await query(`
        SELECT 
          ROW_NUMBER() OVER (ORDER BY (i.quantity_on_hand * p.cost_price) DESC) AS slow_mover_id,
          p.product_id,
          p.barcode,
          p.name AS product_name,
          p.brand,
          c.category_id,
          c.name AS category_name,
          s.name AS supplier_name,
          i.branch_id,
          b.name AS branch_name,
          i.quantity_on_hand,
          p.cost_price,
          p.unit_price AS selling_price,
          ROUND(i.quantity_on_hand * p.cost_price, 2) AS tied_up_capital,
          sales_data.last_sale_date,
          COALESCE(DATEDIFF(CURRENT_DATE, sales_data.last_sale_date), 45) AS days_without_sales,
          COALESCE(sales_data.velocity_30d, 0.00) AS sales_velocity,
          0.00 AS turnover_ratio,
          CASE
            WHEN COALESCE(DATEDIFF(CURRENT_DATE, sales_data.last_sale_date), 45) >= 90 THEN 'DISCONTINUE'
            WHEN COALESCE(DATEDIFF(CURRENT_DATE, sales_data.last_sale_date), 45) >= 60 THEN 'DISCOUNT_PRICE'
            ELSE 'BUNDLE_PROMO'
          END AS recommended_action,
          CASE
            WHEN COALESCE(DATEDIFF(CURRENT_DATE, sales_data.last_sale_date), 45) >= 90 THEN 40.00
            WHEN COALESCE(DATEDIFF(CURRENT_DATE, sales_data.last_sale_date), 45) >= 60 THEN 25.00
            ELSE 15.00
          END AS recommended_discount_pct,
          'ACTIVE' AS status,
          NULL AS action_taken_notes,
          NOW() AS last_analyzed,
          CASE
            WHEN COALESCE(DATEDIFF(CURRENT_DATE, sales_data.last_sale_date), 45) >= 90 THEN 'CRITICAL'
            WHEN COALESCE(DATEDIFF(CURRENT_DATE, sales_data.last_sale_date), 45) >= 60 THEN 'HIGH'
            ELSE 'MODERATE'
          END AS stagnation_level
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        JOIN branches b ON i.branch_id = b.branch_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
        LEFT JOIN (
          SELECT
            s.branch_id,
            si.product_id,
            MAX(s.sale_date) AS last_sale_date,
            ROUND(SUM(CASE WHEN s.sale_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN si.quantity ELSE 0 END) / 30.0, 2) AS velocity_30d
          FROM sales s
          JOIN sale_items si ON s.sale_id = si.sale_id
          WHERE s.status = 'COMPLETED'
          GROUP BY s.branch_id, si.product_id
        ) sales_data ON i.branch_id = sales_data.branch_id AND i.product_id = sales_data.product_id
        WHERE i.quantity_on_hand > 5
          AND p.is_active = 1
          ${dynamicFilter}
          ${dynamicCatFilter}
        ORDER BY (i.quantity_on_hand * p.cost_price) DESC
        LIMIT 50
      `);

      slowMovers = dynamicRows;
    }

    return NextResponse.json(slowMovers);
  } catch (err: any) {
    console.error("GET /api/catalog/slow-movers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("manage_catalog");
  if (auth.error) {
    return auth.error;
  }
  const employeeId = auth.session.employee_id;

  try {
    const body = await req.json();
    const { action, slow_mover_id, product_id, discount_pct, reason } = body;

    // Action 1: Refresh Slow Movers Table
    if (action === "REFRESH") {
      try {
        await query("CALL sp_refresh_slow_movers(30)");
      } catch {
        // Fallback direct insert if procedure isn't installed in DB yet
        await query(`
          INSERT INTO slow_movers (
            product_id, branch_id, quantity_on_hand, cost_price, selling_price,
            tied_up_capital, last_sale_date, days_without_sales, sales_velocity,
            recommended_action, recommended_discount_pct, status, last_analyzed
          )
          SELECT
            inv.product_id,
            inv.branch_id,
            inv.quantity_on_hand,
            p.cost_price,
            p.unit_price,
            ROUND(inv.quantity_on_hand * p.cost_price, 2) AS tied_up_capital,
            sales_data.last_sale_date,
            DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) AS days_without_sales,
            COALESCE(sales_data.velocity_30d, 0.00) AS sales_velocity,
            CASE
              WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 90 THEN 'DISCONTINUE'
              WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 60 THEN 'DISCOUNT_PRICE'
              ELSE 'BUNDLE_PROMO'
            END AS recommended_action,
            CASE
              WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 90 THEN 40.00
              WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 60 THEN 25.00
              ELSE 15.00
            END AS recommended_discount_pct,
            'ACTIVE' AS status,
            NOW() AS last_analyzed
          FROM inventory inv
          JOIN products p ON inv.product_id = p.product_id
          LEFT JOIN (
            SELECT
              s.branch_id,
              si.product_id,
              MAX(s.sale_date) AS last_sale_date,
              ROUND(SUM(CASE WHEN s.sale_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN si.quantity ELSE 0 END) / 30.0, 2) AS velocity_30d
            FROM sales s
            JOIN sale_items si ON s.sale_id = si.sale_id
            WHERE s.status = 'COMPLETED'
            GROUP BY s.branch_id, si.product_id
          ) sales_data ON inv.branch_id = sales_data.branch_id AND inv.product_id = sales_data.product_id
          WHERE inv.quantity_on_hand > 0 AND p.is_active = 1
          ON DUPLICATE KEY UPDATE
            quantity_on_hand = VALUES(quantity_on_hand),
            cost_price = VALUES(cost_price),
            selling_price = VALUES(selling_price),
            tied_up_capital = VALUES(tied_up_capital),
            last_sale_date = VALUES(last_sale_date),
            days_without_sales = VALUES(days_without_sales),
            sales_velocity = VALUES(sales_velocity),
            recommended_action = VALUES(recommended_action),
            recommended_discount_pct = VALUES(recommended_discount_pct),
            last_analyzed = NOW()
        `);
      }

      return NextResponse.json({ success: true, message: "Slow movers analytics refreshed successfully" });
    }

    // Action 2: Apply Clearance Markdown Discount
    if (action === "MARKDOWN") {
      if (!product_id || !discount_pct) {
        return NextResponse.json({ error: "product_id and discount_pct are required" }, { status: 400 });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [prodRows]: any = await connection.query(
          "SELECT unit_price, cost_price, name FROM products WHERE product_id = ? FOR UPDATE",
          [product_id]
        );

        if (prodRows.length === 0) {
          throw new Error("Product not found");
        }

        const currentPrice = Number(prodRows[0].unit_price);
        const discountRate = Number(discount_pct) / 100;
        const newPrice = Math.max(0.01, Number((currentPrice * (1 - discountRate)).toFixed(2)));

        // Update product price
        await connection.query(
          "UPDATE products SET unit_price = ?, updated_at = NOW() WHERE product_id = ?",
          [newPrice, product_id]
        );

        // Record in price history
        await connection.query(
          `INSERT INTO product_price_history (
            product_id, old_price, new_price, price_variance_pct,
            changed_by, changed_at, reason, supervisor_approval_status, approved_at
          )
          VALUES (?, ?, ?, ?, ?, NOW(), ?, 'APPROVED', NOW())`,
          [
            product_id,
            currentPrice,
            newPrice,
            -Number(discount_pct),
            employeeId || 1,
            `Slow mover clearance markdown (${discount_pct}%) - ${reason || "Dormant stock acceleration"}`
          ]
        );

        // Update slow mover record if ID given
        if (slow_mover_id) {
          await connection.query(
            `UPDATE slow_movers 
             SET status = 'ACTION_TAKEN',
                 action_taken_notes = ?
             WHERE slow_mover_id = ?`,
            [`Marked down by ${discount_pct}% to Rs. ${newPrice}`, slow_mover_id]
          );
        }

        // Audit log
        await connection.query(
          `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
           VALUES ('products', ?, 'UPDATE', ?, ?, ?, NOW())`,
          [
            String(product_id),
            JSON.stringify({ unit_price: currentPrice }),
            JSON.stringify({ unit_price: newPrice, markdown_pct: discount_pct }),
            `employee_${employeeId || 1}`,
          ]
        );

        await connection.commit();
        return NextResponse.json({
          success: true,
          old_price: currentPrice,
          new_price: newPrice,
          message: `Markdown of ${discount_pct}% applied! Price updated from Rs. ${currentPrice} to Rs. ${newPrice}.`
        });
      } catch (err: any) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    // Action 3: Discontinue Product
    if (action === "DISCONTINUE") {
      if (!product_id) {
        return NextResponse.json({ error: "product_id is required" }, { status: 400 });
      }

      await query("UPDATE products SET is_active = 0, updated_at = NOW() WHERE product_id = ?", [product_id]);
      if (slow_mover_id) {
        await query(
          "UPDATE slow_movers SET status = 'DISCONTINUED', action_taken_notes = ? WHERE slow_mover_id = ?",
          [`Discontinued by employee ${employeeId || 1}: ${reason || "Slow moving phase out"}`, slow_mover_id]
        );
      }

      return NextResponse.json({ success: true, message: "Product has been discontinued from active catalog" });
    }

    // Action 4: Dismiss Slow Mover
    if (action === "DISMISS" && slow_mover_id) {
      await query("UPDATE slow_movers SET status = 'DISMISSED' WHERE slow_mover_id = ?", [slow_mover_id]);
      return NextResponse.json({ success: true, message: "Item dismissed from active slow movers" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/catalog/slow-movers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
