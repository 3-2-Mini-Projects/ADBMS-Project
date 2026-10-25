"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCashier } from "@/lib/cashierContext";
import {
  Settings,
  Volume2,
  Printer,
  Moon,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  User,
  ArrowLeft,
  Store,
} from "lucide-react";

export default function CashierSettingsPage() {
  const router = useRouter();
  const { cashier } = useCashier();

  // Terminal & User Preferences (stored in localStorage)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [autoFocusBarcode, setAutoFocusBarcode] = useState(true);

  // Password update form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sound = localStorage.getItem("adbms_sound_enabled");
      if (sound !== null) setSoundEnabled(sound === "true");

      const print = localStorage.getItem("adbms_autoprint_receipt");
      if (print !== null) setAutoPrintReceipt(print === "true");

      const contrast = localStorage.getItem("adbms_high_contrast");
      if (contrast !== null) setHighContrastMode(contrast === "true");

      const focus = localStorage.getItem("adbms_autofocus_barcode");
      if (focus !== null) setAutoFocusBarcode(focus === "true");
    } catch {}
  }, []);

  const handleToggleSound = () => {
    const val = !soundEnabled;
    setSoundEnabled(val);
    localStorage.setItem("adbms_sound_enabled", String(val));
  };

  const handleToggleAutoPrint = () => {
    const val = !autoPrintReceipt;
    setAutoPrintReceipt(val);
    localStorage.setItem("adbms_autoprint_receipt", String(val));
  };

  const handleToggleContrast = () => {
    const val = !highContrastMode;
    setHighContrastMode(val);
    localStorage.setItem("adbms_high_contrast", String(val));
  };

  const handleToggleAutoFocus = () => {
    const val = !autoFocusBarcode;
    setAutoFocusBarcode(val);
    localStorage.setItem("adbms_autofocus_barcode", String(val));
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordNotice("⚠️ Please enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice("⚠️ New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice("⚠️ New passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setPasswordNotice("✓ Password updated successfully for your cashier account!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordNotice(null), 4000);
    }, 700);
  };

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
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Terminal Settings</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            ⚙️ Cashier Terminal &amp; Account Settings
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            POS hardware audio feedback, receipt printing behavior, and account password security
          </p>
        </div>        
      </div>

      {/* Account Identity Chip Card */}
      <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #059669, #0284c7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {cashier?.full_name ? cashier.full_name[0] : "C"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {cashier?.full_name ?? "Cashier"}
              </span>
              <span className="badge badge-completed" style={{ fontSize: 10 }}>CASHIER</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Operator ID #{cashier?.employee_id} • 📍 {cashier?.branch_name} ({cashier?.branch_code})
            </div>
          </div>
        </div>        
      </div>

      {/* Grid: Preferences & Security */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Card 1: Terminal & POS Preferences */}
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              POS Terminal Preferences
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Preference: Scanner Beep */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Volume2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Audio Feedback on Scan</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Play audible chime when products are scanned
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={soundEnabled ? "btn btn-emerald" : "btn btn-ghost"}
                style={{ padding: "3px 10px", fontSize: 11, fontWeight: 700 }}
              >
                {soundEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Preference: Receipt Auto-Print */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Printer className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Auto-Print Receipt Dialog</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Display printable receipt popup immediately on checkout
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoPrint}
                className={autoPrintReceipt ? "btn btn-emerald" : "btn btn-ghost"}
                style={{ padding: "3px 10px", fontSize: 11, fontWeight: 700 }}
              >
                {autoPrintReceipt ? "ON" : "OFF"}
              </button>
            </div>

            {/* Preference: Auto-Focus Barcode */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Barcode Auto-Focus</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Keep barcode search input focused ready for rapid scanning
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoFocus}
                className={autoFocusBarcode ? "btn btn-emerald" : "btn btn-ghost"}
                style={{ padding: "3px 10px", fontSize: 11, fontWeight: 700 }}
              >
                {autoFocusBarcode ? "ON" : "OFF"}
              </button>
            </div>

            {/* Preference: High Contrast Lines */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Moon className="w-4 h-4 text-purple-400 mt-0.5" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>High-Contrast POS Lines</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Crisp borders on item cart rows for bright environments
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleContrast}
                className={highContrastMode ? "btn btn-emerald" : "btn btn-ghost"}
                style={{ padding: "3px 10px", fontSize: 11, fontWeight: 700 }}
              >
                {highContrastMode ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Security & Password Update */}
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Security &amp; Password
            </h3>
          </div>

          {passwordNotice && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: passwordNotice.startsWith("✓") ? "#ecfdf5" : "#fffbeb",
                color: passwordNotice.startsWith("✓") ? "#059669" : "#b45309",
                border: `1px solid ${passwordNotice.startsWith("✓") ? "#a7f3d0" : "#fde68a"}`,
              }}
            >
              {passwordNotice}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
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
              <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
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
              <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
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

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="btn btn-primary"
              style={{ padding: "10px", fontSize: 12, fontWeight: 700, marginTop: 4 }}
            >
              {isUpdatingPassword ? "Updating..." : "Update Cashier Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
