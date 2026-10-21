"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCashier } from "@/lib/cashierContext";
import {
  Bell,
  BellRing,
  Clock,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  LogIn,
  Layers,
  Calendar,
  X,
  Sparkles,
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
  is_read?: boolean;
}

export function CashierNotificationBell() {
  const { cashier } = useCashier();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"NOTIFICATIONS" | "SIGNIN_LOGS">("NOTIFICATIONS");
  const [loading, setLoading] = useState(false);

  const [signInLogs, setSignInLogs] = useState<SignInLog[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);

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
      console.error("Failed to fetch cashier activity:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cashier) {
      fetchActivity();
      // Auto-poll every 60 seconds
      const timer = setInterval(fetchActivity, 60000);
      return () => clearInterval(timer);
    }
  }, [cashier]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadNotifications = notifications.filter((n) => !readIds.has(n.id));
  const unreadCount = unreadNotifications.length;

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const timeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 9,
          background: isOpen ? "rgba(56, 189, 248, 0.15)" : "var(--bg-card)",
          border: isOpen ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid var(--border)",
          color: unreadCount > 0 ? "var(--accent-amber)" : "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Notifications & Sign-in Logs"
      >
        {unreadCount > 0 ? (
          <BellRing style={{ width: 17, height: 17 }} />
        ) : (
          <Bell style={{ width: 17, height: 17 }} />
        )}

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 17,
              height: 17,
              borderRadius: "50%",
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.5)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div
          className="animate-fade-in shadow-2xl"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 380,
            maxWidth: "92vw",
            maxHeight: 520,
            display: "flex",
            flexDirection: "column",
            borderRadius: 14,
            background: "#0f172a",
            border: "1px solid #334155",
            zIndex: 9999,
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #1e293b",
              background: "#0b0f19",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#f8fafc" }}>
                Activity &amp; Notifications
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={fetchActivity}
                disabled={loading}
                className="btn btn-ghost"
                style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                title="Refresh logs"
              >
                <RefreshCw style={{ width: 12, height: 12 }} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost"
                style={{ padding: "4px 8px", fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #1e293b",
              background: "#090d16",
              padding: "4px 8px",
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("NOTIFICATIONS")}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: activeTab === "NOTIFICATIONS" ? "#1e293b" : "transparent",
                color: activeTab === "NOTIFICATIONS" ? "#38bdf8" : "#94a3b8",
                transition: "all 0.15s",
              }}
            >
              <span>🔔 Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontSize: 10,
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "#fbbf24",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SIGNIN_LOGS")}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: activeTab === "SIGNIN_LOGS" ? "#1e293b" : "transparent",
                color: activeTab === "SIGNIN_LOGS" ? "#38bdf8" : "#94a3b8",
                transition: "all 0.15s",
              }}
            >
              <span>🔐 Sign-in Logs</span>
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 10,
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                }}
              >
                {signInLogs.length}
              </span>
            </button>
          </div>

          {/* Content Area */}
          <div
            style={{
              padding: "12px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 240,
            }}
          >
            {activeTab === "NOTIFICATIONS" && (
              <>
                {unreadCount > 0 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="btn btn-ghost"
                      style={{ fontSize: 10.5, padding: "2px 8px", color: "var(--accent-blue)" }}
                    >
                      ✓ Mark all as read
                    </button>
                  </div>
                )}

                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "30px 10px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: 12,
                    }}
                  >
                    <CheckCircle2 style={{ width: 28, height: 28, margin: "0 auto 8px", color: "#10b981" }} />
                    <div style={{ fontWeight: 600, color: "#94a3b8" }}>No Unread Notifications</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>All terminal operations are normal.</div>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: isRead ? "rgba(15, 23, 42, 0.5)" : "rgba(30, 41, 59, 0.7)",
                          border: `1px solid ${
                            n.severity === "WARNING"
                              ? "rgba(245, 158, 11, 0.3)"
                              : n.severity === "SUCCESS"
                              ? "rgba(16, 185, 129, 0.3)"
                              : "#334155"
                          }`,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: isRead ? "#94a3b8" : "#f1f5f9" }}>
                            {n.title}
                          </div>
                          <span
                            style={{
                              fontSize: 9.5,
                              color: "#64748b",
                              whiteSpace: "nowrap",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {timeAgo(n.timestamp)}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: isRead ? "#64748b" : "#cbd5e1", lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {activeTab === "SIGNIN_LOGS" && (
              <>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                  <span>Recent Authentication &amp; Sessions</span>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Live from Audit Trail</span>
                </div>

                {signInLogs.length === 0 ? (
                  <div
                    style={{
                      padding: "30px 10px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: 12,
                    }}
                  >
                    <Shield style={{ width: 28, height: 28, margin: "0 auto 8px", color: "#64748b" }} />
                    <div style={{ fontWeight: 600, color: "#94a3b8" }}>No Sign-in Logs Recorded</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Login history will appear after authentication.</div>
                  </div>
                ) : (
                  signInLogs.map((log) => {
                    const isLogin = log.event.includes("LOGIN") || log.event.includes("SUCCESS");
                    const isLogout = log.event.includes("LOGOUT");

                    return (
                      <div
                        key={log.audit_id}
                        style={{
                          padding: "9px 12px",
                          borderRadius: 9,
                          background: "rgba(15, 23, 42, 0.6)",
                          border: "1px solid #1e293b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: isLogin
                                ? "rgba(16, 185, 129, 0.15)"
                                : isLogout
                                ? "rgba(244, 63, 94, 0.15)"
                                : "rgba(56, 189, 248, 0.15)",
                              color: isLogin ? "#34d399" : isLogout ? "#fb7185" : "#38bdf8",
                              flexShrink: 0,
                            }}
                          >
                            {isLogin ? <LogIn style={{ width: 14, height: 14 }} /> : <LogOut style={{ width: 14, height: 14 }} />}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#f8fafc" }}>
                              {isLogin ? "Sign In (POS Terminal)" : isLogout ? "Sign Out" : log.event}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#64748b",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {log.email || `Cashier #${cashier?.employee_id}`} • {log.role}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "#38bdf8",
                              fontWeight: 600,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {timeAgo(log.timestamp)}
                          </div>
                          <div style={{ fontSize: 9.5, color: "#64748b" }}>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Shift Roster Snapshot */}
                {shiftLogs.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: "1px dashed #334155", paddingTop: 8 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Recent Shift Attendance
                    </div>
                    {shiftLogs.slice(0, 3).map((s) => (
                      <div
                        key={s.shift_id}
                        style={{
                          fontSize: 10.5,
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "rgba(30, 41, 59, 0.4)",
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>
                          📅 {s.shift_date} ({s.start_time} - {s.end_time})
                        </span>
                        <span style={{ fontWeight: 700, color: s.clock_in ? "#34d399" : "#fbbf24" }}>
                          {s.clock_in ? `Clocked in ${s.clock_in}` : s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid #1e293b",
              background: "#0b0f19",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
            }}
          >
            <span style={{ color: "#64748b" }}>
              Terminal: <strong>{cashier?.branch_code}</strong>
            </span>
            <Link
              href="/cashier/activity"
              onClick={() => setIsOpen(false)}
              style={{
                color: "#38bdf8",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Full Activity Screen →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
