import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/cashier/products?branchId=1&search=...&barcode=...&categoryId=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = Number(searchParams.get("branchId") || "1");
    const search = searchParams.get("search")?.trim() || "";
    const barcode = searchParams.get("barcode")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const activeOnly = searchParams.get("activeOnly") !== "false"; // default true

    let sql = `
      SELECT 
        p.product_id,
        p.barcode,
        p.name,
        p.brand,
        p.unit_price,
        p.tax_rate,
        p.reorder_level,
        p.is_active,
        c.name AS category_name,
        COALESCE(i.quantity_on_hand, 0) AS quantity_on_hand,
        COALESCE(i.reserved_qty, 0) AS reserved_qty,
        GREATEST(0, COALESCE(i.quantity_on_hand, 0) - COALESCE(i.reserved_qty, 0)) AS available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN inventory i ON p.product_id = i.product_id AND i.branch_id = ?
      WHERE 1=1
    `;
    const params: any[] = [branchId];

    if (activeOnly) {
      sql += " AND p.is_active = 1";
    }

    if (barcode) {
      sql += " AND p.barcode = ?";
      params.push(barcode);
    } else if (search) {
      sql += " AND (p.barcode LIKE ? OR p.name LIKE ? OR p.brand LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(Number(categoryId));
    }

    sql += " ORDER BY p.name ASC LIMIT 100";

    const products = await query<any>(sql, params);

    // Also return list of categories for filter tabs
    const categories = await query<any>(`
      SELECT category_id, name FROM categories ORDER BY name ASC
    `);

    return NextResponse.json({
      products,
      categories,
    });
  } catch (error: any) {
    console.error("Cashier products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
