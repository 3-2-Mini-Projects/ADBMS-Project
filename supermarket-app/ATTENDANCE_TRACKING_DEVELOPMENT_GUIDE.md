# Attendance Tracking System — Implementation & Integration Guide

A complete, standalone engineering blueprint for replicating or migrating the QR-code-driven Attendance Tracking System into another project.

---

## 1. System Overview & Architecture

The Attendance Tracking System provides secure employee check-in and check-out via cryptographically signed QR codes. It enforces shift windows and grace periods, calculates late arrivals and working durations, synchronizes with leave management in real time, logs all administrative corrections into an immutable audit trail, and exports printable reports.

```mermaid
flowchart TD
    Staff[Staff Member] -->|Presents QR Badge| Scanner[QR Scanner Terminal / Web App]
    Scanner -->|POST /api/attendance/scan| API[Express API Server]
    API -->|HMAC-SHA256 Verification| Crypto[crypto Module]
    API -->|Shift & Grace Logic| DB[(Relational Database)]
    
    subgraph Data Layer
        DB --> AttTable[attendance]
        DB --> EditLogs[attendance_edit_logs]
        DB --> Settings[attendance_settings]
        DB --> RoleTable[roles / departments]
        DB --> LeaveTable[leave_requests]
    end

    Admin[Admin / HR Portal] -->|Audit & Reports| AdminUI[Management Dashboard]
    AdminUI -->|View & Filter Logs| API
    AdminUI -->|Export PDF Reports| API
    AdminUI -->|Configure Shifts & Rules| API
    AdminUI -->|Manual Edits with Reasons| API
    LeaveModule[Leave Module] -->|Real-Time Status Sync| AttTable
    Cron[Daily Scheduled Cron] -->|Auto-Mark Absentees| AttTable
```

---

## 2. Technology Stack & Prerequisites

### Backend Dependencies
```bash
npm install dayjs qrcode dotenv
# ORM & Database Driver (e.g., Sequelize + MySQL/Postgres)
npm install sequelize mysql2
# Cron job scheduler for automated absentee processing
npm install node-cron
```

### Frontend Dependencies
```bash
# Camera QR code reader, printable reports, and UI icons
npm install html5-qrcode react-to-print lucide-react react-icons axios
```

### Environment Configuration
Ensure the backend environment defines a dedicated 32+ character signing secret:
```env
PORT=5000
DATABASE_URL=mysql://user:password@localhost:3306/target_db
QR_SECRET=replace_with_a_secure_random_hmac_secret_key_minimum_32_chars
```

---

## 3. Database Schema & Data Models

```mermaid
erDiagram
    STAFF ||--o{ ATTENDANCE : "logs"
    ATTENDANCE ||--o{ ATTENDANCE_EDIT_LOG : "has audits"
    ROLES ||--o{ STAFF : "categorizes"
    ATTENDANCE_SETTING

    ATTENDANCE {
        int attendanceId PK
        string staffId FK
        date attendanceDate
        datetime checkInTime
        datetime checkOutTime
        float workingHours
        int workingMinutes
        int lateMinutes
        enum status "Present, Late, Absent, On Leave"
        enum attendanceMethod "QR"
        string remarks
    }

    ATTENDANCE_EDIT_LOG {
        int editLogId PK
        int attendanceId FK
        datetime oldCheckIn
        datetime newCheckIn
        datetime oldCheckOut
        datetime newCheckOut
        string reason
        string editedBy
        datetime editedAt
    }

    ATTENDANCE_SETTING {
        int settingId PK
        string settingKey UK
        string settingValue
        string description
    }
```

### SQL Table Definitions (DDL)

