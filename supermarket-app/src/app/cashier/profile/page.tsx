"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCashier } from "@/lib/cashierContext";
import { playCheckoutChime } from "@/lib/posAudio";
import {
  UserCircle,
  ShieldCheck,
  Mail,
  Building2,
  Calendar,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  Clock,
  ScanBarcode,
} from "lucide-react";

export default function CashierProfilePage() {
  const router = useRouter();
  const { cashier, branches } = useCashier();

  const currentBranch = branches?.find((b) => b.branch_id === cashier?.branch_id);

  // Password update form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordNotice({ text: "Please enter your current password", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice({ text: "New password must be at least 6 characters long", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ text: "New passwords do not match", type: "error" });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordNotice(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordNotice({ text: data.error || "Failed to update password", type: "error" });
      } else {
        setPasswordNotice({ text: "✓ Cashier password updated successfully!", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        playCheckoutChime();
        setTimeout(() => setPasswordNotice(null), 4000);
      }
    } catch {
      setPasswordNotice({ text: "Network error occurred while updating password", type: "error" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40, maxWidth: 900, margin: "0 auto", width: "100%" }}>
      {/* Top Header & Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => router.push("/cashier/pos")}
              className="btn btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-emerald)",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 8,
              }}
            >
              ← Back to POS Register
            </button>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cashier Account Profile</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            👤 Cashier Profile &amp; Account
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Authenticated terminal operator details and login security credentials.
          </p>
        </div>

        <Link
          href="/cashier/activity"
          className="btn btn-ghost"
          style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
        >
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Shift Activity Logs</span>
        </Link>
      </div>

      {/* Main Profile Details Card */}
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
                CASHIER
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Authorized retail checkout operator • ID #{cashier?.employee_id}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
      </div>

      {/* Change Password Card */}
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
          <KeyRound className="w-5 h-5 text-purple-400" />
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Change Cashier Password &amp; Terminal PIN
            </h3>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 0" }}>
              Update your cashier login credentials. Minimum 6 characters.
            </p>
          </div>
        </div>

        {passwordNotice && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              background: passwordNotice.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
              color: passwordNotice.type === "success" ? "var(--accent-emerald)" : "#f59e0b",
              border: `1px solid ${passwordNotice.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {passwordNotice.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{passwordNotice.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 5, fontWeight: 600 }}>
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="input"
                style={{ width: "100%", fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 5, fontWeight: 600 }}>
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="input"
                style={{ width: "100%", fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 5, fontWeight: 600 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="input"
                style={{ width: "100%", fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="btn btn-primary"
              style={{ padding: "10px 20px", fontSize: 12, fontWeight: 700 }}
            >
              {isUpdatingPassword ? "Updating Password..." : "Update Cashier Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
