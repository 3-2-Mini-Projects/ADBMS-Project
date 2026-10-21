"use client";

import React, { useState, useEffect } from "react";
import type { Html5Qrcode } from "html5-qrcode";
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
  const { currentBranch, employees, showToast } = useApp();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-sky-400" />
            <span>Employee Shifts & Attendance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track cashier and stock clerk shifts, biometric clock-in timestamps, and scheduled branch rosters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setKioskOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Scan className="w-4 h-4" />
            <span>Launch Attendance Kiosk</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-950/40 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Shift</span>
          </button>
        </div>
      </div>
      {/* Shifts Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Role</th>
                <th className="py-3.5 px-4 font-semibold">Branch</th>
                <th className="py-3.5 px-4 font-semibold">Shift Date</th>
                <th className="py-3.5 px-4 font-semibold">Scheduled Hours</th>
                <th className="py-3.5 px-4 font-semibold">Clock In</th>
                <th className="py-3.5 px-4 font-semibold">Clock Out</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">Attendance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-sky-400 mb-2" />
                    Loading shift rosters...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No shifts scheduled for this branch.
                  </td>
                </tr>
              ) : (
                shifts.map((s) => (
                  <tr key={s.shift_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.employee_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{s.role || "STAFF"}</td>
                    <td className="py-3 px-4 text-slate-300">{s.branch_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {new Date(s.shift_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {s.start_time} - {s.end_time}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-emerald-400">
                      {s.clock_in ? new Date(s.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-400">
                      {s.clock_out ? new Date(s.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          s.status === "COMPLETED"
                            ? "bg-slate-800 text-slate-300"
                            : s.status === "PRESENT"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 animate-pulse"
                            : s.status === "ABSENT"
                            ? "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                            : "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.status === "SCHEDULED" ? (
                        <button
                          onClick={() => handleClockAction(s.shift_id, "clock_in")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 mx-auto"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Clock In</span>
                        </button>
                      ) : s.status === "PRESENT" ? (
                        <button
                          onClick={() => handleClockAction(s.shift_id, "clock_out")}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 mx-auto"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Clock Out</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Finished</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Schedule Employee Shift</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleShift} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Select Employee</label>
                <select
                  required
                  value={newShift.employee_id}
                  onChange={(e) => setNewShift({ ...newShift, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
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
                <label className="text-xs text-slate-300 block mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.start_time}
                    onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.end_time}
                    onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
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
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Kiosk Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <span>Supermarket Attendance Terminal</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {currentBranch?.name ?? "Branch Station"} • Store Entrance Station
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center font-mono text-sm font-bold text-sky-400 shadow-inner">
                {liveTime}
              </div>
              <button
                onClick={() => {
                  setKioskOpen(false);
                  setCameraActive(false);
                  setScanResult(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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
                className={`p-8 rounded-3xl border text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 ${
                  scanResult.success
                    ? scanResult.action === "CLOCK_IN"
                      ? "bg-emerald-950/40 border-emerald-600/60 ring-2 ring-emerald-500/20"
                      : "bg-amber-950/40 border-amber-600/60 ring-2 ring-amber-500/20"
                    : "bg-rose-950/40 border-rose-600/60 ring-2 ring-rose-500/20"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg ${
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
                          ? "text-emerald-400"
                          : "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {scanResult.success
                      ? scanResult.action === "CLOCK_IN"
                        ? "Check-In Recorded"
                        : "Check-Out Recorded"
                      : "Scan Unsuccessful"}
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-1">
                    {scanResult.employee_name || "Staff Member"}
                  </h2>
                  {scanResult.role && (
                    <span className="inline-block mt-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold uppercase">
                      {scanResult.role}
                    </span>
                  )}
                </div>

                <div className="text-sm text-slate-300 font-medium">
                  {scanResult.message}
                </div>

                {scanResult.time && (
                  <div className="text-xs font-mono text-slate-400">
                    Timestamp: <strong className="text-white font-bold">{scanResult.time}</strong>
                    {scanResult.hours_worked !== undefined && (
                      <span> • Total Shift: <strong className="text-amber-300 font-bold">{scanResult.hours_worked} hrs</strong></span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Ready Scan State */
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-xs font-semibold text-emerald-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Ready for Staff Attendance</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Hold Badge Under Scanner
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Point your physical ID card QR code or barcode under the register laser scanner, or toggle device camera below.
                  </p>
                </div>

                {/* Camera Viewport (when active) */}
                {cameraActive ? (
                  <div className="space-y-3">
                    <div
                      id="kiosk-camera-viewport"
                      className="w-72 h-72 mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500/60 bg-black shadow-2xl relative"
                    />
                    <button
                      type="button"
                      onClick={() => setCameraActive(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 mx-auto transition-colors"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Stop Camera View</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                      <QrCode className="w-10 h-10 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Laser / USB Barcode Scanner Active
                    </div>
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-sky-400" />
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
                      className="w-full pl-4 pr-24 py-3 rounded-2xl bg-slate-900 border border-slate-700 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={isScanning || !manualCode.trim()}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all disabled:opacity-40"
                    >
                      Scan
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Kiosk Footer Note */}
          <div className="text-center pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
            Supermarket ADBMS Automated Attendance Subsystem • Multi-Branch Station
          </div>
        </div>
      )}
    </div>
  );
}
