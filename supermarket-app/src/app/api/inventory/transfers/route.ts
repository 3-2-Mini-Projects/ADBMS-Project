import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET recent stock transfers from audit_log
export async function GET(req: Request) {
  const auth = await authorizeRequest("manage_inventory");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const branchId = session.role === "ADMIN" ? searchParams.get("branchId") : String(session.branch_id);

    let sql = `
      SELECT 
        log_id,
        record_id,
        action,
        new_value,
        changed_by,
        changed_at
      FROM audit_log
      WHERE table_name = 'inventory' 
        AND record_id LIKE 'transfer_%'
    `;
    const params: any[] = [];

    if (branchId) {
      sql += ` AND (
        JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.from_branch_id')) = ? 
        OR JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.to_branch_id')) = ?
      )`;
      params.push(branchId, branchId);
    }

    sql += ` ORDER BY log_id DESC LIMIT 50`;

    const logs: any = await query(sql, params);

    // Parse JSON new_value
    const parsed = logs.map((l: any) => {
      let details: any = {};
      try {
        details = typeof l.new_value === "string" ? JSON.parse(l.new_value) : l.new_value;
      } catch {
        details = {};
      }
      return {
        ...l,
        details,
      };
    });

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("GET /api/inventory/transfers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST execute inter-branch transfer
export async function POST(req: Request) {
  const auth = await authorizeRequest("manage_inventory");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  const connection = await pool.getConnection();

  try {
    const body = await req.json();
    const { from_branch_id, to_branch_id, product_id, quantity } = body;

    const fromBranch = Number(from_branch_id);
    const toBranch = Number(to_branch_id);
    const productId = Number(product_id);
    const qty = Number(quantity);

    if (!fromBranch || !toBranch || !productId || !qty || qty <= 0) {
      return NextResponse.json(
        { error: "Invalid transfer parameters. from_branch, to_branch, product, and positive quantity required." },
        { status: 400 }
      );
    }

    if (fromBranch === toBranch) {
      return NextResponse.json(
        { error: "Source and destination branch cannot be the same." },
        { status: 400 }
      );
    }

    // Role check: non-admin can only transfer OUT of their own branch
    if (session.role !== "ADMIN" && session.branch_id !== fromBranch) {
      return NextResponse.json(
        { error: "Forbidden: You may only transfer stock originating from your assigned branch." },
        { status: 403 }
      );
    }

    // Try ADBMS Stored Procedure: sp_transfer_stock
    try {
      await connection.query("CALL sp_transfer_stock(?, ?, ?, ?, ?)", [
        fromBranch,
        toBranch,
        productId,
        qty,
        session.employee_id,
      ]);
    } catch (spErr: any) {
      console.warn("sp_transfer_stock fallback invoked:", spErr.message);

      // Transactional fallback if SP isn't installed
      await connection.beginTransaction();

      const [invRows]: any = await connection.query(
        "SELECT quantity_on_hand FROM inventory WHERE branch_id = ? AND product_id = ? FOR UPDATE",
        [fromBranch, productId]
      );

      if (!invRows || invRows.length === 0 || invRows[0].quantity_on_hand < qty) {
        throw new Error(
          `Insufficient stock at source branch. Available: ${invRows?.[0]?.quantity_on_hand ?? 0}, Requested: ${qty}`
        );
      }

      // Deduct from source
      await connection.query(
        "UPDATE inventory SET quantity_on_hand = quantity_on_hand - ?, last_updated = NOW() WHERE branch_id = ? AND product_id = ?",
        [qty, fromBranch, productId]
      );

      // Add to destination
      await connection.query(
        `INSERT INTO inventory (branch_id, product_id, quantity_on_hand, reserved_qty, reorder_level, last_updated)
         VALUES (?, ?, ?, 0, 10, NOW())
         ON DUPLICATE KEY UPDATE 
           quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand),
           last_updated = NOW()`,
        [toBranch, productId, qty]
      );

      // Audit log
      await connection.query(
        `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
         VALUES ('inventory', ?, 'UPDATE', ?, ?, NOW())`,
        [
          `transfer_${productId}`,
          JSON.stringify({
            event: "INTER_BRANCH_TRANSFER",
            from_branch_id: fromBranch,
            to_branch_id: toBranch,
            product_id: productId,
            quantity: qty,
          }),
          `employee_${session.employee_id}`,
        ]
      );

      await connection.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully transferred ${qty} units of Product #${productId} from Branch ${fromBranch} to Branch ${toBranch}.`,
    });
  } catch (err: any) {
    await connection.rollback().catch(() => {});
    console.error("POST /api/inventory/transfers error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
}
