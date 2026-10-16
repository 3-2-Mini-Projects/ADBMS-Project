"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CashierProvider, useCashier } from "@/lib/cashierContext";

const CASHIER_TABS = [
  { label: "Dashboard", href: "/cashier/dashboard", icon: "📊" },
  { label: "POS Billing", href: "/cashier/pos", icon: "🛒", badge: "F2" },
  { label: "Transaction History", href: "/cashier/history", icon: "📋" },
  { label: "Product & Stock", href: "/cashier/products", icon: "🔍" },
  { label: "Returns & Refunds", href: "/cashier/returns", icon: "↩️" },
];

function CashierLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cashier, setCashier, cashiers, isLoading } = useCashier();
  const [clockStr, setClockStr] = useState<string>("");
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockStr(
        now.toLocaleDateString("en-LK", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #10b981, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              🛒
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.3px",
                }}
              >
                CASHIER<span style={{ color: "var(--accent-emerald)" }}>DESK</span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em",
                }}
              >
                SUPERMARKET ADBMS
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0 6px",
              marginBottom: 8,
            }}
          >
            Cashier Module
          </div>

          {CASHIER_TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  marginBottom: 3,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  background: isActive ? "var(--bg-card2)" : "transparent",
                  textDecoration: "none",
                  border: isActive ? "1px solid var(--border-light)" : "1px solid transparent",
                  transition: "all 0.15s",
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "var(--accent-emerald)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Access Policy Reminder Card */}
          <div
            style={{
              marginTop: 24,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(17, 24, 39, 0.6)",
              border: "1px solid var(--border)",
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                color: "var(--accent-amber)",
                marginBottom: 4,
                fontSize: 11.5,
              }}
            >
              🔒 Role Restrictions
            </div>
            <p style={{ margin: 0, fontSize: 10.5, color: "var(--text-muted)" }}>
              Cashier scope is restricted to branch POS and personal transactions. Returns and voids require manager approval.
            </p>
          </div>
        </nav>

        {/* Logged-in Cashier Profile */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(13, 17, 23, 0.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #059669, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {cashier ? cashier.full_name[0] : "C"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {cashier ? cashier.full_name : "Loading..."}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--accent-emerald)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {cashier ? `${cashier.branch_name || "Branch 1"}` : "CASHIER"}
              </div>
            </div>
          </div>

          <button
            className="btn btn-ghost"
            style={{ padding: "4px 8px", fontSize: 11 }}
            title="Switch Cashier / Branch"
            onClick={() => setShowSwitchModal(true)}
          >
            ⇄
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>
              {CASHIER_TABS.find((t) => t.href === pathname)?.icon || "🛒"}
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              {CASHIER_TABS.find((t) => t.href === pathname)?.label || "Cashier System"}
            </span>
            {cashier && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(88, 166, 255, 0.12)",
                  color: "var(--accent-blue)",
                  border: "1px solid rgba(88, 166, 255, 0.25)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                📍 {cashier.branch_name} ({cashier.branch_code})
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Quick POS Button */}
            {pathname !== "/cashier/pos" && (
              <Link href="/cashier/pos" className="btn btn-emerald" style={{ padding: "6px 14px", fontSize: 12 }}>
                🛒 New Sale (F2)
              </Link>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
              <span className="pulse-live" />
              Live Online
            </div>

            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              suppressHydrationWarning
            >
              {clockStr}
            </div>

            <button
              className="btn btn-ghost"
              style={{ padding: "5px 10px", fontSize: 11 }}
              onClick={() => setShowSwitchModal(true)}
            >
              Switch Cashier
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content animate-fade-in">{children}</main>
      </div>

      {/* Cashier Switcher Modal */}
      {showSwitchModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440, width: "100%", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🔄</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  Select Active Cashier
                </h3>
              </div>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowSwitchModal(false)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              Select a cashier account to simulate shifts, test branch data isolation, and verify cashier-scoped permissions.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {cashiers.map((c) => {
                const isCurrent = cashier?.employee_id === c.employee_id;
                return (
                  <div
                    key={c.employee_id}
                    onClick={() => {
                      setCashier(c);
                      setShowSwitchModal(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: isCurrent ? "var(--bg-card2)" : "var(--bg-surface)",
                      border: isCurrent ? "1px solid var(--accent-emerald)" : "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: isCurrent ? "var(--accent-emerald)" : "var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {c.full_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                          {c.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {c.branch_name} ({c.city})
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="badge badge-completed" style={{ fontSize: 10 }}>
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowSwitchModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <CashierProvider>
      <React.Suspense fallback={<div style={{ padding: 40, color: "var(--text-muted)" }}>Loading Cashier Desk...</div>}>
        <CashierLayoutContent>{children}</CashierLayoutContent>
      </React.Suspense>
    </CashierProvider>
  );
}

