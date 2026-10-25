"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context";
import { canAccess } from "@/lib/permissions";
import {
  UserCheck,
  ShoppingCart,
  ChevronDown,
  Building2,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Lock,
} from "lucide-react";
import { StockAlertBell } from "./StockAlertBell";

export function Header() {
  const {
    currentBranch,
    setCurrentBranch,
    branches,
    currentEmployee,
  } = useApp();
  const pathname = usePathname();
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  if (pathname === "/login") {
    return null;
  }

  const isAdmin = currentEmployee?.role === "ADMIN";
  const canManageBranches = currentEmployee
    ? canAccess(currentEmployee.role, "manage_branches")
    : false;
  const canLaunchPOS = currentEmployee
    ? canAccess(currentEmployee.role, "create_pos_sales")
    : false;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 select-none shadow-xs text-slate-800">
      <div className="flex items-center gap-4">
        {/* Branch Indicator / Selector */}
        {canManageBranches ? (
          <div className="relative">
            <button
              onClick={() => {
                setBranchDropdownOpen(!branchDropdownOpen);
                setEmployeeDropdownOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium text-purple-900 bg-purple-50 hover:bg-purple-100 border-purple-200"
              title="Click to switch active branch (Admin)"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Branch: <strong className="text-purple-950 font-semibold">{currentBranch?.name ?? "Select Branch"}</strong>
              </span>
              <ChevronDown className="w-3 h-3 text-purple-500" />
            </button>

            {branchDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Select Active Branch
                </div>
                {branches.map((b) => (
                  <button
                    key={b.branch_id}
                    onClick={() => {
                      setCurrentBranch(b);
                      setBranchDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-purple-50 transition-colors ${
                      currentBranch?.branch_id === b.branch_id ? "text-purple-700 font-semibold bg-purple-50/80" : "text-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-800">{b.name}</div>
                      <div className="text-[10px] text-slate-500">{b.city} • Code: {b.branch_code}</div>
                    </div>
                    {currentBranch?.branch_id === b.branch_id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-medium text-slate-700 select-none cursor-default"
            title={`Assigned Branch: ${currentBranch?.name ?? currentEmployee?.branch_name ?? "Assigned Branch"} (Read-only)`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Branch: <strong className="text-slate-900 font-semibold">{currentBranch?.name ?? currentEmployee?.branch_name ?? "Assigned Branch"}</strong>
            </span>
            <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
          </div>
        )}

        {isAdmin && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-semibold text-purple-700">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Admin Active</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Fast Action Button: Audit Logs for Admin, POS for others */}
        {isAdmin ? (
          <Link
            href="/admin/audit"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-medium text-xs shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>Audit Logs</span>
          </Link>
        ) : canLaunchPOS ? (
          <Link
            href="/cashier/pos"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Launch POS</span>
          </Link>
        ) : null}

        {/* Real-Time Stock Alert Bell */}
        <StockAlertBell />

        {/* Authenticated Staff Card / Sign In Button */}
        {!currentEmployee ? (
          <Link
            href="/login"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-900/30 transition-all hover:scale-[1.02]"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        ) : (
          <div className="relative">
            <button
              onClick={() => {
                setEmployeeDropdownOpen(!employeeDropdownOpen);
                setBranchDropdownOpen(false);
              }}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs ${
                isAdmin
                  ? "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                  isAdmin
                    ? "bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-900/30"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-900/20"
                }`}
              >
                {currentEmployee?.full_name ? currentEmployee.full_name[0] : "U"}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-slate-900 font-semibold leading-none">{currentEmployee?.full_name}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${isAdmin ? "text-purple-700 font-bold" : "text-blue-700 font-bold"}`}>
                  {currentEmployee?.role}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {employeeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
                {/* Authenticated Staff Card */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${
                        isAdmin
                          ? "bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-900/30"
                          : "bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-900/20"
                      }`}
                    >
                      {currentEmployee.full_name ? currentEmployee.full_name[0] : "U"}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {currentEmployee.full_name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate">
                        {currentEmployee.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isAdmin
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : currentEmployee.role === "STOCK_CLERK"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : currentEmployee.role === "CATALOG_MANAGER"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          : currentEmployee.role === "MARKETING"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : currentEmployee.role === "CASHIER"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {currentEmployee.role}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {currentBranch?.name ?? "Branch"}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="p-2 bg-white">
                  <Link
                    href="/logout"
                    onClick={() => setEmployeeDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

