"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  Store,
  UserCheck,
  ShoppingCart,
  Database,
  ChevronDown,
  Sparkles,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { StockAlertBell } from "./StockAlertBell";

export function Header() {
  const { currentBranch, setCurrentBranch, branches, currentEmployee, setCurrentEmployee, employees } = useApp();
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 select-none">
      <div className="flex items-center gap-4">
        {/* Branch Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setBranchDropdownOpen(!branchDropdownOpen);
              setEmployeeDropdownOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all text-xs font-medium text-slate-200"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Branch: <strong className="text-white font-semibold">{currentBranch?.name ?? "Select Branch"}</strong>
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {branchDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Active Branch
              </div>
              {branches.map((b) => (
                <button
                  key={b.branch_id}
                  onClick={() => {
                    setCurrentBranch(b);
                    setBranchDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-600/10 transition-colors ${
                    currentBranch?.branch_id === b.branch_id ? "text-blue-400 font-semibold bg-blue-500/10" : "text-slate-300"
                  }`}
                >
                  <div>
                    <div>{b.name}</div>
                    <div className="text-[10px] text-slate-400">{b.city} • Code: {b.branch_code}</div>
                  </div>
                  {currentBranch?.branch_id === b.branch_id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* POS Fast Button - Only for Admin and Cashier */}
        {(currentEmployee?.role === "ADMIN" || currentEmployee?.role === "CASHIER") && (
          <Link
            href="/pos"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Launch POS</span>
          </Link>
        )}

        {/* Real-Time Stock Alert Bell */}
        <StockAlertBell />

        {/* Employee & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setEmployeeDropdownOpen(!employeeDropdownOpen);
              setBranchDropdownOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all text-xs text-slate-200"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
              {currentEmployee?.full_name ? currentEmployee.full_name[0] : "U"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-white font-semibold leading-none">{currentEmployee?.full_name ?? "Select Staff"}</div>
              <div className="text-[10px] text-blue-400 font-mono mt-0.5">{currentEmployee?.role ?? "ROLE"}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {employeeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 max-h-96 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Switch Staff Role</span>
                <ShieldCheck className="w-3 h-3 text-slate-400" />
              </div>
              <div className="px-3 py-1 text-[10px] text-slate-500">
                Switch between the 5 system roles: Admin, Stock Clerk, Catalog Manager, Marketing, Cashier.
              </div>
              <div className="h-px bg-slate-800 my-1" />
              {employees
                .filter((e) =>
                  ["ADMIN", "STOCK_CLERK", "CATALOG_MANAGER", "MARKETING", "CASHIER"].includes(e.role)
                )
                .map((e) => (
                  <button
                    key={e.employee_id}
                    onClick={() => {
                      setCurrentEmployee(e);
                      setEmployeeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      currentEmployee?.employee_id === e.employee_id ? "bg-slate-800/90 font-semibold" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold">
                        {e.full_name[0]}
                      </div>
                      <div>
                        <div className="text-slate-100">{e.full_name}</div>
                        <div className="text-[10px] text-slate-400">{e.branch_name || "Branch"} • {e.email}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        e.role === "ADMIN"
                          ? "bg-purple-900/60 text-purple-300 border border-purple-700/50"
                          : e.role === "STOCK_CLERK"
                          ? "bg-amber-900/60 text-amber-300 border border-amber-700/50"
                          : e.role === "CATALOG_MANAGER"
                          ? "bg-indigo-900/60 text-indigo-300 border border-indigo-700/50"
                          : e.role === "MARKETING"
                          ? "bg-rose-900/60 text-rose-300 border border-rose-700/50"
                          : e.role === "CASHIER"
                          ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {e.role}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