```sql
-- 1. System Settings Store
CREATE TABLE attendance_settings (
    settingId INT AUTO_INCREMENT PRIMARY KEY,
    settingKey VARCHAR(100) NOT NULL UNIQUE,
    settingValue VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Daily Attendance Records
CREATE TABLE attendance (
    attendanceId INT AUTO_INCREMENT PRIMARY KEY,
    staffId VARCHAR(20) NOT NULL,
    attendanceDate DATE NOT NULL,
    checkInTime DATETIME NULL,
    checkOutTime DATETIME NULL,
    workingHours FLOAT DEFAULT 0,
    workingMinutes INT DEFAULT 0,
    lateMinutes INT DEFAULT 0,
    status ENUM('Present', 'Late', 'Absent', 'On Leave') DEFAULT 'Present',
    attendanceMethod ENUM('QR') DEFAULT 'QR',
    remarks VARCHAR(255) NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_staff_date (staffId, attendanceDate),
    INDEX idx_attendance_date (attendanceDate),
    INDEX idx_status (status)
);

-- 3. Audit Log for Manual Edits
CREATE TABLE attendance_edit_logs (
    editLogId INT AUTO_INCREMENT PRIMARY KEY,
    attendanceId INT NOT NULL,
    oldCheckIn DATETIME NULL,
    newCheckIn DATETIME NULL,
    oldCheckOut DATETIME NULL,
    newCheckOut DATETIME NULL,
    reason VARCHAR(255) NOT NULL,
    editedBy VARCHAR(100) NOT NULL,
    editedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_edit FOREIGN KEY (attendanceId) REFERENCES attendance(attendanceId) ON DELETE CASCADE
);

-- 4. Shift Columns on Roles / Departments Table
ALTER TABLE roles 
ADD COLUMN officeStartTime VARCHAR(5) NULL DEFAULT '08:00',
ADD COLUMN officeEndTime VARCHAR(5) NULL DEFAULT '17:00',
ADD COLUMN gracePeriodMinutes INT NULL DEFAULT 10,
ADD COLUMN standardWorkingHours DECIMAL(4, 1) NULL DEFAULT 8.0;
```

---

## 4. Cryptographic QR Engine

### Payload Specification
```json
{
  "staffId": "EMP-0014",
  "type": "attendance",
  "version": 1
}
```

### Generation Service (`qrService.js`)
```javascript
import crypto from "crypto";
import QRCode from "qrcode";

export async function generateStaffQRCode(staffId) {
    if (!process.env.QR_SECRET) {
        throw new Error("QR_SECRET environment variable is required.");
    }

    const payload = {
        staffId,
        type: "attendance",
        version: 1
    };

    const signature = crypto
        .createHmac("sha256", process.env.QR_SECRET)
        .update(JSON.stringify(payload))
        .digest("hex");

    const fullPayload = JSON.stringify({
        ...payload,
        signature
    });

    return QRCode.toBuffer(fullPayload, {
        width: 400,
        margin: 2
    });
}
```

### Verification Logic (`qrVerifier.js`)
```javascript
import crypto from "crypto";

export function verifyScannedQR(scannedData) {
    if (!scannedData || typeof scannedData !== "object") {
        throw new Error("Invalid QR Code payload structure.");
    }

    const { signature, ...payload } = scannedData;

    const orderedPayload = {
        staffId: payload.staffId,
        type: payload.type,
        version: Number(payload.version)
    };

    const expectedSignature = crypto
        .createHmac("sha256", process.env.QR_SECRET)
        .update(JSON.stringify(orderedPayload))
        .digest("hex");

    if (signature !== expectedSignature) {
        throw new Error("Invalid QR Code signature. Verification failed.");
    }

    if (payload.type !== "attendance") {
        throw new Error("Invalid QR Code type.");
    }

    if (Number(payload.version) !== 1) {
        throw new Error("Unsupported QR version.");
    }

    return payload.staffId;
}
```

---

## 5. Attendance State Machine & Service Layer

```mermaid
stateDiagram-v2
    [*] --> Unrecorded: Beginning of Day
    
    Unrecorded --> Present: First Scan (now <= OfficeStart + Grace)
    Unrecorded --> Late: First Scan (now > OfficeStart + Grace)
    Unrecorded --> Closed: First Scan (now > OfficeEnd) -> REJECT
    Unrecorded --> Absent: Absentee Evaluation Triggered
    Unrecorded --> OnLeave: Approved Leave Request Exists
    
    Present --> CheckedOut: Second Scan (elapsed >= Cooldown)
    Late --> CheckedOut: Second Scan (elapsed >= Cooldown)
    
    Present --> Present: Second Scan (elapsed < Cooldown) -> REJECT
    Late --> Late: Second Scan (elapsed < Cooldown) -> REJECT
    
    CheckedOut --> [*]: Third Scan -> REJECT (Completed)
    Absent --> [*]: Scan Attempt -> REJECT (Marked Absent)
```

### Complete Implementation (`attendanceService.js`)

