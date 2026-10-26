"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { SignInHistory } from "@/components/profile/SignInHistory";
import { History, ArrowLeft, ShieldCheck, UserCircle, Shield } from "lucide-react";

export default function ActivityPage() {
  const router = useRouter();
  const { currentEmployee, currentBranch } = useApp();

  useEffect(() => {
    if (currentEmployee?.role === "CASHIER") {
      router.replace("/cashier/activity");
    }
  }, [currentEmployee, router]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
            <History className="w-4 h-4 text-blue-600" />
            <span>Account Security &amp; Activity</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Sign-in &amp; Session History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review security audit logs, sign-in timestamps, and authenticated session events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-xs"
          >
            <UserCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>My Profile</span>
          </Link>
        </div>
      </div>

      {/* Account Info Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between flex-wrap gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-sm">
            {currentEmployee?.full_name ? currentEmployee.full_name[0] : "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{currentEmployee?.full_name ?? "User"}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {currentEmployee?.role ?? "STAFF"}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              {currentEmployee?.email ?? "account"} • {currentBranch?.name ?? "Branch"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Active Authenticated Session</span>
        </div>
      </div>

      {/* Reusable History Component */}
      <SignInHistory maxHeight={560} compact={false} />
    </div>
  );
}
