"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCashier } from "@/lib/cashierContext";
import {
  Bell,
  LogIn,
  LogOut,
  ShieldCheck,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  Sparkles,
  Store,
} from "lucide-react";

interface SignInLog {
  audit_id: number;
  event: string;
  action: string;
  email: string | null;
  role: string;
  timestamp: string;
  details?: any;
}

interface ShiftLog {
  shift_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  clock_in?: string;
  clock_out?: string;
  status: string;
}

interface NotificationItem {
  id: string;
  type: "SECURITY" | "STOCK" | "RECONCILIATION" | "SHIFT" | "SYSTEM";
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "ALERT" | "SUCCESS";
  timestamp: string;
}

export default function CashierActivityPage() {
  const router = useRouter();
  const { cashier } = useCashier();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "SIGNIN" | "NOTIFICATIONS" | "SHIFTS">("ALL");
  const [search, setSearch] = useState("");

  const [signInLogs, setSignInLogs] = useState<SignInLog[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchActivity = async () => {
    if (!cashier) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/cashier/activity?cashierId=${cashier.employee_id}&branchId=${cashier.branch_id}`
      );
      if (res.ok) {
        const data = await res.json();
        setSignInLogs(data.signInLogs || []);
        setShiftLogs(data.shiftLogs || []);
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to load activity:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [cashier]);

  const timeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    } catch {
      return dateStr;
    }
  };

  const filteredLogs = signInLogs.filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      log.event.toLowerCase().includes(term) ||
      (log.email && log.email.toLowerCase().includes(term)) ||
      log.role.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => router.push("/cashier/dashboard")}
              className="btn btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-blue)",
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: 8,
              }}
            >
              ← Back to Dashboard
            </button>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Activity &amp; Sign-in Logs</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            📋 Cashier Sign-in Logs &amp; Notifications
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Authentication history, shift attendance, and operational store alerts for your account
          </p>
        </div>

        <button
          type="button"
          onClick={fetchActivity}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Activity</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {/* Card 1: Total Sign-in Events */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 11.5, textTransform: "uppercase" }}>
            <span>Sign-In Audit Logs</span>
            <span style={{ fontSize: 16 }}>🔐</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-emerald)", marginTop: 8 }}>
            {signInLogs.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Recorded authentication events
          </div>
        </div>

        {/* Card 2: Active Notifications */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 11.5, textTransform: "uppercase" }}>
            <span>Active Notifications</span>
            <span style={{ fontSize: 16 }}>🔔</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-amber)", marginTop: 8 }}>
            {notifications.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Branch alerts &amp; reminders
          </div>
        </div>

        {/* Card 3: Shift Records */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 11.5, textTransform: "uppercase" }}>
            <span>Shift Attendance</span>
            <span style={{ fontSize: 16 }}>📅</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-blue)", marginTop: 8 }}>
            {shiftLogs.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Assigned cashier shifts
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["ALL", "SIGNIN", "NOTIFICATIONS", "SHIFTS"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              {tab === "ALL" && "All Activity"}
              {tab === "SIGNIN" && `Sign-in Logs (${signInLogs.length})`}
              {tab === "NOTIFICATIONS" && `Notifications (${notifications.length})`}
              {tab === "SHIFTS" && `Shifts (${shiftLogs.length})`}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: 240 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-muted)" }} />
          <input
            type="text"
            className="input"
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 12, width: "100%" }}
          />
        </div>
      </div>

      {/* Section: Notifications */}
      {(activeTab === "ALL" || activeTab === "NOTIFICATIONS") && notifications.length > 0 && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Active Notifications &amp; Branch Warnings
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--bg-surface)",
                  border: `1px solid ${
                    n.severity === "WARNING"
                      ? "rgba(245, 158, 11, 0.35)"
                      : n.severity === "SUCCESS"
                      ? "rgba(16, 185, 129, 0.35)"
                      : "var(--border)"
                  }`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text-primary)" }}>
                    {n.title}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {timeAgo(n.timestamp)}
                  </span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Sign-in Logs */}
      {(activeTab === "ALL" || activeTab === "SIGNIN") && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🔐</span>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Sign-in &amp; Authentication History
            </h2>
          </div>

          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: 12 }}>
              No sign-in records matched your search.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", fontSize: 11 }}>
                    <th style={{ padding: "8px 10px" }}>EVENT</th>
                    <th style={{ padding: "8px 10px" }}>ACCOUNT</th>
                    <th style={{ padding: "8px 10px" }}>ROLE</th>
                    <th style={{ padding: "8px 10px" }}>DATE &amp; TIME</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>ELAPSED</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const isLogin = log.event.includes("LOGIN") || log.event.includes("SUCCESS");
                    const isLogout = log.event.includes("LOGOUT");

                    return (
                      <tr key={log.audit_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "3px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isLogin
                                ? "rgba(16, 185, 129, 0.15)"
                                : isLogout
                                ? "rgba(244, 63, 94, 0.15)"
                                : "rgba(56, 189, 248, 0.15)",
                              color: isLogin ? "#34d399" : isLogout ? "#fb7185" : "#38bdf8",
                            }}
                          >
                            {isLogin ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                            {log.event}
                          </span>
                        </td>
                        <td style={{ padding: "10px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {log.email || cashier?.email || `Employee #${cashier?.employee_id}`}
                        </td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                          {log.role}
                        </td>
                        <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                          {new Date(log.timestamp).toLocaleString("en-LK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "var(--accent-blue)" }}>
                          {timeAgo(log.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section: Shift Attendance */}
      {(activeTab === "ALL" || activeTab === "SHIFTS") && shiftLogs.length > 0 && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Assigned Shift Attendance Logs
            </h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", fontSize: 11 }}>
                  <th style={{ padding: "8px 10px" }}>SHIFT DATE</th>
                  <th style={{ padding: "8px 10px" }}>ROSTER SCHEDULE</th>
                  <th style={{ padding: "8px 10px" }}>CLOCK IN</th>
                  <th style={{ padding: "8px 10px" }}>CLOCK OUT</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {shiftLogs.map((s) => (
                  <tr key={s.shift_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "10px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {s.shift_date}
                    </td>
                    <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                      {s.start_time} - {s.end_time}
                    </td>
                    <td style={{ padding: "10px", color: s.clock_in ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                      {s.clock_in || "—"}
                    </td>
                    <td style={{ padding: "10px", color: s.clock_out ? "var(--accent-rose)" : "var(--text-muted)" }}>
                      {s.clock_out || "—"}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: s.clock_in ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: s.clock_in ? "#34d399" : "#fbbf24",
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
