"use client";

import React, { useState, useEffect } from "react";
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

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-950/40 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Shift</span>
        </button>
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
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{(s as any).role || "STAFF"}</td>
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
    </div>
  );
}
