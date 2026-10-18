import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { authorizeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
        audit_id AS log_id,
        audit_id,
        record_id,
        action,
        new_value,
        changed_by,
        changed_at
      FROM audit_log
      WHERE table_name = 'product_batches'
        AND record_id LIKE 'disposal_batch_%'
    `;
    const params: any[] = [];

    if (branchId && branchId !== "ALL") {
      sql += ` AND JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.branch_id')) = ?`;
      params.push(branchId);
    }

    sql += ` ORDER BY audit_id DESC LIMIT 50`;

    const logs: any = await query(sql, params);

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
    console.error("GET /api/inventory/disposal error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest("manage_inventory");
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  const connection = await pool.getConnection();

  try {
    const body = await req.json();
    const { batch_id, quantity, reason } = body;

    const batchId = Number(batch_id);
    const qty = Number(quantity);
    const disposalReason = reason || "DAMAGED";

    if (!batchId || !qty || qty <= 0) {
      return NextResponse.json(
        { error: "Valid batch_id and positive quantity are required." },
        { status: 400 }
      );
    }

    const [batchRows]: any = await connection.query(
      "SELECT branch_id FROM product_batches WHERE batch_id = ?",
      [batchId]
    );
    if (!batchRows || batchRows.length === 0) {
      return NextResponse.json({ error: "Batch record not found." }, { status: 404 });
    }
    if (session.role !== "ADMIN" && Number(batchRows[0].branch_id) !== Number(session.branch_id)) {
      return NextResponse.json({ error: "Forbidden: batch belongs to another branch." }, { status: 403 });
    }

    // Try ADBMS Stored Procedure: sp_record_stock_disposal
    try {
      await connection.query("CALL sp_record_stock_disposal(?, ?, ?, ?)", [
        batchId,
        qty,
        disposalReason,
        session.employee_id,
      ]);
    } catch (spErr: any) {
      console.warn("sp_record_stock_disposal fallback invoked:", spErr.message);

      await connection.beginTransaction();

      const [batchRows]: any = await connection.query(
        "SELECT batch_id, product_id, branch_id, quantity FROM product_batches WHERE batch_id = ? FOR UPDATE",
        [batchId]
      );

      if (!batchRows || batchRows.length === 0) {
        throw new Error("Batch record not found.");
      }

      const batch = batchRows[0];
      if (batch.quantity < qty) {
        throw new Error(`Cannot dispose ${qty} units. Batch only has ${batch.quantity} available.`);
      }

      // Branch authorization
      if (session.role !== "ADMIN" && session.branch_id !== batch.branch_id) {
        throw new Error("Forbidden: You cannot dispose stock belonging to another branch.");
      }

      // 1. Deduct from batch
      await connection.query(
        "UPDATE product_batches SET quantity = quantity - ? WHERE batch_id = ?",
        [qty, batchId]
      );

      // 2. Deduct from inventory
      await connection.query(
        "UPDATE inventory SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?), last_updated = NOW() WHERE branch_id = ? AND product_id = ?",
        [qty, batch.branch_id, batch.product_id]
      );

      // 3. Audit log
      await connection.query(
        `INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
         VALUES ('product_batches', ?, 'UPDATE', ?, ?, NOW())`,
        [
          `disposal_batch_${batchId}`,
          JSON.stringify({
            event: "STOCK_DISPOSAL",
            batch_id: batchId,
            product_id: batch.product_id,
            branch_id: batch.branch_id,
            quantity: qty,
            reason: disposalReason,
          }),
          `employee_${session.employee_id}`,
        ]
      );

      await connection.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully disposed ${qty} units from Batch #${batchId} (${disposalReason}).`,
    });
  } catch (err: any) {
    await connection.rollback().catch(() => {});
    console.error("POST /api/inventory/disposal error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  } finally {
    connection.release();
  }
}
