import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/cashier/customers?q=... or ?id=... — Lookup customers by card, phone, name, or customer_id
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const id = searchParams.get("id")?.trim() || "";

    if (id) {
      const customers = await query<any>(`
        SELECT customer_id, card_no, full_name, phone, email, tier, points_balance, is_active
        FROM customers
        WHERE customer_id = ?
        LIMIT 1
      `, [id]);

      return NextResponse.json(customers, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    if (!q) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    const customers = await query<any>(`
      SELECT customer_id, card_no, full_name, phone, email, tier, points_balance, is_active
      FROM customers
      WHERE is_active = 1 
        AND (card_no LIKE ? OR phone LIKE ? OR full_name LIKE ? OR email LIKE ?)
      ORDER BY full_name ASC
      LIMIT 10
    `, [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);

    return NextResponse.json(customers, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Customer lookup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/cashier/customers — Register new customer loyalty account atomically
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, phone, email, city, giveBonus } = body;

    // Step 1 & 2: Validate inputs
    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: "Customer full name is required" }, { status: 400 });
    }
    const cleanPhone = phone?.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      return NextResponse.json({ error: "A valid phone number (at least 9 digits) is required" }, { status: 400 });
    }

    // Step 2: Validate phone uniqueness
    const [existingPhone]: any = await query(
      `SELECT customer_id, card_no, full_name FROM customers WHERE phone = ? LIMIT 1`,
      [cleanPhone]
    );
    if (existingPhone) {
      return NextResponse.json(
        { error: `Phone number is already registered to customer "${existingPhone.full_name}" (${existingPhone.card_no})` },
        { status: 409 }
      );
    }

    // Step 2b: Validate email is provided and valid
    const cleanEmail = email?.trim();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json(
        { error: "A valid customer email is required for loyalty rewards updates" },
        { status: 400 }
      );
    }

    // Step 2c: Validate email uniqueness
    const [existingEmail]: any = await query(
      `SELECT customer_id, card_no, full_name FROM customers WHERE email = ? LIMIT 1`,
      [cleanEmail]
    );
    if (existingEmail) {
      return NextResponse.json(
        { error: `Email address "${cleanEmail}" is already registered to customer "${existingEmail.full_name}" (${existingEmail.card_no})` },
        { status: 409 }
      );
    }

    // Step 3: Generate loyalty card number
    let card_no = body.card_no?.trim();
    if (!card_no) {
      const [maxRow]: any = await query(`
        SELECT MAX(customer_id) AS max_id FROM customers
      `);
      const nextId = (Number(maxRow?.max_id || 0) + 1);
      card_no = `LOY${String(nextId).padStart(6, "0")}`;

      // Double-check unique card_no
      const [existingCard]: any = await query(
        `SELECT customer_id FROM customers WHERE card_no = ? LIMIT 1`,
        [card_no]
      );
      if (existingCard) {
        card_no = `LOY${String(nextId + 100).padStart(6, "0")}`;
      }
    }

    const startingPoints = giveBonus ? 100 : 0;

    // Step 4 & 5: Perform atomic registration
    const result = await withTransaction(async (conn) => {
      // Insert customer: Starting Tier BRONZE, Active: 1
      const [insertRes]: any = await conn.query(
        `INSERT INTO customers (
          card_no, full_name, phone, email, city, join_date, tier, points_balance, is_active
        ) VALUES (?, ?, ?, ?, ?, CURDATE(), 'BRONZE', ?, 1)`,
        [
          card_no,
          full_name.trim(),
          cleanPhone,
          cleanEmail,
          city?.trim() || "Galle",
          startingPoints,
        ]
      );

      const customerId = insertRes.insertId;

      // If welcome bonus was requested, record EARN transaction
      if (startingPoints > 0) {
        const branchId = body.branch_id ? Number(body.branch_id) : 1;
        await conn.query(
          `INSERT INTO loyalty_transactions (
            customer_id, branch_id, sale_id, points, type, note, created_at
          ) VALUES (?, ?, NULL, ?, 'EARN', 'Loyalty program joining bonus', NOW())`,
          [customerId, branchId, startingPoints]
        );
      }

      // Record initial tier in history
      try {
        await conn.query(
          `INSERT INTO customer_tier_history (
            customer_id, old_tier, new_tier, reason, changed_at
          ) VALUES (?, NULL, 'BRONZE', 'Initial membership tier upon registration', NOW())`,
          [customerId]
        );
      } catch (tierErr) {
        // Table might not fail transaction
        console.warn("Tier history log warning:", tierErr);
      }

      return {
        customer_id: customerId,
        card_no,
        full_name: full_name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        city: city?.trim() || "Galle",
        tier: "BRONZE",
        points_balance: startingPoints,
        is_active: 1,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Loyalty customer ${result.full_name} registered successfully with Card ${result.card_no}`,
      customer: result,
    });
  } catch (error: any) {
    console.error("Customer registration error:", error);
    return NextResponse.json({ error: error.message || "Failed to register customer" }, { status: 500 });
  }
}
