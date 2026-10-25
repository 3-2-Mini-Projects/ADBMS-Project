"use client";

import React, { useState, useEffect } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { Shift } from "@/lib/types";
import {
  Clock,
  Plus,
  Calendar,
  CheckCircle2,
  LogIn,
  LogOut,
  User,
  Sparkles,
  X,
  Store,
  Scan,
  QrCode,
  Camera,
  CameraOff,
  Zap,
  Check,
  AlertTriangle,
} from "lucide-react";

export default function ShiftsPage() {
  const router = useRouter();
  const { currentBranch, employees, showToast, currentEmployee, authenticatedUser } = useApp();
  const userRole = currentEmployee?.role || authenticatedUser?.role;
  const isCashier = userRole === "CASHIER";

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isCashier) {
      showToast("Access restricted: Shifts & Attendance are not accessible to cashiers.", "warning");
      router.replace("/cashier/dashboard");
    }
  }, [isCashier, router, showToast]);

  if (isCashier) {
    return null;
  }

  // Schedule Shift Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({
    employee_id: "",
    shift_date: "",
    start_time: "08:00",
    end_time: "16:00",
  });

  useEffect(() => {
    setNewShift((prev) => ({
      ...prev,
      shift_date: new Date().toISOString().split("T")[0],
    }));
  }, []);
  // Attendance Kiosk State
  const [kioskOpen, setKioskOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [liveTime, setLiveTime] = useState("");
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    action?: "CLOCK_IN" | "CLOCK_OUT";
    employee_name?: string;
    role?: string;
    time?: string;
    hours_worked?: number | string;
    message: string;
  } | null>(null);

  // Live digital clock in kiosk
  useEffect(() => {
    const updateClock = () => {
      setLiveTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Synthesized audio feedback
  const playChime = (type: "success" | "error") => {
    try {
      if (typeof window === "undefined" || !window.AudioContext) return;
      const ctx = new window.AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === "success") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(196, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // AudioContext muted/unsupported
    }
  };

  const processAttendanceScan = async (code: string) => {
    if (!code || isScanning) return;
    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await fetch("/api/shifts/scan-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan_data: code.trim(),
          branch_id: currentBranch?.branch_id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playChime("success");
        setScanResult({
          success: true,
          action: data.action,
          employee_name: data.employee_name,
          role: data.role,
          time: data.time,
          hours_worked: data.hours_worked,
          message: data.message,
        });
        showToast(data.message, "success");
        fetchShifts();
      } else {
        playChime("error");
        setScanResult({
          success: false,
          employee_name: data.employee_name,
          message: data.error || "Attendance scan failed.",
        });
        showToast(data.error || "Attendance scan failed.", "error");
      }
    } catch {
      playChime("error");
      setScanResult({
        success: false,
        message: "Network error occurred while processing scan.",
      });
    } finally {
      setIsScanning(false);
      setManualCode("");
      setTimeout(() => {
        setScanResult(null);
      }, 3500);
    }
  };

  // Camera scanning hook using dynamic import of html5-qrcode
  useEffect(() => {
    let scannerInstance: Html5Qrcode | null = null;
    if (kioskOpen && cameraActive) {
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        scannerInstance = new Html5Qrcode("kiosk-camera-viewport");
        scannerInstance
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (decodedText: string) => {
              processAttendanceScan(decodedText);
            },
            () => {}
          )
          .catch((err: unknown) => {
            console.error("Camera scanner error:", err);
            setCameraActive(false);
            showToast("Camera access failed or permission denied.", "warning");
          });
      });
    }
    return () => {
      if (scannerInstance) {
        scannerInstance.stop().then(() => scannerInstance?.clear()).catch(() => {});
      }
    };
  }, [kioskOpen, cameraActive]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
      const res = await fetch(`/api/shifts?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setShifts(data);
    } catch (err) {
      console.error("Error loading shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [currentBranch]);

  const handleClockAction = async (shiftId: number, action: "clock_in" | "clock_out") => {
    try {
      const res = await fetch("/api/shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift_id: shiftId, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(action === "clock_in" ? "Clocked in successfully!" : "Clocked out successfully!", "success");
        fetchShifts();
      } else {
        showToast("Clock action failed", "error");
      }
    } catch {
      showToast("Error processing attendance", "error");
    }
  };

  const handleScheduleShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch || !newShift.employee_id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newShift,
          branch_id: currentBranch.branch_id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Shift scheduled successfully!", "success");
        setAddModalOpen(false);
        fetchShifts();
      } else {
        showToast(data.error || "Failed to schedule shift", "error");
      }
    } catch {
      showToast("Error scheduling shift", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-blue-600" />
            <span>Employee Shifts &amp; Attendance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track cashier and stock clerk shifts, biometric clock-in timestamps, and scheduled branch rosters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setKioskOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all shrink-0 active:scale-95"
          >
            <Scan className="w-4 h-4" />
            <span>Launch Attendance Kiosk</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Shift</span>
          </button>
        </div>
      </div>
      {/* Shifts Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Branch</th>
                <th className="py-3 px-4 font-semibold">Shift Date</th>
                <th className="py-3 px-4 font-semibold">Scheduled Hours</th>
                <th className="py-3 px-4 font-semibold">Clock In</th>
                <th className="py-3 px-4 font-semibold">Clock Out</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Attendance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-sky-600 mb-2" />
                    Loading shift rosters...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    No shifts scheduled for this branch.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => (
                  <tr key={s.shift_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.employee_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 font-bold">{s.role || "STAFF"}</td>
                    <td className="py-3 px-4 text-slate-600">{s.branch_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(s.shift_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-emerald-700 font-bold">
                      {s.clock_in ? new Date(s.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-700 font-bold">
                      {s.clock_out ? new Date(s.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                          s.status === "COMPLETED"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : s.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse"
                            : s.status === "ABSENT"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.status === "SCHEDULED" ? (
                        <button
                          onClick={() => handleClockAction(s.shift_id, "clock_in")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 mx-auto shadow-xs"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Clock In</span>
                        </button>
                      ) : s.status === "PRESENT" ? (
                        <button
                          onClick={() => handleClockAction(s.shift_id, "clock_out")}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 mx-auto shadow-xs"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Clock Out</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Finished</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Schedule Shift */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-600" />
                <span>Schedule Employee Shift</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleShift} className="space-y-4">
              <div>
                <label className="text-xs text-slate-700 block mb-1 font-semibold">Select Employee</label>
                <select
                  required
                  value={newShift.employee_id}
                  onChange={(e) => setNewShift({ ...newShift, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Choose Employee</option>
                  {employees.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.full_name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 block mb-1 font-semibold">Shift Date</label>
                <input
                  type="date"
                  required
                  value={newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 block mb-1 font-semibold">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.start_time}
                    onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 block mb-1 font-semibold">End Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.end_time}
                    onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
                >
                  Schedule Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kiosk Mode Modal: Store Attendance Terminal */}
      {kioskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100/95 backdrop-blur-md flex flex-col justify-between p-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Kiosk Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-xs">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900 tracking-wide uppercase flex items-center gap-2">
                  <span>Supermarket Attendance Terminal</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {currentBranch?.name ?? "Branch Station"} • Store Entrance Station
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-center font-mono text-sm font-bold text-sky-700 shadow-xs">
                {liveTime}
              </div>
              <button
                onClick={() => {
                  setKioskOpen(false);
                  setCameraActive(false);
                  setScanResult(null);
                }}
                className="p-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors shadow-xs"
                title="Exit Kiosk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Kiosk Interactive Area */}
          <div className="max-w-xl w-full mx-auto my-auto text-center space-y-6">
            {/* Result Display State */}
            {scanResult ? (
              <div
                className={`p-8 rounded-3xl border text-center space-y-4 shadow-xl animate-in zoom-in-95 duration-200 ${
                  scanResult.success
                    ? scanResult.action === "CLOCK_IN"
                      ? "bg-white border-emerald-300 ring-4 ring-emerald-50"
                      : "bg-white border-amber-300 ring-4 ring-amber-50"
                    : "bg-white border-rose-300 ring-4 ring-rose-50"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md ${
                    scanResult.success
                      ? scanResult.action === "CLOCK_IN"
                        ? "bg-emerald-600"
                        : "bg-amber-600"
                      : "bg-rose-600"
                  }`}
                >
                  {scanResult.success ? <Check className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>

                <div>
                  <div
                    className={`text-xs font-mono font-black uppercase tracking-widest ${
                      scanResult.success
                        ? scanResult.action === "CLOCK_IN"
                          ? "text-emerald-700"
                          : "text-amber-700"
                        : "text-rose-700"
                    }`}
                  >
                    {scanResult.success
                      ? scanResult.action === "CLOCK_IN"
                        ? "Check-In Recorded"
                        : "Check-Out Recorded"
                      : "Scan Unsuccessful"}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">
                    {scanResult.employee_name || "Staff Member"}
                  </h2>
                  {scanResult.role && (
                    <span className="inline-block mt-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold uppercase">
                      {scanResult.role}
                    </span>
                  )}
                </div>

                <div className="text-sm text-slate-600 font-medium">
                  {scanResult.message}
                </div>

                {scanResult.time && (
                  <div className="text-xs font-mono text-slate-500">
                    Timestamp: <strong className="text-slate-900 font-bold">{scanResult.time}</strong>
                    {scanResult.hours_worked !== undefined && (
                      <span> • Total Shift: <strong className="text-amber-700 font-bold">{scanResult.hours_worked} hrs</strong></span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Ready Scan State */
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Ready for Staff Attendance</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Hold Badge Under Scanner
                  </h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Point your physical ID card QR code or barcode under the register laser scanner, or toggle device camera below.
                  </p>
                </div>

                {/* Camera Viewport (when active) */}
                {cameraActive ? (
                  <div className="space-y-3">
                    <div
                      id="kiosk-camera-viewport"
                      className="w-72 h-72 mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500 bg-black shadow-lg relative"
                    />
                    <button
                      type="button"
                      onClick={() => setCameraActive(false)}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-2 mx-auto transition-colors shadow-xs"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Stop Camera View</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                      <QrCode className="w-10 h-10 text-emerald-600 animate-pulse" />
                    </div>
                    <div className="text-xs text-slate-500 font-mono font-medium">
                      Laser / USB Barcode Scanner Active
                    </div>
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-xs"
                    >
                      <Camera className="w-4 h-4 text-sky-600" />
                      <span>Turn On Tablet / Device Camera</span>
                    </button>
                  </div>
                )}

                {/* Hardware Barcode / Manual Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    processAttendanceScan(manualCode);
                  }}
                  className="max-w-md mx-auto"
                >
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      disabled={isScanning}
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Scan badge or enter ID (e.g. EMP-0002)..."
                      className="w-full pl-4 pr-24 py-3 rounded-2xl bg-white border border-slate-300 font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                    <button
                      type="submit"
                      disabled={isScanning || !manualCode.trim()}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all disabled:opacity-40 shadow-xs"
                    >
                      Scan
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Kiosk Footer Note */}
          <div className="text-center pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
            Supermarket ADBMS Automated Attendance Subsystem • Multi-Branch Station
          </div>
        </div>
      )}
    </div>
  );
}
