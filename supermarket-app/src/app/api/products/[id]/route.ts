import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Product details
    const [product]: any = await query(
      `SELECT 
        p.product_id,
        p.barcode,
        p.name,
        p.brand,
        p.category_id,
        c.name AS category_name,
        p.supplier_id,
        s.name AS supplier_name,
        s.supplier_code,
        p.unit_price,
        p.cost_price,
        ROUND(p.unit_price - p.cost_price, 2) AS gross_margin,
        ROUND(CASE WHEN p.unit_price > 0 THEN ((p.unit_price - p.cost_price) / p.unit_price) * 100 ELSE 0 END, 2) AS profit_margin_pct,
        p.tax_rate,
        p.reorder_level,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      WHERE p.product_id = ?`,
      [id]
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 2. Branch inventory breakdown
    const branchStock = await query(
      `SELECT 
        b.branch_id,
        b.branch_code,
        b.name AS branch_name,
        b.city,
        COALESCE(i.quantity_on_hand, 0) AS quantity_on_hand,
        COALESCE(i.reserved_qty, 0) AS reserved_qty,
        COALESCE(i.reorder_level, p.reorder_level) AS reorder_level,
        ROUND(COALESCE(i.quantity_on_hand, 0) * p.cost_price, 2) AS holding_value,
        CASE
          WHEN COALESCE(i.quantity_on_hand, 0) = 0 THEN 'OUT_OF_STOCK'
          WHEN COALESCE(i.quantity_on_hand, 0) <= COALESCE(i.reorder_level, p.reorder_level) THEN 'LOW_STOCK'
          ELSE 'NORMAL'
        END AS stock_status,
        i.last_updated
      FROM branches b
      CROSS JOIN products p ON p.product_id = ?
      LEFT JOIN inventory i ON b.branch_id = i.branch_id AND i.product_id = p.product_id
      WHERE b.is_active = 1
      ORDER BY b.branch_id ASC`,
      [id]
    );

    // 3. Batches in stock
    const batches = await query(
      `SELECT 
        pb.batch_id,
        pb.batch_no,
        b.name AS branch_name,
        pb.quantity,
        pb.received_date,
        pb.expiry_date,
        DATEDIFF(pb.expiry_date, CURRENT_DATE) AS days_to_expiry,
        CASE
          WHEN pb.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
          WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL 30 DAY THEN 'NEAR_EXPIRY'
          ELSE 'GOOD'
        END AS expiry_status
      FROM product_batches pb
      JOIN branches b ON pb.branch_id = b.branch_id
      WHERE pb.product_id = ? AND pb.quantity > 0
      ORDER BY pb.expiry_date ASC`,
      [id]
    );

    // 4. Price history
    const priceHistory = await query(
      `SELECT 
        h.history_id,
        h.old_price,
        h.new_price,
        ROUND(h.new_price - h.old_price, 2) AS price_diff,
        COALESCE(h.price_variance_pct, ROUND(((h.new_price - h.old_price) / h.old_price) * 100, 2)) AS price_variance_pct,
        h.reason,
        h.changed_at,
        COALESCE(h.supervisor_approval_status, 'APPROVED') AS supervisor_approval_status,
        e.full_name AS changed_by_name,
        e_sup.full_name AS supervisor_name,
        h.supervisor_comment
      FROM product_price_history h
      LEFT JOIN employees e ON h.changed_by = e.employee_id
      LEFT JOIN employees e_sup ON h.supervisor_id = e_sup.employee_id
      WHERE h.product_id = ?
      ORDER BY h.changed_at DESC
      LIMIT 10`,
      [id]
    );

    return NextResponse.json({
      product,
      branchStock,
      batches,
      priceHistory,
    });
  } catch (err: any) {
    console.error("GET /api/products/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
