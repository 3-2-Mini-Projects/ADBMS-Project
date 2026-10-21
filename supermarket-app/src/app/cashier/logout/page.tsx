"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { useCashier } from "@/lib/cashierContext";
import { LogOut, ArrowRight, Loader2, UserCheck, Shield } from "lucide-react";

export default function CashierLogoutPage() {
  const router = useRouter();
  const { currentEmployee, setCurrentEmployee, showToast, refreshAppData } = useApp();
  const { cashier } = useCashier();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeName = cashier?.full_name || currentEmployee?.full_name || "Cashier Staff";
  const activeEmail = cashier?.email || currentEmployee?.email || "cashier@supermarket.adbms";
  const branchName = cashier?.branch_name || currentEmployee?.branch_name || "Assigned Branch";
  const branchCode = cashier?.branch_code || "POS";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentEmployee(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("nexus_cashier_id");
        localStorage.removeItem("adbms_cached_role");
      }
      await refreshAppData().catch(() => {});
      showToast("You have been signed out successfully.", "info");
      router.push("/login");
      router.refresh();
    } catch {
      showToast("Network error while signing out. Cookie cleared.", "warning");
      setCurrentEmployee(null);
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
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto my-12 p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400 shadow-lg shadow-red-950/50">
          <LogOut className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Session Sign Out
          </h1>
          <p className="text-xs text-slate-400 mt-2">
            End your authenticated session for the Supermarket ADBMS platform.
          </p>
        </div>

        {cashier || currentEmployee ? (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-left space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Active Authenticated Employee</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {activeName}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {activeEmail} • Role:{" "}
              <span className="text-emerald-400 font-semibold">CASHIER</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
              Branch: {branchName} ({branchCode})
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400">
            No active authenticated session detected.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {cashier || currentEmployee ? (
            <>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Confirm Sign Out</span>
                  </>
                )}
              </button>
              <Link
                href="/cashier/dashboard"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Cancel</span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign In to Your Account</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
