import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { authenticateRequest, logAuthEvent } from "@/lib/auth";
import { verifyBadgePayload } from "@/lib/badge";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

interface EmployeeLookup {
  employee_id: number;
  full_name: string;
  role: UserRole;
  is_active: number;
  branch_id: number;
}

interface ShiftRecord {
  shift_id: number;
  branch_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  clock_in: string | Date | null;
  clock_out: string | Date | null;
  status: "SCHEDULED" | "PRESENT" | "ABSENT" | "COMPLETED";
}

export async function POST(req: Request) {
  const auth = await authenticateRequest();
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
    }

    const { scan_data, branch_id: reqBranchId } = body as {
      scan_data?: unknown;
      branch_id?: unknown;
    };

    if (typeof scan_data !== "string" || scan_data.trim().length === 0) {
      return NextResponse.json(
        { error: "No barcode or QR data detected. Please scan badge." },
        { status: 400 }
      );
    }

    // 1. Verify badge cryptographic signature or format
    const verifiedBadge = verifyBadgePayload(scan_data);

    if (!verifiedBadge) {
      return NextResponse.json(
        { error: "Invalid or unrecognized staff badge. Cryptographic verification failed." },
        { status: 400 }
      );
    }

    // 2. Fetch employee master record
    const employee = await queryOne<EmployeeLookup>(
      `SELECT employee_id, full_name, role, is_active, branch_id
         FROM employees
        WHERE employee_id = ?
        LIMIT 1`,
      [verifiedBadge.employeeId]
    );

    if (!employee) {
      return NextResponse.json(
        { error: "Staff member not found in system records." },
        { status: 404 }
      );
    }

    if (employee.is_active !== 1) {
      return NextResponse.json(
        { error: `Account for ${employee.full_name} is inactive or archived.` },
        { status: 403 }
      );
    }

    // Branch scoping: admins can specify, other staff use session branch
    const effectiveBranchId =
      session.role === "ADMIN" && reqBranchId
        ? Number(reqBranchId)
        : session.branch_id;

    // 3. Find today's shift for this employee at this branch
    const shift = await queryOne<ShiftRecord>(
      `SELECT shift_id, branch_id, shift_date, start_time, end_time, clock_in, clock_out, status
         FROM shifts
        WHERE employee_id = ?
          AND branch_id = ?
          AND shift_date = CURDATE()
        ORDER BY CASE status
          WHEN 'PRESENT' THEN 1
          WHEN 'SCHEDULED' THEN 2
          WHEN 'COMPLETED' THEN 3
          ELSE 4
        END ASC
        LIMIT 1`,
      [employee.employee_id, effectiveBranchId]
    );

    if (!shift) {
      return NextResponse.json(
        {
          error: `No shift scheduled for ${employee.full_name} at this branch today (${new Date().toLocaleDateString()}). Please contact management.`,
          employee_name: employee.full_name,
          role: employee.role,
        },
        { status: 404 }
      );
    }

    const nowFormatted = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 4. Handle State Machine: SCHEDULED -> Clock-In
    if (shift.status === "SCHEDULED") {
      await query(
        `UPDATE shifts
            SET clock_in = NOW(),
                status = 'PRESENT'
          WHERE shift_id = ?`,
        [shift.shift_id]
      );

      await logAuthEvent({
        event: "LOGIN_SUCCESS",
        employee_id: employee.employee_id,
        role: employee.role,
        details: {
          action: "ATTENDANCE_CLOCK_IN",
          shift_id: shift.shift_id,
          branch_id: effectiveBranchId,
          is_signed: verifiedBadge.isSigned,
        },
      });

      return NextResponse.json({
        success: true,
        action: "CLOCK_IN",
        employee_id: employee.employee_id,
        employee_name: employee.full_name,
        role: employee.role,
        status: "PRESENT",
        time: nowFormatted,
        is_signed: verifiedBadge.isSigned,
        message: `Welcome, ${employee.full_name}! Check-In Successful.`,
      });
    }

    // 5. Handle State Machine: PRESENT -> Clock-Out (with cooldown guard)
    if (shift.status === "PRESENT") {
      // Cooldown check (minimum 2 minutes after clock-in to prevent accidental double-scans)
      const cooldownCheck = await queryOne<{ elapsed_minutes: number }>(
        `SELECT TIMESTAMPDIFF(MINUTE, clock_in, NOW()) AS elapsed_minutes
           FROM shifts
          WHERE shift_id = ?`,
        [shift.shift_id]
      );

      const elapsed = cooldownCheck?.elapsed_minutes ?? 0;
      if (elapsed < 2) {
        return NextResponse.json(
          {
            error: `Scan cooldown active. Please wait at least 2 minutes after check-in. (Checked in ${elapsed}m ago)`,
            employee_name: employee.full_name,
          },
          { status: 429 }
        );
      }

      await query(
        `UPDATE shifts
            SET clock_out = NOW(),
                status = 'COMPLETED'
          WHERE shift_id = ?`,
        [shift.shift_id]
      );

      // Fetch calculated hours from database function fn_work_hours
      const hoursResult = await queryOne<{ hours_worked: number | null }>(
        `SELECT fn_work_hours(clock_in, clock_out) AS hours_worked
           FROM shifts
          WHERE shift_id = ?`,
        [shift.shift_id]
      );

      const hoursWorked = hoursResult?.hours_worked ?? 0;

      await logAuthEvent({
        event: "LOGIN_SUCCESS",
        employee_id: employee.employee_id,
        role: employee.role,
        details: {
          action: "ATTENDANCE_CLOCK_OUT",
          shift_id: shift.shift_id,
          hours_worked: hoursWorked,
        },
      });

      return NextResponse.json({
        success: true,
        action: "CLOCK_OUT",
        employee_id: employee.employee_id,
        employee_name: employee.full_name,
        role: employee.role,
        status: "COMPLETED",
        hours_worked: hoursWorked,
        time: nowFormatted,
        is_signed: verifiedBadge.isSigned,
        message: `Goodbye, ${employee.full_name}! Check-Out Successful. (${hoursWorked} hrs recorded)`,
      });
    }

    // 6. Handle Completed / Absent
    if (shift.status === "COMPLETED") {
      return NextResponse.json(
        {
          error: `Attendance for ${employee.full_name} is already completed for today.`,
          employee_name: employee.full_name,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: `${employee.full_name} is marked as ABSENT for this shift. Please contact management.`,
        employee_name: employee.full_name,
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/shifts/scan-attendance error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
