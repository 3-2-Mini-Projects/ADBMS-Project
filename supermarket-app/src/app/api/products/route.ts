import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");

    let sql = `
      SELECT 
        p.product_id,
        p.barcode,
        p.name,
        p.brand,
        p.category_id,
        c.name AS category_name,
        p.supplier_id,
        s.name AS supplier_name,
        p.unit_price,
        p.cost_price,
        p.tax_rate,
        p.reorder_level,
        p.is_active,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(i.quantity_on_hand), 0) AS quantity_on_hand
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push("(p.barcode = ? OR p.name LIKE ? OR p.brand LIKE ?)");
      params.push(search, `%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      conditions.push("p.category_id = ?");
      params.push(categoryId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` GROUP BY p.product_id, p.barcode, p.name, p.brand, p.category_id, c.name, p.supplier_id, s.name, p.unit_price, p.cost_price, p.tax_rate, p.reorder_level, p.is_active, p.created_at, p.updated_at`;
    sql += ` ORDER BY p.product_id DESC`;

    const products = await query(sql, params);
    return NextResponse.json(products);
  } catch (err: any) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      barcode,
      name,
      category_id,
      supplier_id,
      brand,
      unit_price,
      cost_price,
      tax_rate,
      reorder_level,
    } = body;

    const result: any = await query(
      `INSERT INTO products (
        barcode, name, category_id, supplier_id, brand,
        unit_price, cost_price, tax_rate, reorder_level, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        barcode,
        name,
        category_id,
        supplier_id,
        brand || null,
        unit_price,
        cost_price || 0,
        tax_rate || 0,
        reorder_level || 10,
      ]
    );

    const productId = result.insertId;

    // Initialize inventory rows for all active branches
    const branches = await query("SELECT branch_id FROM branches WHERE is_active = 1");
    for (const b of branches) {
      await query(
        `INSERT IGNORE INTO inventory (branch_id, product_id, quantity_on_hand, reserved_qty, reorder_level, last_updated)
         VALUES (?, ?, 0, 0, ?, NOW())`,
        [b.branch_id, productId, reorder_level || 10]
      );
    }

    return NextResponse.json({ success: true, product_id: productId });
  } catch (err: any) {
    console.error("POST /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const { product_id, unit_price, cost_price, is_active, changed_by, reason } = body;

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    await connection.beginTransaction();

    const [existing]: any = await connection.query(
      "SELECT unit_price, cost_price, is_active FROM products WHERE product_id = ? FOR UPDATE",
      [product_id]
    );

    if (existing.length === 0) {
      throw new Error("Product not found");
    }

    const currentPrice = existing[0].unit_price;

    // If unit price changed, record in product_price_history!
    if (unit_price !== undefined && Number(unit_price) !== Number(currentPrice)) {
      await connection.query(
        `INSERT INTO product_price_history (product_id, old_price, new_price, changed_by, changed_at, reason)
         VALUES (?, ?, ?, ?, NOW(), ?)`,
        [product_id, currentPrice, unit_price, changed_by || 1, reason || "Regular price update"]
      );

      await connection.query(
        "UPDATE products SET unit_price = ?, updated_at = NOW() WHERE product_id = ?",
        [unit_price, product_id]
      );

      // Audit log
      await connection.query(
        `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
         VALUES ('products', ?, 'UPDATE', ?, ?, ?, NOW())`,
        [
          String(product_id),
          JSON.stringify({ unit_price: currentPrice }),
          JSON.stringify({ unit_price }),
          `employee_${changed_by || 1}`,
        ]
      );
    }

    if (cost_price !== undefined) {
      await connection.query(
        "UPDATE products SET cost_price = ?, updated_at = NOW() WHERE product_id = ?",
        [cost_price, product_id]
      );
    }

    if (is_active !== undefined) {
      await connection.query(
        "UPDATE products SET is_active = ?, updated_at = NOW() WHERE product_id = ?",
        [is_active, product_id]
      );
    }

    if (body.reorder_level !== undefined) {
      await connection.query(
        "UPDATE products SET reorder_level = ?, updated_at = NOW() WHERE product_id = ?",
        [body.reorder_level, product_id]
      );
      // Synchronize all branch inventory records for this product
      await connection.query(
        "UPDATE inventory SET reorder_level = ?, last_updated = NOW() WHERE product_id = ?",
        [body.reorder_level, product_id]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    console.error("PATCH /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}
