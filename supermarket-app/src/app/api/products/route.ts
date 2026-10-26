import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

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
  const auth = await authorizeRequest("manage_catalog");
  if (auth.error) {
    return auth.error;
  }

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
  const auth = await authorizeRequest("manage_catalog");
  if (auth.error) {
    return auth.error;
  }
  const changed_by = auth.session.employee_id;
  const userRole = auth.session.role;

  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const {
      product_id,
      name,
      barcode,
      brand,
      category_id,
      supplier_id,
      unit_price,
      cost_price,
      tax_rate,
      reorder_level,
      is_active,
      reason,
      force_supervisor_override,
    } = body;

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    await connection.beginTransaction();

    const [existing]: any = await connection.query(
      "SELECT unit_price, cost_price, is_active, barcode, name FROM products WHERE product_id = ? FOR UPDATE",
      [product_id]
    );

    if (existing.length === 0) {
      throw new Error("Product not found");
    }

    const currentPrice = Number(existing[0].unit_price);
    const targetCost = cost_price !== undefined ? Number(cost_price) : Number(existing[0].cost_price);
    let pendingApproval = false;
    let approvalMessage = "Product updated successfully";

    // Handle unit price change with Supervisor Approval Gate
    if (unit_price !== undefined && Number(unit_price) !== currentPrice) {
      const newPriceNum = Number(unit_price);
      const variancePct = currentPrice > 0 ? Number((((newPriceNum - currentPrice) / currentPrice) * 100).toFixed(2)) : 0;
      
      // Approval rule: Price drop > 15% OR below cost price
      const requiresApproval = (variancePct < -15.00 || newPriceNum < targetCost);
      const canDirectlyApprove = (userRole === "ADMIN" || userRole === "MANAGER" || Boolean(force_supervisor_override));

      if (requiresApproval && !canDirectlyApprove) {
        pendingApproval = true;
        // Queue into price history as PENDING_SUPERVISOR_APPROVAL without updating products.unit_price
        await connection.query(
          `INSERT INTO product_price_history (
            product_id, old_price, new_price, price_variance_pct, changed_by, changed_at, reason, supervisor_approval_status
          ) VALUES (?, ?, ?, ?, ?, NOW(), ?, 'PENDING_SUPERVISOR_APPROVAL')`,
          [
            product_id,
            currentPrice,
            newPriceNum,
            variancePct,
            changed_by || 1,
            reason || (newPriceNum < targetCost ? "Selling below cost price" : "Price reduction exceeding 15% policy threshold")
          ]
        );
        approvalMessage = "Price change exceeds policy threshold (>15% drop or below cost). Queued for Supervisor Approval.";
      } else {
        // Immediate approval
        await connection.query(
          `INSERT INTO product_price_history (
            product_id, old_price, new_price, price_variance_pct, changed_by, changed_at, reason, supervisor_approval_status, approved_at
          ) VALUES (?, ?, ?, ?, ?, NOW(), ?, 'APPROVED', NOW())`,
          [
            product_id,
            currentPrice,
            newPriceNum,
            variancePct,
            changed_by || 1,
            reason || "Regular price update"
          ]
        );

        await connection.query(
          "UPDATE products SET unit_price = ?, updated_at = NOW() WHERE product_id = ?",
          [newPriceNum, product_id]
        );

        // Audit log
        await connection.query(
          `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
           VALUES ('products', ?, 'UPDATE', ?, ?, ?, NOW())`,
          [
            String(product_id),
            JSON.stringify({ unit_price: currentPrice }),
            JSON.stringify({ unit_price: newPriceNum, variance_pct: variancePct }),
            `employee_${changed_by || 1}`,
          ]
        );
        approvalMessage = "Product price successfully updated";
      }
    }

    // Update other product attributes
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      updateParams.push(name);
    }
    if (barcode !== undefined) {
      updateFields.push("barcode = ?");
      updateParams.push(barcode);
    }
    if (brand !== undefined) {
      updateFields.push("brand = ?");
      updateParams.push(brand);
    }
    if (category_id !== undefined) {
      updateFields.push("category_id = ?");
      updateParams.push(category_id);
    }
    if (supplier_id !== undefined) {
      updateFields.push("supplier_id = ?");
      updateParams.push(supplier_id);
    }
    if (cost_price !== undefined) {
      updateFields.push("cost_price = ?");
      updateParams.push(cost_price);
    }
    if (tax_rate !== undefined) {
      updateFields.push("tax_rate = ?");
      updateParams.push(tax_rate);
    }
    if (reorder_level !== undefined) {
      updateFields.push("reorder_level = ?");
      updateParams.push(reorder_level);
      // Synchronize all branch inventory records for this product
      await connection.query(
        "UPDATE inventory SET reorder_level = ?, last_updated = NOW() WHERE product_id = ?",
        [reorder_level, product_id]
      );
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateParams.push(is_active);
    }

    if (updateFields.length > 0) {
      updateFields.push("updated_at = NOW()");
      updateParams.push(product_id);
      await connection.query(
        `UPDATE products SET ${updateFields.join(", ")} WHERE product_id = ?`,
        updateParams
      );
    }

    await connection.commit();
    return NextResponse.json({
      success: true,
      pendingApproval,
      message: approvalMessage,
    });
  } catch (err: any) {
    await connection.rollback();
    console.error("PATCH /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(req: Request) {
  const auth = await authorizeRequest("manage_catalog");
  if (auth.error) {
    return auth.error;
  }
  const employeeId = auth.session.employee_id;

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    // Soft-deactivate product
    await query("UPDATE products SET is_active = 0, updated_at = NOW() WHERE product_id = ?", [productId]);

    // Audit log
    await query(
      `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, changed_by, changed_at)
       VALUES ('products', ?, 'UPDATE', JSON_OBJECT('is_active', 1), JSON_OBJECT('is_active', 0), ?, NOW())`,
      [String(productId), `employee_${employeeId || 1}`]
    );

    return NextResponse.json({ success: true, message: "Product deactivated successfully" });
  } catch (err: any) {
    console.error("DELETE /api/products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
