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
      const list = Array.isArray(rows) ? rows : [];
      if (list.length > 0) {
        const productIds = Array.from(new Set(list.map((r: any) => r.product_id).filter(Boolean)));
        if (productIds.length > 0) {
          const prods: any = await query(
            `SELECT product_id, name AS product_name, barcode FROM products WHERE product_id IN (${productIds.map(() => "?").join(",")})`,
            productIds
          );
          const prodMap = new Map((prods || []).map((p: any) => [p.product_id, p]));
          return NextResponse.json(
            list.map((r: any) => ({
              ...r,
              product_name: (prodMap.get(r.product_id) as any)?.product_name || "Unknown Product",
              barcode: (prodMap.get(r.product_id) as any)?.barcode || "",
            }))
          );
        }
      }
      return NextResponse.json(list);
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
