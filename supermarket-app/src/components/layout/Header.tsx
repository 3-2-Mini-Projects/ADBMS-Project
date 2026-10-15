"use client";

import React, { useState } from "react";
import { useApp } from "@/lib/context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  UserCheck,
  ShoppingCart,
  Database,
  ChevronDown,
  Sparkles,
  Building2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export function Header() {
  const {
    currentBranch,
    setCurrentBranch,
    branches,
    currentEmployee,
    setCurrentEmployee,
    employees,
    switchRole,
  } = useApp();
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/activate-account") {
    return null;
  }
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  const isAdmin = currentEmployee?.role === "ADMIN";

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
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium text-slate-200 ${
              isAdmin
                ? "bg-purple-950/30 hover:bg-purple-900/40 border-purple-800/40"
                : "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60"
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${isAdmin ? "text-purple-400" : "text-blue-400"}`} />
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
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-purple-600/10 transition-colors ${
                    currentBranch?.branch_id === b.branch_id ? "text-purple-400 font-semibold bg-purple-500/10" : "text-slate-300"
                  }`}
                >
                  <div>
                    <div>{b.name}</div>
                    <div className="text-[10px] text-slate-400">{b.city} • Code: {b.branch_code}</div>
                  </div>
                  {currentBranch?.branch_id === b.branch_id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Database Live Status Chip */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">MySQL: supermarket_ADBMS</span>
        </div>

        {isAdmin && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-700/60 text-[11px] font-semibold text-purple-300">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin Active</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Fast Action Button: Audit Logs for Admin, POS for others */}
        {isAdmin ? (
          <Link
            href="/audit"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-medium text-xs shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>Audit Logs</span>
          </Link>
        ) : (
          <Link
            href="/pos"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Launch POS</span>
          </Link>
        )}

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
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs text-slate-200 ${
                isAdmin
                  ? "bg-purple-950/40 hover:bg-purple-900/50 border-purple-700/60 ring-1 ring-purple-600/30"
                  : "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                  isAdmin
                    ? "bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-md shadow-purple-900/50"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-500"
                }`}
              >
                {currentEmployee?.full_name ? currentEmployee.full_name[0] : "U"}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-white font-semibold leading-none">{currentEmployee?.full_name}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${isAdmin ? "text-purple-400 font-bold" : "text-blue-400"}`}>
                  {currentEmployee?.role}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          {employeeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
              {/* Direct Role Selector Grid */}
              <div className="px-3 pt-3 pb-2.5 bg-slate-950 border-b border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Role View Preview (UI Filter Only)</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      switchRole("ADMIN");
                      setEmployeeDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isAdmin
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40 ring-1 ring-purple-400"
                        : "bg-slate-800 hover:bg-purple-950/60 text-slate-300 hover:text-purple-200 border border-slate-700/60"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span className="truncate">Admin UI</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRole("MANAGER");
                      setEmployeeDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      currentEmployee?.role === "MANAGER"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400"
                        : "bg-slate-800 hover:bg-blue-950/60 text-slate-300 hover:text-blue-200 border border-slate-700/60"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <span className="truncate">Manager</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRole("STOCK_CLERK");
                      setEmployeeDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      currentEmployee?.role === "STOCK_CLERK"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-900/40 ring-1 ring-amber-400"
                        : "bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-200 border border-slate-700/60"
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="truncate">Stock Clerk</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRole("CASHIER");
                      setEmployeeDropdownOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      currentEmployee?.role === "CASHIER"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400"
                        : "bg-slate-800 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-200 border border-slate-700/60"
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span className="truncate">Cashier</span>
                  </button>
                </div>
              </div>

              {/* Authenticated Session Info & Logout */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-400">
                  Signed in as <strong className="text-slate-200">{currentEmployee.email}</strong>
                </div>
                <Link
                  href="/logout"
                  onClick={() => setEmployeeDropdownOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/50 text-red-300 text-xs font-semibold transition-all"
                >
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
