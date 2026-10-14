"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { LogOut, ShieldCheck, ArrowRight, RotateCcw } from "lucide-react";

export default function LogoutPage() {
  const { currentEmployee, switchRole } = useApp();
  const isAdmin = currentEmployee?.role === "ADMIN";

  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
        <LogOut className="w-7 h-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Session Management</h1>
        <p className="text-xs text-slate-400 mt-1.5">
          Active Session: <strong className="text-slate-200">{currentEmployee?.full_name ?? "Administrator"}</strong> ({currentEmployee?.role ?? "ADMIN"})
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 text-left space-y-2">
        <div className="font-semibold text-purple-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Role Switch Simulation</span>
        </div>
        <p className="text-[11px] text-slate-400">
          In this ADBMS demonstration, sessions are managed via the role switcher in the header. You can switch to another staff view or return to the Admin Console.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/dashboard"
          className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-1.5"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => switchRole("CASHIER")}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Switch to Cashier</span>
        </button>
      </div>
    </div>
  );
}
