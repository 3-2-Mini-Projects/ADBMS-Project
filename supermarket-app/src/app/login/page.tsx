"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { getRoleDefaultPath } from "@/lib/permissions";
import {
  Lock,
  Mail,
  Store,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  KeyRound,
  ChevronLeft,
} from "lucide-react";

type LoginStage = "EMAIL" | "LOGIN_PASSWORD" | "SETUP_PASSWORD";

interface EmployeeLookup {
  full_name: string;
  role: string;
  is_registered: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast, refreshAppData, authenticatedUser } = useApp();

  const [stage, setStage] = useState<LoginStage>("EMAIL");
  const [email, setEmail] = useState("");
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeLookup | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to role page
  useEffect(() => {
    if (authenticatedUser) {
      const target = getRoleDefaultPath(authenticatedUser.role);
      router.replace(target);
    }
  }, [authenticatedUser, router]);

  // Validation helpers for setup password
  const hasMinLength = password.length >= 8;
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isSetupValid = hasMinLength && hasUpperLower && hasNumber && passwordsMatch;

  // Step 1: Check Email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage("Please enter a valid work email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(
          data?.error || "No active employee account found with this email. Please contact your manager."
        );
        return;
      }

      setEmployeeInfo({
        full_name: data.full_name,
        role: data.role,
        is_registered: data.is_registered,
      });

      if (data.is_registered) {
        setStage("LOGIN_PASSWORD");
      } else {
        setStage("SETUP_PASSWORD");
      }
    } catch {
      setErrorMessage("Network error occurred while verifying email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2A: Sign In with Existing Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data?.error || "Invalid password. Please check your credentials.");
        return;
      }

      showToast(
        `Welcome back, ${data?.user?.full_name || "Employee"}! (${data?.user?.role || "Staff"})`,
        "success"
      );

      if (data?.user?.role === "CASHIER" && data?.user?.employee_id && typeof window !== "undefined") {
        localStorage.setItem("nexus_cashier_id", String(data.user.employee_id));
      }

      const targetPath = getRoleDefaultPath(data?.user?.role);
      await refreshAppData().catch(() => {});
      router.push(targetPath);
      router.refresh();
    } catch {
      setErrorMessage("Network error while signing in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2B: First-Time Password Setup & Automatic Sign In
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!isSetupValid) {
      setErrorMessage(
        "Password must be at least 8 characters long and contain uppercase, lowercase, and numbers."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data?.error || "Could not set password. Please try again.");
        return;
      }

      showToast(
        `Account setup complete! Welcome, ${data?.user?.full_name || "Employee"}!`,
        "success"
      );

      if (data?.user?.role === "CASHIER" && data?.user?.employee_id && typeof window !== "undefined") {
        localStorage.setItem("nexus_cashier_id", String(data.user.employee_id));
      }

      const targetPath = getRoleDefaultPath(data?.user?.role);
      await refreshAppData().catch(() => {});
      router.push(targetPath);
      router.refresh();
    } catch {
      setErrorMessage("Network error while setting password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToEmail = () => {
    setStage("EMAIL");
    setPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Top Accent Glow */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent ${
              stage === "SETUP_PASSWORD"
                ? "via-amber-500"
                : "via-blue-500"
            } to-transparent transition-all`}
          />

          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-3.5 shadow-lg transition-all ${
                stage === "SETUP_PASSWORD"
                  ? "bg-gradient-to-tr from-amber-600 to-orange-600 shadow-amber-600/20"
                  : "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20"
              }`}
            >
              {stage === "SETUP_PASSWORD" ? (
                <KeyRound className="w-7 h-7" />
              ) : (
                <Store className="w-7 h-7" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {stage === "SETUP_PASSWORD"
                ? "First-Time Account Setup"
                : "Employee Sign In"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {stage === "EMAIL" && "Enter your work email address to get started"}
              {stage === "LOGIN_PASSWORD" && "Enter your password to access your role workspace"}
              {stage === "SETUP_PASSWORD" && "Configure your password to complete registration"}
            </p>
          </div>

          {/* User Identified Pill (Stage 2A & 2B) */}
          {stage !== "EMAIL" && employeeInfo && (
            <div className="mb-5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    stage === "SETUP_PASSWORD" ? "bg-amber-600" : "bg-blue-600"
                  }`}
                >
                  {employeeInfo.full_name[0]}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-white truncate">
                    {employeeInfo.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {email} • <span className="text-blue-400 font-semibold">{employeeInfo.role}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBackToEmail}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-red-200 text-xs animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STAGE 1: Email Input */}
          {stage === "EMAIL" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    autoFocus
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@shop.lk or name@shop.lk"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking Account...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STAGE 2A: Registered User Password */}
          {stage === "LOGIN_PASSWORD" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    autoFocus
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to System</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STAGE 2B: First-Time Setup New Password & Confirm */}
          {stage === "SETUP_PASSWORD" && (
            <form onSubmit={handleSetupSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Create New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    disabled={isSubmitting}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Policy Checklist */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-[11px]">
                <div className="text-slate-400 font-semibold mb-1">Password Requirements:</div>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Minimum 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpperLower ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Uppercase and lowercase letters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>At least one number</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isSetupValid}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium text-sm shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Setting Password & Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Set Password & Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer & Demo Note */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Demo Admin:{" "}
                <strong className="text-slate-300 font-mono">admin@shop.lk</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
