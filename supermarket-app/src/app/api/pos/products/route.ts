import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || "1";
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";

    let sql = `
      SELECT 
        p.product_id,
        p.barcode,
        p.name,
        p.brand,
        p.category_id,
        c.name AS category_name,
        p.unit_price,
        p.cost_price,
        p.tax_rate,
        p.reorder_level,
        p.is_active,
        COALESCE(i.quantity_on_hand, 0) AS stock_available,
        promo.promo_id,
        promo.name AS promo_name,
        promo.discount_percent AS promo_discount_percent
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN inventory i ON p.product_id = i.product_id AND i.branch_id = ?
      LEFT JOIN promotions promo ON (
        (promo.product_id = p.product_id OR promo.category_id = p.category_id)
        AND promo.is_active = 1
        AND CURRENT_DATE BETWEEN promo.start_date AND promo.end_date
      )
      WHERE p.is_active = 1
    `;

    const params: any[] = [branchId];

    if (search.trim()) {
      sql += ` AND (p.barcode = ? OR p.name LIKE ? OR p.brand LIKE ?)`;
      params.push(search.trim(), `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (categoryId) {
      sql += ` AND p.category_id = ?`;
      params.push(categoryId);
    }

    sql += ` ORDER BY p.name ASC LIMIT 50`;

    const products = await query(sql, params);
    return NextResponse.json(products);
  } catch (err: any) {
    console.error("GET /api/pos/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
