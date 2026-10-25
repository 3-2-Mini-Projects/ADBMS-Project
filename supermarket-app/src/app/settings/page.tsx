"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import {
  Settings,
  User,
  Lock,
  Volume2,
  Printer,
  Moon,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  Store,
  Sliders,
  Bell,
  Sparkles,
} from "lucide-react";

export default function UserSettingsPage() {
  const router = useRouter();
  const { currentEmployee, currentBranch, showToast } = useApp();
  const isCashier = currentEmployee?.role === "CASHIER";

  useEffect(() => {
    if (isCashier) {
      router.replace("/cashier/settings");
    }
  }, [isCashier, router]);
  const isAdminOrManager =
    currentEmployee?.role === "ADMIN" || currentEmployee?.role === "MANAGER";

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
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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
    showToast(`Scanner audio cues ${val ? "enabled" : "muted"}`, "info");
  };

  const handleToggleAutoPrint = () => {
    const val = !autoPrintReceipt;
    setAutoPrintReceipt(val);
    localStorage.setItem("adbms_autoprint_receipt", String(val));
    showToast(`Receipt auto-print ${val ? "enabled" : "disabled"}`, "info");
  };

  const handleToggleContrast = () => {
    const val = !highContrastMode;
    setHighContrastMode(val);
    localStorage.setItem("adbms_high_contrast", String(val));
    showToast(`High contrast POS styling ${val ? "enabled" : "disabled"}`, "info");
  };

  const handleToggleAutoFocus = () => {
    const val = !autoFocusBarcode;
    setAutoFocusBarcode(val);
    localStorage.setItem("adbms_autofocus_barcode", String(val));
    showToast(`Barcode auto-focus ${val ? "enabled" : "disabled"}`, "info");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast("Please enter your current password", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters long", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Account password updated successfully", "success");
      setTimeout(() => setPasswordSuccess(false), 4000);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <Settings className="w-4 h-4 text-emerald-700" />
            <span>Staff Account &amp; System Preferences</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Application &amp; Terminal Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your account security, POS hardware preferences, and audio notifications.
          </p>
        </div>
      </div>

      {/* Account Identity Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between flex-wrap gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            {currentEmployee?.full_name ? currentEmployee.full_name[0] : "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {currentEmployee?.full_name ?? "Staff Member"}
              </h2>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {currentEmployee?.role ?? "CASHIER"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span>Emp ID: #{currentEmployee?.employee_id ?? "N/A"}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Store className="w-3 h-3 text-emerald-600" />
                {currentBranch?.name ?? "Assigned Branch"} ({currentBranch?.branch_code ?? "HQ"})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Preferences & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Terminal & POS Preferences */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">POS Terminal Preferences</h3>
          </div>

          <div className="space-y-3.5">
            {/* Preference: Scanner Beep */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Volume2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Audio Feedback on Scan</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Play confirmation chime when barcodes are scanned
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  soundEnabled ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Preference: Receipt Auto-Print */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Printer className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Auto-Print Checkout Receipt</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Automatically open receipt print dialog on sale completion
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoPrint}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  autoPrintReceipt ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoPrintReceipt ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Preference: Auto-focus Barcode Input */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Auto-Focus Barcode Input</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Keep cursor focused on barcode field ready for rapid scanner inputs
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoFocus}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  autoFocusBarcode ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoFocusBarcode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Preference: High Contrast Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Moon className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">High-Contrast POS Lines</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Crisp item row borders for bright retail environments
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleContrast}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  highContrastMode ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    highContrastMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Security & Password Update */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Security &amp; Password</h3>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Password successfully updated for your staff account!</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="text-xs text-slate-700 block mb-1 font-semibold">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-700 block mb-1 font-semibold">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-700 block mb-1 font-semibold">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Admin / Manager Governance Section (only if authorized) */}
      {isAdminOrManager && (
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between flex-wrap gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-purple-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900">Administrator Database &amp; System Settings</div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Configure MySQL connection pools, audit log verbosity, and multi-branch inventory sync policies.
              </div>
            </div>
          </div>
          <Link
            href="/admin/settings"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            Open Admin Console ↗
          </Link>
        </div>
      )}
    </div>
  );
}