```javascript
import dayjs from "dayjs";
import { Op } from "sequelize";
import { Attendance, AttendanceSetting, AttendanceEditLog, StaffMember, Role, LeaveRequest } from "../models/index.js";
import { verifyScannedQR } from "./qrVerifier.js";

// 1. Shift Schedule Resolution (Role Override > Global Setting > Default)
export async function resolveStaffSchedule(staff) {
    const settingsList = await AttendanceSetting.findAll();
    const settings = Object.fromEntries(settingsList.map(s => [s.settingKey, s.settingValue]));

    const role = staff.Role || (staff.roleId ? await Role.findByPk(staff.roleId) : null);

    return {
        officeStartTime: role?.officeStartTime || settings.OFFICE_START_TIME || "08:00",
        officeEndTime: role?.officeEndTime || settings.OFFICE_END_TIME || "17:00",
        gracePeriodMinutes: Number(role?.gracePeriodMinutes ?? settings.GRACE_PERIOD ?? 10),
        standardWorkingHours: Number(role?.standardWorkingHours ?? settings.STANDARD_WORKING_HOURS ?? 8)
    };
}

// 2. Scan Processor
export async function scanAttendance(scannedJson) {
    const staffId = verifyScannedQR(scannedJson);

    const isEnabled = (await getSetting("ATTENDANCE_ENABLED", "true")) === "true";
    if (!isEnabled) {
        throw new Error("Attendance scanning is currently disabled.");
    }

    const staff = await StaffMember.findOne({
        where: { staffId },
        include: [{ model: Role }]
    });

    if (!staff) throw new Error("Staff member not found.");

    const today = dayjs().format("YYYY-MM-DD");
    let record = await Attendance.findOne({ where: { staffId, attendanceDate: today } });

    if (record && record.status === "Absent") {
        return { success: false, message: "Staff member is marked as Absent today.", staffName: staff.name };
    }

    // First Scan: Check-In
    if (!record) {
        const now = dayjs();
        const schedule = await resolveStaffSchedule(staff);
        
        const [endHour, endMin] = schedule.officeEndTime.split(":").map(Number);
        const shiftEnd = dayjs(today).hour(endHour).minute(endMin).second(0);

        if (now.isAfter(shiftEnd)) {
            return { success: false, message: "Check-in window closed for this shift.", staffName: staff.name };
        }

        const [startHour, startMin] = schedule.officeStartTime.split(":").map(Number);
        const shiftStart = dayjs(today).hour(startHour).minute(startMin).second(0);
        const shiftStartWithGrace = shiftStart.add(schedule.gracePeriodMinutes, "minute");

        let lateMinutes = 0;
        let status = "Present";

        if (now.isAfter(shiftStartWithGrace)) {
            lateMinutes = now.diff(shiftStart, "minute");
            status = "Late";
        }

        record = await Attendance.create({
            staffId,
            attendanceDate: today,
            checkInTime: new Date(),
            lateMinutes,
            status,
            attendanceMethod: "QR"
        });

        return {
            success: true,
            action: "CHECK_IN",
            message: `Check-In Successful. Welcome ${staff.name}`,
            staffName: staff.name,
            attendance: record
        };
    }

    // Second Scan: Check-Out
    if (record.checkOutTime === null) {
        const now = dayjs();
        const checkIn = dayjs(record.checkInTime);
        const cooldown = parseInt(await getSetting("QR_SCAN_COOLDOWN", "3"), 10);

        if (now.diff(checkIn, "minute") < cooldown) {
            return {
                success: false,
                message: `Scan cooldown active. Please wait at least ${cooldown} minutes after check-in.`,
                staffName: staff.name
            };
        }

        const workingMinutes = now.diff(checkIn, "minute");
        const workingHours = Number((workingMinutes / 60).toFixed(2));

        record.checkOutTime = new Date();
        record.workingMinutes = workingMinutes;
        record.workingHours = workingHours;
        await record.save();

        return {
            success: true,
            action: "CHECK_OUT",
            message: `Check-Out Successful. Goodbye ${staff.name}`,
            staffName: staff.name,
            attendance: record
        };
    }

    // Third Scan: Completed
    return {
        success: false,
        message: "Attendance already completed today.",
        staffName: staff.name
    };
}

// 3. Manual Correction with Audit Logging
export async function updateAttendance(attendanceId, { checkInTime, checkOutTime, reason, editedBy }) {
    const allowEdit = (await getSetting("ALLOW_MANUAL_EDIT", "true")) === "true";
    if (!allowEdit) throw new Error("Manual attendance editing is disabled.");

    if (!reason || !reason.trim()) throw new Error("Reason for edit is required.");
    if (!checkInTime && !checkOutTime) throw new Error("Check-in and check-out times cannot both be empty.");

    if (checkInTime && checkOutTime) {
        if (!dayjs(checkOutTime).isAfter(dayjs(checkInTime))) {
            throw new Error("Check-out time must be after check-in time.");
        }
    }

    const record = await Attendance.findByPk(attendanceId, {
        include: [{ model: StaffMember, include: [Role] }]
    });
    if (!record) throw new Error("Attendance record not found.");

    // Write audit trail entry
    await AttendanceEditLog.create({
        attendanceId,
        oldCheckIn: record.checkInTime,
        newCheckIn: checkInTime ? new Date(checkInTime) : null,
        oldCheckOut: record.checkOutTime,
        newCheckOut: checkOutTime ? new Date(checkOutTime) : null,
        reason: reason.trim(),
        editedBy: editedBy || "Administrator"
    });

    record.checkInTime = checkInTime ? new Date(checkInTime) : null;
    record.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;

    // Recalculate status and lateness against role schedule
    if (record.checkInTime) {
        const schedule = await resolveStaffSchedule(record.StaffMember);
        const [startH, startM] = schedule.officeStartTime.split(":").map(Number);
        const officeStart = dayjs(record.attendanceDate).hour(startH).minute(startM).second(0);
        const graceEnd = officeStart.add(schedule.gracePeriodMinutes, "minute");

        const checkIn = dayjs(record.checkInTime);
        if (checkIn.isAfter(graceEnd)) {
            record.lateMinutes = checkIn.diff(officeStart, "minute");
            record.status = "Late";
        } else {
            record.lateMinutes = 0;
            record.status = "Present";
        }
    } else {
        record.lateMinutes = 0;
        record.status = "Present";
    }

    // Recalculate working duration
    if (record.checkInTime && record.checkOutTime) {
        const mins = dayjs(record.checkOutTime).diff(dayjs(record.checkInTime), "minute");
        record.workingMinutes = mins;
        record.workingHours = Number((mins / 60).toFixed(2));
    } else {
        record.workingMinutes = 0;
        record.workingHours = 0;
    }

    await record.save();
    return record;
}

// 4. Absentee Processing
export async function markAbsentees() {
    const today = dayjs().format("YYYY-MM-DD");
    const allStaff = await StaffMember.findAll({ include: [Role] });
    const todayRecords = await Attendance.findAll({ where: { attendanceDate: today } });

    const recordedStaffIds = new Set(todayRecords.map(r => r.staffId));
    const missingStaff = allStaff.filter(s => !recordedStaffIds.has(s.staffId));

    if (missingStaff.length === 0) {
        return { success: true, message: "All staff already accounted for today.", markedCount: 0 };
    }

    const missingIds = missingStaff.map(s => s.staffId);
    const activeLeaves = await LeaveRequest.findAll({
        where: {
            staffId: { [Op.in]: missingIds },
            status: "Approved",
            startDate: { [Op.lte]: today },
            endDate: { [Op.gte]: today }
        }
    });
    const staffOnLeave = new Set(activeLeaves.map(l => l.staffId));

    const now = dayjs();
    const rowsToCreate = [];

    for (const staff of missingStaff) {
        const schedule = await resolveStaffSchedule(staff);
        const [endH, endM] = schedule.officeEndTime.split(":").map(Number);
        const shiftEnd = dayjs(today).hour(endH).minute(endM).second(0);

        // Do not mark absent if shift is still active
        if (now.isBefore(shiftEnd)) continue;

        const isOnLeave = staffOnLeave.has(staff.staffId);
        rowsToCreate.push({
            staffId: staff.staffId,
            attendanceDate: today,
            checkInTime: null,
            checkOutTime: null,
            workingHours: 0,
            workingMinutes: 0,
            lateMinutes: 0,
            status: isOnLeave ? "On Leave" : "Absent",
            attendanceMethod: "QR",
            remarks: isOnLeave ? "Automatically marked on leave" : "Automatically marked absent"
        });
    }

    if (rowsToCreate.length > 0) {
        await Attendance.bulkCreate(rowsToCreate);
    }

    return {
        success: true,
        message: `Marked ${rowsToCreate.length} employees as absent or on leave.`,
        markedCount: rowsToCreate.length
    };
}

// Setting Helper
async function getSetting(key, fallback) {
    const s = await AttendanceSetting.findOne({ where: { settingKey: key } });
    return s ? s.settingValue : fallback;
}
```

