import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const branches = await query(`
      SELECT branch_id, name, branch_code, city FROM branches WHERE is_active = 1 ORDER BY name
    `);
    return NextResponse.json(branches);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
