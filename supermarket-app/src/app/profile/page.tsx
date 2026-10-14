"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { UserCircle, ShieldCheck, Mail, Phone, Calendar, DollarSign, Building2, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { currentEmployee, currentBranch } = useApp();
  const isAdmin = currentEmployee?.role === "ADMIN";

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <UserCircle className="w-4 h-4 text-purple-400" />
            <span>Staff Account</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Staff Profile &amp; Role Credentials</h1>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-6 shadow-xl">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold shadow-xl ${
              isAdmin
                ? "bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-900/40 ring-2 ring-purple-500/50"
                : "bg-gradient-to-tr from-blue-600 to-emerald-500"
            }`}
          >
            {currentEmployee?.full_name ? currentEmployee.full_name[0] : "A"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                {currentEmployee?.full_name ?? "Administrator"}
              </h2>
              <span
                className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${
                  isAdmin
                    ? "bg-purple-900/80 text-purple-200 border border-purple-700/60"
                    : "bg-blue-900/80 text-blue-200 border border-blue-700/60"
                }`}
              >
                {currentEmployee?.role ?? "ADMIN"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isAdmin
                ? "Super Administrator - Full system governance, branch network authority, audit inspection, and report access."
                : "Active Staff Profile"}
            </p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <Mail className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Email Address</div>
              <div className="text-slate-200 font-mono mt-0.5">{currentEmployee?.email ?? "admin@nexus.supermarket"}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Allocated Branch</div>
              <div className="text-slate-200 font-medium mt-0.5">
                {currentBranch?.name ?? "Central Head Office"} ({currentBranch?.branch_code ?? "HQ"})
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Security Role</div>
              <div className="text-slate-200 font-medium mt-0.5">{currentEmployee?.role ?? "ADMIN"}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Hire Date</div>
              <div className="text-slate-200 font-mono mt-0.5">
                {currentEmployee?.hire_date ? new Date(currentEmployee.hire_date).toLocaleDateString() : "2023-01-01"}
              </div>
            </div>
          </div>
        </div>

        {/* Security Permissions Notice */}
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs space-y-1">
          <div className="font-semibold text-purple-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Role-Based Permissions Status</span>
          </div>
          <p className="text-slate-300">
            {isAdmin
              ? "Your profile is granted unrestricted master privileges across all branches, employee records, POS locks, inventory deductions, and audit logging tables."
              : "Your permissions are scoped to your assigned store and designated role."}
          </p>
        </div>
      </div>
    </div>
  );
}
