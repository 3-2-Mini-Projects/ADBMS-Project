"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context";

const SALES_TABS = [
  { label: "Sales History", href: "/sales", icon: "📋" },
  { label: "POS Checkout",  href: "/cashier/pos", icon: "🛒" },
  { label: "Report",        href: "/sales/report",   icon: "📊" },
  { label: "Live Monitor",  href: "/sales/monitor",  icon: "🖥️" },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentEmployee } = useApp();
  const isCashier = currentEmployee?.role === "CASHIER";
  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    setTodayStr(
      new Date().toLocaleDateString("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  return (
    <div
      className="app-layout"
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-base, #07090f)",
        color: "var(--text-primary, #e6edf3)",
      }}
    >
      {/* Left Sidebar */}
      <aside
        className="sidebar"
        style={{
          width: 250,
          minWidth: 250,
          maxWidth: 250,
          height: "100vh",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface, #0d1117)",
          borderRight: "1px solid var(--border, #1e2d3d)",
          overflow: "hidden",
        }}
      >
        {/* Brand */}
        <div style={{
          padding: "20px 16px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #1d4ed8, #0891b2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(29, 78, 216, 0.3)",
            }}>
              🛍️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
                NEXUS<span style={{ color: "var(--accent-blue)" }}>SUPER</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
                ADBMS v2.0
              </div>
            </div>
          </div>
        </div>

        {/* Sales Nav */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 6px", marginBottom: 8 }}>
            Sales Module
          </div>
          {SALES_TABS.map((tab) => {
            const isActive = pathname === tab.href || (pathname === "/sales" && tab.href === "/sales/history");
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
                  marginBottom: 2,
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
                {tab.label}
                {tab.label === "Monitor" && (
                  <span style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(63, 185, 80, 0.15)",
                    color: "var(--accent-emerald)",
                    border: "1px solid rgba(63, 185, 80, 0.2)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                  }}>LIVE</span>
                )}
              </Link>
            );
          })}

          {/* Other modules */}
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 6px", marginTop: 24, marginBottom: 8 }}>
            Other Modules
          </div>
          {(isCashier
            ? [
                { label: "Cashier Desk", href: "/cashier/dashboard", icon: "🛒" },
                { label: "Branch Stock", href: "/cashier/products", icon: "🔍" },
                { label: "Daily Summary", href: "/cashier/summary", icon: "📑" },
                { label: "Customers", href: "/customers", icon: "👥" },
              ]
            : [
                { label: "Cashier Portal", href: "/cashier/dashboard", icon: "🛒" },
                { label: "Inventory", href: "/inventory", icon: "📦" },
                { label: "Customers", href: "/customers", icon: "👥" },
                { label: "Admin Reports", href: "/admin/reports", icon: "📈" },
              ]
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-muted)",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0,
          }}>S</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Sandeepa</div>
            <div style={{ fontSize: 10, color: "var(--accent-emerald)", fontFamily: "'JetBrains Mono', monospace" }}>ADMIN</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className="main-area"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>💰</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Sales Management</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>
              — {SALES_TABS.find(t => t.href === pathname)?.label ?? "Sales"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-emerald)", display: "inline-block", animation: "pulse-dot 1.4s ease-in-out infinite" }} />
              Live Data
            </div>
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
              suppressHydrationWarning
            >
              {todayStr}
            </div>
          </div>
        </header>

        {/* Page */}
        <main
          className="page-content animate-fade-in"
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
