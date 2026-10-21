import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/cashier/sales — Transaction history with filtering, cashier scope, and pagination
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cashierId = searchParams.get("cashierId");
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim() || "";
    const dateFilter = searchParams.get("dateFilter") || "all";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const allCashiers = searchParams.get("allCashiers") === "true";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") || "15")));
    const offset = (page - 1) * pageSize;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    // Cashier scope restriction: unless allCashiers is explicitly authorized, scope to logged-in cashier
    if (cashierId && !allCashiers) {
      whereClause += " AND s.cashier_id = ?";
      params.push(Number(cashierId));
    }

    if (branchId) {
      whereClause += " AND s.branch_id = ?";
      params.push(Number(branchId));
    }

    if (status && status !== "ALL") {
      whereClause += " AND s.status = ?";
      params.push(status);
    }

    if (search) {
      // Support searching by sale ID, formatted receipt number, customer name, or card
      const cleanNum = search.replace(/\D/g, "");
      if (cleanNum && (search.startsWith("REC-") || !isNaN(Number(search)))) {
        whereClause += " AND (s.sale_id = ? OR c.full_name LIKE ? OR c.card_no LIKE ?)";
        params.push(Number(cleanNum), `%${search}%`, `%${search}%`);
      } else {
        whereClause += " AND (c.full_name LIKE ? OR c.card_no LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
    }

    // Date filtering
    if (dateFilter === "today") {
      whereClause += " AND DATE(s.sale_date) = CURRENT_DATE()";
    } else if (dateFilter === "yesterday") {
      whereClause += " AND DATE(s.sale_date) = CURRENT_DATE() - INTERVAL 1 DAY";
    } else if (dateFilter === "7days") {
      whereClause += " AND s.sale_date >= CURRENT_DATE() - INTERVAL 7 DAY";
    } else if (dateFilter === "30days") {
      whereClause += " AND s.sale_date >= CURRENT_DATE() - INTERVAL 30 DAY";
    } else if (dateFrom && dateTo) {
      whereClause += " AND DATE(s.sale_date) BETWEEN ? AND ?";
      params.push(dateFrom, dateTo);
    }

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(DISTINCT s.sale_id) AS total_count
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      ${whereClause}
    `;
    const [countResult]: any = await query(countSql, params);
    const totalCount = Number(countResult?.total_count || 0);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch paginated sales
    const sql = `
      SELECT 
        s.sale_id,
        s.branch_id,
        b.name AS branch_name,
        b.branch_code,
        s.cashier_id,
        e.full_name AS cashier_name,
        s.customer_id,
        c.full_name AS customer_name,
        c.card_no AS customer_card,
        s.sale_date,
        s.status,
        s.subtotal,
        s.discount_total,
        s.tax_total,
        s.total_amount,
        s.tendered_cash,
        s.tendered_amount,
        s.change_amount,
        COUNT(DISTINCT si.sale_item_id) AS items_count,
        (SELECT GROUP_CONCAT(DISTINCT method SEPARATOR ', ') FROM payments WHERE sale_id = s.sale_id) AS payment_methods,
        (SELECT COUNT(*) FROM returns r JOIN sale_items si2 ON r.sale_item_id = si2.sale_item_id WHERE si2.sale_id = s.sale_id) AS returns_count
      FROM sales s
      JOIN branches b ON s.branch_id = b.branch_id
      JOIN employees e ON s.cashier_id = e.employee_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN sale_items si ON s.sale_id = si.sale_id
      ${whereClause}
      GROUP BY 
        s.sale_id, s.branch_id, b.name, b.branch_code, s.cashier_id, e.full_name,
        s.customer_id, c.full_name, c.card_no, s.sale_date, s.status,
        s.subtotal, s.discount_total, s.tax_total, s.total_amount
      ORDER BY s.sale_date DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, pageSize, offset];
    const rawSales = await query<any>(sql, queryParams);

    const sales = rawSales.map((s) => ({
      ...s,
      receipt_number: `REC-${s.branch_code || "BR"}-${String(s.sale_id).padStart(6, "0")}`,
    }));

    return NextResponse.json({
      sales,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Cashier sales query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
