import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(req.url);

    const employeeIdParam = searchParams.get("cashierId");
    const branchIdParam = searchParams.get("branchId");

    const employeeId = session?.employee_id || (employeeIdParam ? Number(employeeIdParam) : null);
    const branchId = session?.branch_id || (branchIdParam ? Number(branchIdParam) : null);

    if (!employeeId) {
      return NextResponse.json({ error: "Missing cashier ID" }, { status: 400 });
    }

    // 1. Fetch Sign-in & Authentication logs from audit_log
    const empIdStr = String(employeeId);
    const changedBy = `employee_${employeeId}`;
    const auditRows: any = await query(
      `SELECT audit_id, record_id, action, new_value, changed_by, changed_at
       FROM audit_log
       WHERE (table_name = 'employees' AND record_id = ?)
          OR changed_by = ?
          OR new_value LIKE ?
       ORDER BY changed_at DESC
       LIMIT 30`,
      [empIdStr, changedBy, `%"employee_id":${employeeId}%`]
    );

    const signInLogs = (Array.isArray(auditRows) ? auditRows : []).map((row: any) => {
      let parsedValue: any = {};
      try {
        if (typeof row.new_value === "string") {
          parsedValue = JSON.parse(row.new_value);
        } else if (typeof row.new_value === "object" && row.new_value !== null) {
          parsedValue = row.new_value;
        }
      } catch {
        parsedValue = { raw: row.new_value };
      }

      const eventType =
        parsedValue.event ||
        (row.action === "INSERT" ? "LOGIN_SUCCESS" : row.action === "DELETE" ? "LOGOUT" : "SESSION_ACTIVITY");

      return {
        audit_id: row.audit_id,
        event: eventType,
        action: row.action,
        email: parsedValue.email || null,
        role: parsedValue.role || "CASHIER",
        timestamp: row.changed_at,
        details: parsedValue,
      };
    });

    // 2. Fetch Shift & Attendance records
    let shiftLogs: any[] = [];
    try {
      const shiftRows: any = await query(
        `SELECT shift_id, shift_date, start_time, end_time, clock_in, clock_out, status
         FROM shifts
         WHERE employee_id = ?
         ORDER BY shift_date DESC, start_time DESC
         LIMIT 10`,
        [employeeId]
      );
      shiftLogs = Array.isArray(shiftRows) ? shiftRows : [];
    } catch (err) {
      console.warn("Could not query shifts:", err);
    }

    // 3. Operational Notifications for this Branch & Cashier
    const notifications: any[] = [];

    // Notification A: Active Session info
    notifications.push({
      id: "notif-session",
      type: "SECURITY",
      title: "Authenticated Cashier Session",
      message: `Cashier terminal logged in. Returns and manager overrides require supervisory PIN.`,
      severity: "INFO",
      timestamp: new Date().toISOString(),
      is_read: false,
    });

    // Notification B: Stock Alerts for Branch (so cashier knows what's out of stock)
    if (branchId) {
      try {
        const stockRows: any = await query(
          `SELECT 
             sa.alert_id,
             sa.alert_type,
             sa.message,
             sa.created_at,
             p.name AS product_name,
             p.barcode
           FROM stock_alerts sa
           JOIN products p ON sa.product_id = p.product_id
           WHERE sa.branch_id = ? AND sa.is_resolved = 0
           ORDER BY sa.created_at DESC
           LIMIT 8`,
          [branchId]
        );

        if (Array.isArray(stockRows) && stockRows.length > 0) {
          stockRows.forEach((sa: any) => {
            const isLow = (sa.alert_type || "").toUpperCase().includes("LOW");
            notifications.push({
              id: `notif-stock-${sa.alert_id}`,
              type: "STOCK",
              title: isLow ? `Low Stock: ${sa.product_name}` : `Stock Notice: ${sa.product_name}`,
              message: sa.message || `Item ${sa.product_name} (${sa.barcode || ""}) is running low at this branch.`,
              severity: isLow ? "WARNING" : "ALERT",
              timestamp: sa.created_at,
              is_read: false,
            });
          });
        }
      } catch (err) {
        console.warn("Could not query stock alerts:", err);
      }

      // Notification C: Today's Daily Sales Summary Status
      try {
        const summaryRows: any = await query(
          `SELECT summary_id, transactions_count, total_sales
           FROM daily_sales_summary
           WHERE branch_id = ? AND summary_date = CURDATE()
           LIMIT 1`,
          [branchId]
        );

        if (Array.isArray(summaryRows) && summaryRows.length > 0) {
          notifications.push({
            id: "notif-summary-synced",
            type: "RECONCILIATION",
            title: "Daily Summary Recorded",
            message: `Today's sales summary is recorded (${summaryRows[0].transactions_count} orders, Rs. ${Number(
              summaryRows[0].total_sales || 0
            ).toFixed(2)}).`,
            severity: "SUCCESS",
            timestamp: new Date().toISOString(),
            is_read: false,
          });
        } else {
          notifications.push({
            id: "notif-summary-pending",
            type: "RECONCILIATION",
            title: "Daily Till Balancing Pending",
            message: "End-of-day summary has not yet been reconciled for today. Perform reconciliation before shift close.",
            severity: "INFO",
            timestamp: new Date().toISOString(),
            is_read: false,
          });
        }
      } catch (err) {
        console.warn("Could not query daily summary status:", err);
      }
    }

    // Notification D: Active Shift Status
    if (shiftLogs.length > 0) {
      const latestShift = shiftLogs[0];
      if (latestShift.clock_in && !latestShift.clock_out) {
        notifications.push({
          id: `notif-shift-${latestShift.shift_id}`,
          type: "SHIFT",
          title: "Active Shift Clock-In",
          message: `Clocked in at ${latestShift.clock_in} on ${latestShift.shift_date}. Status: ${latestShift.status}`,
          severity: "SUCCESS",
          timestamp: latestShift.shift_date,
          is_read: false,
        });
      }
    }

    return NextResponse.json({
      cashierId: employeeId,
      branchId,
      signInLogs,
      shiftLogs,
      notifications,
      unreadCount: notifications.length,
      lastLogin: signInLogs.length > 0 ? signInLogs[0].timestamp : null,
    });
  } catch (err: any) {
    console.error("GET /api/cashier/activity error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch cashier activity" }, { status: 500 });
  }
}