---

## 6. Subsystem Hooks (Leave Module Synchronization)

Integrate this hook in your project's Leave Request controller or lifecycle events:

```javascript
// Call after LeaveRequest is created, updated, or deleted
export async function syncLeaveToAttendance(leaveRequest) {
    const { staffId, startDate, endDate, status } = leaveRequest;

    const dates = [];
    let curr = dayjs(startDate);
    const end = dayjs(endDate);
    while (curr.isBefore(end) || curr.isSame(end, "day")) {
        dates.push(curr.format("YYYY-MM-DD"));
        curr = curr.add(1, "day");
    }

    if (status === "Approved") {
        for (const date of dates) {
            const [record, created] = await Attendance.findOrCreate({
                where: { staffId, attendanceDate: date },
                defaults: {
                    staffId,
                    attendanceDate: date,
                    status: "On Leave",
                    attendanceMethod: "QR",
                    remarks: "Leave Approved"
                }
            });
            if (!created && record.status === "Absent") {
                await record.update({ status: "On Leave", remarks: "Leave Approved" });
            }
        }
    } else if (["Rejected", "Cancelled"].includes(status)) {
        for (const date of dates) {
            const record = await Attendance.findOne({ where: { staffId, attendanceDate: date } });
            if (record && record.status === "On Leave") {
                if (dayjs(date).isAfter(dayjs())) {
                    await record.destroy(); // Remove future placeholders
                } else {
                    await record.update({ status: "Absent", remarks: "Leave Cancelled/Rejected" });
                }
            }
        }
    }
}
```

