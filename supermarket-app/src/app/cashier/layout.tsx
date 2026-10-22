"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CashierProvider, useCashier } from "@/lib/cashierContext";
import { CashierNotificationBell } from "@/components/CashierNotificationBell";

interface CashierTab {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const CASHIER_TABS: CashierTab[] = [
  { label: "Dashboard", href: "/cashier/dashboard", icon: "📊" },
  { label: "POS Billing", href: "/cashier/pos", icon: "🛒" },
  { label: "Transaction History", href: "/cashier/history", icon: "📋" },
  { label: "Daily Summary", href: "/cashier/summary", icon: "📑" },
  { label: "Sign-in Logs & Alerts", href: "/cashier/activity", icon: "🔔" },
  { label: "Product & Stock", href: "/cashier/products", icon: "🔍" },
  { label: "Returns & Refunds", href: "/cashier/returns", icon: "↩️" },
];

const ACCOUNT_TABS = [
  { label: "Profile", href: "/cashier/profile", icon: "👤" },
  { label: "Settings", href: "/cashier/settings", icon: "⚙️" },
  { label: "Logout", href: "/cashier/logout", icon: "🚪" },
];

function CashierLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { cashier, isLoading } = useCashier();
  const [clockStr, setClockStr] = useState<string>("");

  useEffect(() => {
    if (!isLoading && !cashier) {
      router.replace("/login");
    }
  }, [isLoading, cashier, router]);

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

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-main, #0b0f17)",
          color: "var(--text-secondary, #94a3b8)",
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          gap: 12,
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            border: "2px solid rgba(16, 185, 129, 0.3)",
            borderTopColor: "var(--accent-emerald, #10b981)",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span>Verifying cashier credentials...</span>
      </div>
    );
  }

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

          {/* Account Section (Just like other users) */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0 6px",
              marginTop: 20,
              marginBottom: 8,
            }}
          >
            Account
          </div>

          {ACCOUNT_TABS.map((tab) => {
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
                  color: tab.href === "/cashier/logout"
                    ? "var(--accent-rose)"
                    : isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  background: isActive ? "var(--bg-card2)" : "transparent",
                  textDecoration: "none",
                  border: isActive ? "1px solid var(--border-light)" : "1px solid transparent",
                  transition: "all 0.15s",
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>
              {[...CASHIER_TABS, ...ACCOUNT_TABS].find((t) => t.href === pathname)?.icon || "🛒"}
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              {[...CASHIER_TABS, ...ACCOUNT_TABS].find((t) => t.href === pathname)?.label || "Cashier System"}
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

            {/* Cashier Real-Time Notifications & Sign-in Log Bell */}
            <CashierNotificationBell />

            {cashier && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #10b981, #0284c7)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {cashier.full_name[0]}
                </span>
                <span>{cashier.full_name}</span>
              </div>
            )}

            <Link
              href="/cashier/logout"
              className="btn btn-ghost"
              style={{ padding: "5px 10px", fontSize: 11, color: "var(--accent-rose)" }}
              title="Sign Out"
            >
              Sign Out
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="page-content animate-fade-in"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: pathname === "/cashier/pos" ? "hidden" : "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            padding: "16px 20px",
          }}
        >
          {children}
        </main>
      </div>
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

