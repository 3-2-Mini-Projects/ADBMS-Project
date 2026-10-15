import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const search   = searchParams.get("search") || "";

    let sql = `
      SELECT
        p.product_id, p.barcode, p.name, p.brand,
        p.unit_price, p.tax_rate,
        COALESCE(i.quantity_on_hand, 0) AS stock
      FROM products p
      LEFT JOIN inventory i ON p.product_id = i.product_id AND i.branch_id = ?
      WHERE p.is_active = 1
    `;
    const params: any[] = [branchId || 1];

    if (search) {
      sql += " AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY p.name LIMIT 50";

    const products = await query(sql, params);
    return NextResponse.json(products);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