---

## 7. Background Automation (Cron Job)

Create a scheduled worker (`jobs/attendanceCron.js`) to evaluate absent staff nightly:

```javascript
import cron from "node-cron";
import { markAbsentees } from "../services/attendanceService.js";

export function initAttendanceCronJobs() {
    // Runs at 23:55 every evening
    cron.schedule("55 23 * * *", async () => {
        try {
            console.log("⏰ [CRON] Running daily absentee evaluation...");
            const res = await markAbsentees();
            console.log(`✅ [CRON] ${res.message}`);
        } catch (error) {
            console.error("❌ [CRON] Failed to evaluate absentees:", error.message);
        }
    });
}
```

---

## 8. REST API & Route Definitions

Protect all endpoints using your authentication and role-based access middleware:

```javascript
import express from "express";
import {
    scanAttendanceController,
    getAttendanceRecordsController,
    getDailyStatsController,
    getAttendanceByIdController,
    updateAttendanceController,
    getStaffAttendanceHistoryController,
    markAbsenteesController,
    getAttendanceSettingsController,
    updateAttendanceSettingsController,
    getRoleSettingsController,
    updateRoleSettingsController,
    getStaffQRCodeController
} from "../controllers/attendanceController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Scanner terminal endpoint
router.post("/scan", requireAuth, requireRole(["admin", "receptionist", "terminal"]), scanAttendanceController);

// 2. Reporting & records
router.get("/records", requireAuth, requireRole(["admin", "hr"]), getAttendanceRecordsController);
router.get("/daily-stats", requireAuth, requireRole(["admin", "hr"]), getDailyStatsController);
router.get("/staff/:staffId", requireAuth, getStaffAttendanceHistoryController);
router.get("/:attendanceId", requireAuth, requireRole(["admin", "hr"]), getAttendanceByIdController);

// 3. Manual correction & absentee execution
router.put("/:attendanceId", requireAuth, requireRole(["admin"]), updateAttendanceController);
router.post("/mark-absentees", requireAuth, requireRole(["admin"]), markAbsenteesController);

// 4. Configuration
router.get("/settings", requireAuth, requireRole(["admin"]), getAttendanceSettingsController);
router.put("/settings", requireAuth, requireRole(["admin"]), updateAttendanceSettingsController);
router.get("/role-settings", requireAuth, requireRole(["admin"]), getRoleSettingsController);
router.put("/role-settings", requireAuth, requireRole(["admin"]), updateRoleSettingsController);

// 5. Staff QR Code Badge Image
router.get("/staff/:staffId/qr-code", requireAuth, getStaffQRCodeController);

export default router;
```

