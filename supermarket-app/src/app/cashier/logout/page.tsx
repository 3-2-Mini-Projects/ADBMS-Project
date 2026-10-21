"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCashier } from "@/lib/cashierContext";
import { LogOut, ArrowLeft, Shield, ShoppingCart, Loader2 } from "lucide-react";

export default function CashierLogoutPage() {
  const router = useRouter();
  const { cashier } = useCashier();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexus_cashier_id");
        localStorage.removeItem("adbms_cached_role");
      }
      router.push("/login");
      router.refresh();
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexus_cashier_id");
        localStorage.removeItem("adbms_cached_role");
      }
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "75vh", padding: 20 }}>
      <div
        className="card animate-fade-in"
        style={{
          maxWidth: 460,
          width: "100%",
          padding: 32,
          textAlign: "center",
          borderRadius: 20,
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto",
            borderRadius: 18,
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
          }}
        >
          <LogOut className="w-8 h-8" />
        </div>

        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            Cashier Session Sign Out
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
            Are you sure you want to end your active cashier session on branch terminal{" "}
            <strong>{cashier?.branch_name}</strong>?
          </p>
        </div>

        {cashier && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              textAlign: "left",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #059669, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {cashier.full_name[0]}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{cashier.full_name}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                Operator ID #{cashier.employee_id} • 📍 {cashier.branch_code} ({cashier.branch_name})
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn btn-rose"
            style={{
              width: "100%",
              padding: "11px",
              fontSize: 13,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Confirm Sign Out</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/cashier/pos")}
            className="btn btn-secondary"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Cancel &amp; Return to POS Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/cashier/dashboard")}
            className="btn btn-ghost"
            style={{
              width: "100%",
              padding: "8px",
              fontSize: 11.5,
              color: "var(--text-muted)",
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
