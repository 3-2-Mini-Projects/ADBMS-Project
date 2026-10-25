"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { UserCircle, ShieldCheck, Mail, Phone, Calendar, DollarSign, Building2, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { currentEmployee, currentBranch } = useApp();
  const isAdmin = currentEmployee?.role === "ADMIN";

  useEffect(() => {
    if (currentEmployee?.role === "CASHIER") {
      router.replace("/cashier/profile");
    }
  }, [currentEmployee, router]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-700">
            <UserCircle className="w-4 h-4 text-purple-700" />
            <span>Staff Account</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Staff Profile &amp; Role Credentials</h1>
        </div>
        <Link
          href={currentEmployee?.role === "CASHIER" ? "/cashier/dashboard" : "/dashboard"}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all border border-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{currentEmployee?.role === "CASHIER" ? "Cashier Desk" : "Dashboard"}</span>
        </Link>
      </div>

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
                {currentEmployee?.full_name ?? "Administrator"}
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
                : "Active Staff Profile"}
            </p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <Mail className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Email Address</div>
              <div className="text-slate-900 font-mono mt-0.5 font-medium">{currentEmployee?.email ?? "admin@nexus.supermarket"}</div>
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
              <div className="text-slate-900 font-semibold mt-0.5">{currentEmployee?.role ?? "ADMIN"}</div>
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
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Role-Based Permissions Status</span>
          </div>
          <p className="text-slate-600">
            {isAdmin
              ? "Your profile is granted unrestricted master privileges across all branches, employee records, POS locks, inventory deductions, and audit logging tables."
              : "Your permissions are scoped to your assigned store and designated role."}
          </p>
        </div>
      </div>
    </div>
  );
}
