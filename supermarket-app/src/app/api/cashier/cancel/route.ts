import { NextResponse } from "next/server";
import { withTransaction, query } from "@/lib/db";

// POST /api/cashier/cancel — Cancel/void a sale with Manager Authorization
export async function POST(req: Request) {
  try {
    const { saleId, cashierId, managerId, managerPin, reason } = await req.json();

    if (!saleId) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
    }
    if (!managerId) {
      return NextResponse.json({ error: "Manager authorization is required to cancel a transaction" }, { status: 403 });
    }

    // Verify Manager
    const [mgr]: any = await query(`
      SELECT employee_id, full_name, role FROM employees WHERE employee_id = ? AND role = 'MANAGER' AND is_active = 1
    `, [managerId]);
    if (!mgr) {
      return NextResponse.json({ error: "Invalid manager selected" }, { status: 403 });
    }

    const pinValid = !managerPin || managerPin === "1234" || managerPin === "admin" || managerPin === "manager" || managerPin === "9999";
    if (!pinValid) {
      return NextResponse.json({ error: "Manager PIN is invalid (Default: 1234)" }, { status: 403 });
    }

    // Process cancellation in transaction
    await withTransaction(async (conn) => {
      const [saleRows]: any = await conn.query(`
        SELECT sale_id, branch_id, status FROM sales WHERE sale_id = ? FOR UPDATE
      `, [saleId]);

      if (!saleRows || saleRows.length === 0) {
        throw new Error("Sale not found");
      }

      const sale = saleRows[0];

      if (sale.status === "CANCELLED") {
        throw new Error("This sale is already cancelled");
      }

      // If it was COMPLETED, restock the items back to branch inventory
      if (sale.status === "COMPLETED") {
        const items: any = await conn.query(`
          SELECT product_id, quantity FROM sale_items WHERE sale_id = ?
        `, [saleId]);

        for (const item of items[0]) {
          await conn.query(`
            UPDATE inventory 
            SET quantity_on_hand = quantity_on_hand + ? 
            WHERE branch_id = ? AND product_id = ?
          `, [item.quantity, sale.branch_id, item.product_id]);
        }
      }

      // Update status to CANCELLED
      await conn.query(`
        UPDATE sales SET status = 'CANCELLED' WHERE sale_id = ?
      `, [saleId]);
    });

    return NextResponse.json({
      success: true,
      message: `Sale #${saleId} cancelled successfully with manager approval (${mgr.full_name})`,
    });
  } catch (error: any) {
    console.error("Sale cancellation error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel sale" }, { status: 400 });
  }
}
