"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCashier } from "@/lib/cashierContext";
import {
  UserCircle,
  ShieldCheck,
  Mail,
  Building2,
  Calendar,
  ShoppingCart,
  ArrowLeft,
  KeyRound,
  Store,
  Clock,
  Sparkles,
} from "lucide-react";

export default function CashierProfilePage() {
  const router = useRouter();
  const { cashier, branches } = useCashier();

  const currentBranch = branches?.find((b) => b.branch_id === cashier?.branch_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40, maxWidth: 900, margin: "0 auto", width: "100%" }}>
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
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Account Profile</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            👤 Cashier Profile &amp; Role Credentials
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Authenticated terminal operator details and security credential status
          </p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Profile Card Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #059669, #0284c7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 26,
              fontWeight: 900,
              boxShadow: "0 8px 24px rgba(5, 150, 105, 0.35)",
            }}
          >
            {cashier?.full_name ? cashier.full_name[0] : "C"}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                {cashier?.full_name ?? "Authenticated Cashier"}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 20,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "var(--accent-emerald)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                {cashier?.role ?? "CASHIER"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Operator ID: #{cashier?.employee_id ?? "N/A"}</span>
              <span>•</span>
              <span style={{ color: "var(--accent-blue)" }}>
                📍 {cashier?.branch_name} ({cashier?.branch_code})
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Mail className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Email Address
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {cashier?.email ?? "cashier@nexus.supermarket"}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Allocated Terminal Branch
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600, marginTop: 2 }}>
                {cashier?.branch_name} ({cashier?.branch_code})
                {currentBranch?.city ? ` • ${currentBranch.city}` : ""}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Terminal Authority Role
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600, marginTop: 2 }}>
                Retail Point of Sale Operator
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Session Terminal Status
              </div>
              <div style={{ fontSize: 12.5, color: "var(--accent-emerald)", fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="pulse-live" />
                Active Cashier Session
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Links */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 18 }}>
          <Link
            href="/cashier/settings"
            className="btn btn-secondary"
            style={{ padding: "8px 16px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Terminal Settings &amp; Password</span>
          </Link>

          <Link
            href="/cashier/activity"
            className="btn btn-ghost"
            style={{ padding: "8px 16px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>View Sign-in &amp; Shift Logs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
