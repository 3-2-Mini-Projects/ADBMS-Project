"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
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
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { currentEmployee, currentBranch, showToast } = useApp();
  const isAdmin = currentEmployee?.role === "ADMIN";

  // Password update form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (currentEmployee?.role === "CASHIER") {
      router.replace("/cashier/profile");
    }
  }, [currentEmployee, router]);

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
        setPasswordNotice({ text: "Password updated successfully!", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showToast("Password updated successfully", "success");
        setTimeout(() => setPasswordNotice(null), 4000);
      }
    } catch {
      setPasswordNotice({ text: "Network error occurred while updating password", type: "error" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700">
            <UserCircle className="w-4 h-4 text-purple-700" />
            <span>Staff Account</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Staff Profile &amp; Credentials</h1>
          <p className="text-xs text-slate-500 mt-1">
            View your allocated store details, security role, and update your account password.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>System Settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-6 shadow-xs">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold shadow-sm ${
              isAdmin
                ? "bg-gradient-to-tr from-purple-600 to-indigo-600"
                : "bg-gradient-to-tr from-blue-600 to-emerald-500"
            }`}
          >
            {currentEmployee?.full_name ? currentEmployee.full_name[0] : "A"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {currentEmployee?.full_name ?? "Staff Member"}
              </h2>
              <span
                className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                  isAdmin
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                {currentEmployee?.role ?? "ADMIN"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin
                ? "Super Administrator - Full system governance, branch network authority, audit inspection, and report access."
                : "Active Staff Profile with role-based branch operations."}
            </p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <Mail className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Email Address</div>
              <div className="text-slate-900 font-mono mt-0.5 font-medium">{currentEmployee?.email ?? "staff@nexus.supermarket"}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Allocated Branch</div>
              <div className="text-slate-900 font-medium mt-0.5">
                {currentBranch?.name ?? "Central Head Office"} ({currentBranch?.branch_code ?? "HQ"})
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Security Role</div>
              <div className="text-slate-900 font-semibold mt-0.5">{currentEmployee?.role ?? "STAFF"}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Hire Date</div>
              <div className="text-slate-900 font-mono mt-0.5 font-medium">
                {currentEmployee?.hire_date ? new Date(currentEmployee.hire_date).toLocaleDateString() : "2023-01-01"}
              </div>
            </div>
          </div>
        </div>

        {/* Security Permissions Notice */}
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-1">
          <div className="font-semibold text-purple-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>Role Permissions &amp; Access Scope</span>
          </div>
          <p className="text-slate-600">
            {isAdmin
              ? "Your profile is granted unrestricted administrative privileges across all branches, employee records, POS locks, inventory deductions, and audit logging tables."
              : "Your permissions are scoped to your assigned store and designated role operations."}
          </p>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <KeyRound className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Keep your credentials secure. Passwords must be at least 6 characters.
            </p>
          </div>
        </div>

        {passwordNotice && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 font-medium border ${
              passwordNotice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            {passwordNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            )}
            <span>{passwordNotice.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
            >
              {isUpdatingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