---

## 9. Frontend Integration

### 1. Camera QR Scanner Component (`QRScanner.jsx`)
```jsx
import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({ onScanSuccess }) {
    const isProcessing = useRef(false);

    useEffect(() => {
        const container = document.getElementById("qr-reader");
        if (container) container.innerHTML = "";

        const scanner = new Html5Qrcode("qr-reader");

        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
                if (isProcessing.current) return;
                isProcessing.current = true;
                try {
                    const parsed = JSON.parse(decodedText);
                    await onScanSuccess(parsed);
                } catch (e) {
                    console.error("Malformed QR payload:", e);
                } finally {
                    setTimeout(() => { isProcessing.current = false; }, 3000);
                }
            },
            () => {}
        );

        return () => {
            scanner.stop().then(() => scanner.clear()).catch(() => {});
        };
    }, []);

    return (
        <div id="qr-reader" className="w-full max-w-sm rounded-2xl overflow-hidden shadow-inner bg-slate-50" />
    );
}
```

### 2. Printable PDF Reports via `react-to-print`
Wrap a table inside a `forwardRef` printable component:
```jsx
import React, { forwardRef } from "react";

const PrintableAttendanceReport = forwardRef(({ records, title, meta }, ref) => (
    <div style={{ display: "none" }}>
        <div ref={ref} className="p-8 font-sans print-page text-slate-800">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-slate-500 mb-4">Date Range: {meta.dateRange}</p>
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="border-b">
                        <th className="py-2">Date</th>
                        <th>Staff ID</th>
                        <th>Name</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Hours</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((r, i) => (
                        <tr key={i} className="border-b">
                            <td className="py-2">{r.attendanceDate}</td>
                            <td>{r.staffId}</td>
                            <td>{r.StaffMember?.name || "-"}</td>
                            <td>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "-"}</td>
                            <td>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "-"}</td>
                            <td>{r.workingHours || 0}h</td>
                            <td>{r.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
));

export default PrintableAttendanceReport;
```

---

## 10. Implementation Roadmap

```
Step 1: Install packages (qrcode, html5-qrcode, react-to-print, node-cron, dayjs).
Step 2: Run database migrations for attendance, attendance_settings, attendance_edit_logs, and roles.
Step 3: Implement qrService.js and qrVerifier.js with HMAC-SHA256 signing.
Step 4: Build attendanceService.js (scanning state machine, lateness, cooldown, audit logging).
Step 5: Bind attendance routes and apply authentication & authorization middleware.
Step 6: Hook syncLeaveToAttendance into your project's Leave Request events.
Step 7: Launch the background cron worker to automate nightly absentee evaluation.
Step 8: Mount frontend components (QRScanner.jsx, AttendanceRecords.jsx, settings, and PDF reports).
Step 9: Run verification test suite covering edge cases and acceptance criteria.
```

---

## 11. Verification & Acceptance Checklist

| # | Test Scenario | Steps | Expected Outcome |
| :--- | :--- | :--- | :--- |
| 1 | **QR Signature Verification** | Manually alter `staffId` in QR payload. | `400 Bad Request`: "Invalid QR signature." |
| 2 | **Normal Check-In** | Scan badge at `08:05` (Shift `08:00`, Grace `10m`). | Record created: `status: 'Present'`, `lateMinutes: 0`. |
| 3 | **Late Check-In** | Scan badge at `08:25` (Shift `08:00`, Grace `10m`). | Record created: `status: 'Late'`, `lateMinutes: 25`. |
| 4 | **Cooldown Enforcement** | Scan badge 30 seconds after check-in. | Rejected: "Scan cooldown active." |
| 5 | **Normal Check-Out** | Scan badge 4 hours after check-in. | Record updated: `checkOutTime` set, `workingHours: 4.00`. |
| 6 | **Double Check-Out** | Scan badge after already checking out. | Rejected: "Attendance already completed today." |
| 7 | **Shift Window Closed** | Scan badge after `officeEndTime` (e.g. `18:00`). | Rejected: "Check-in window closed for this shift." |
| 8 | **Leave Precedence** | Run `markAbsentees` while staff has approved leave. | Row created with `status: 'On Leave'` (never `'Absent'`). |
| 9 | **Audit Logging** | Admin edits `checkInTime` from `08:40` to `08:00`. | `attendance_edit_logs` row saved; status updates `Late -> Present`. |
