import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    let branchId = searchParams.get("branchId");

    if (!branchId) {
      const session = await getServerSession();
      if (session?.branch_id) {
        branchId = String(session.branch_id);
      }
    }

    let sql = `
      SELECT 
        c.customer_id,
        c.card_no,
        c.full_name,
        c.phone,
        c.email,
        c.city,
        c.join_date,
        c.tier,
        c.points_balance,
        c.is_active
      FROM customers c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (c.card_no = ? OR c.phone LIKE ? OR c.full_name LIKE ?)`;
      params.push(search, `%${search}%`, `%${search}%`);
    }

    if (branchId && branchId !== "ALL" && branchId !== "0") {
      const branchRows: any = await query(
        `SELECT branch_id, branch_code, name, city FROM branches WHERE branch_id = ? LIMIT 1`,
        [branchId]
      );
      const branchInfo = branchRows.length > 0 ? branchRows[0] : null;
      const branchCity = branchInfo?.city ? String(branchInfo.city).trim() : "";
      const branchName = branchInfo?.name ? String(branchInfo.name).trim() : "";

      let hasBranchCol = false;
      try {
        await query(`SELECT branch_id FROM customers LIMIT 1`);
        hasBranchCol = true;
      } catch {
        hasBranchCol = false;
      }

      if (branchCity || branchName) {
        if (hasBranchCol) {
          sql += ` AND (
            c.branch_id = ?
            OR (
              c.city IS NOT NULL AND TRIM(c.city) != ''
              AND (
                LOWER(TRIM(c.city)) = LOWER(?)
                OR LOWER(?) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
                OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(?), '%')
              )
            )
          )`;
          params.push(branchId, branchCity, branchName, branchCity);
        } else {
          sql += ` AND (
            c.city IS NOT NULL AND TRIM(c.city) != ''
            AND (
              LOWER(TRIM(c.city)) = LOWER(?)
              OR LOWER(?) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
              OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(?), '%')
            )
          )`;
          params.push(branchCity, branchName, branchCity);
        }
      } else {
        if (hasBranchCol) {
          sql += ` AND (
            c.branch_id = ?
            OR (
              c.city IS NOT NULL AND TRIM(c.city) != ''
              AND EXISTS (
                SELECT 1 FROM branches b
                WHERE b.branch_id = ?
                  AND (
                    LOWER(TRIM(c.city)) = LOWER(TRIM(b.city))
                    OR LOWER(b.name) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
                    OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(TRIM(b.city)), '%')
                  )
              )
            )
          )`;
          params.push(branchId, branchId);
        } else {
          sql += ` AND (
            c.city IS NOT NULL AND TRIM(c.city) != ''
            AND EXISTS (
              SELECT 1 FROM branches b
              WHERE b.branch_id = ?
                AND (
                  LOWER(TRIM(c.city)) = LOWER(TRIM(b.city))
                  OR LOWER(b.name) LIKE CONCAT('%', LOWER(TRIM(c.city)), '%')
                  OR LOWER(TRIM(c.city)) LIKE CONCAT('%', LOWER(TRIM(b.city)), '%')
                )
            )
          )`;
          params.push(branchId);
        }
      }
    }

    sql += ` ORDER BY c.customer_id DESC`;

    const customers = await query(sql, params);
    return NextResponse.json(customers);
  } catch (err: any) {
    console.error("GET /api/customers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, phone, email, city } = body;

    if (!full_name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Auto-generate sequential card number like C0001, C0002, ..., C0006 -> C0007
    let card_no = body.card_no?.trim();
    if (!card_no) {
      const [maxCardRow]: any = await query(`
        SELECT MAX(CAST(SUBSTRING(card_no, 2) AS UNSIGNED)) AS max_num
        FROM customers
        WHERE card_no REGEXP '^C[0-9]+$' 
          AND CAST(SUBSTRING(card_no, 2) AS UNSIGNED) < 10000
      `);

      let nextNum = 1;
      if (maxCardRow?.max_num && Number(maxCardRow.max_num) > 0) {
        nextNum = Number(maxCardRow.max_num) + 1;
      } else {
        const [countRow]: any = await query(`SELECT COUNT(*) AS total FROM customers`);
        nextNum = Number(countRow?.total ?? 0) + 1;
      }

      card_no = `C${String(nextNum).padStart(4, "0")}`;
    }

    let customer_id: number;
    try {
      const procRes: any = await query(
        `CALL register_customer(?, ?, ?, ?, ?)`,
        [card_no, full_name, phone, email || null, city || "Colombo"]
      );
      customer_id = procRes?.[0]?.[0]?.customer_id || procRes?.insertId;
    } catch {
      const result: any = await query(
        `INSERT INTO customers (card_no, full_name, phone, email, city, join_date, tier, points_balance, is_active)
         VALUES (?, ?, ?, ?, ?, CURDATE(), 'BRONZE', 0, 1)`,
        [card_no, full_name, phone, email || null, city || null]
      );
      customer_id = result.insertId;
    }

    return NextResponse.json({
      success: true,
      customer_id,
      card_no,
    });
  } catch (err: any) {
    console.error("POST /api/customers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, card_no, full_name, phone, email, city, tier, points_balance, join_date, is_active } = body;

    if (!customer_id || !full_name || !phone) {
      return NextResponse.json({ error: "Customer ID, full name and phone number are required" }, { status: 400 });
    }

    // Format join_date if provided (YYYY-MM-DD)
    let formattedJoinDate: string | null = null;
    if (join_date) {
      formattedJoinDate = new Date(join_date).toISOString().slice(0, 10);
    }

    await query(
      `UPDATE customers
       SET full_name = ?,
           phone = ?,
           email = ?,
           city = ?,
           tier = COALESCE(?, tier),
           points_balance = COALESCE(?, points_balance),
           is_active = COALESCE(?, is_active)
       WHERE customer_id = ?`,
      [
        full_name,
        phone,
        email || null,
        city || null,
        tier || null,
        points_balance !== undefined ? points_balance : null,
        is_active !== undefined ? is_active : null,
        customer_id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch (err: any) {
    console.error("PUT /api/customers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
