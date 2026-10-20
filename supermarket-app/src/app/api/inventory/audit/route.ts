import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "low_stock" | "expiring_batches"
    const branchId = Number(searchParams.get("branchId") || 1);

    if (type === "expiring_batches") {
      // ADBMS Stock Clerk Stored Procedure: sp_expiring_batches
      const [rows]: any = await query("CALL sp_expiring_batches(?)", [branchId]);
      return NextResponse.json(rows || []);
    } else {
      // ADBMS Stock Clerk Stored Procedure: sp_check_low_stock
      const [rows]: any = await query("CALL sp_check_low_stock(?)", [branchId]);
      return NextResponse.json(rows || []);
    }
  } catch (err: any) {
    console.error("GET /api/inventory/audit error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
