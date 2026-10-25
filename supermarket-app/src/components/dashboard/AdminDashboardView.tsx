"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Users,
  Store,
  Clock,
  ShieldAlert,
  BarChart3,
  Settings,
  RefreshCw,
  ArrowUpRight,
  Database,
  CheckCircle2,
  AlertTriangle,
  Server,
  Lock,
  UserCog,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Activity,
  Layers,
} from "lucide-react";

export function AdminDashboardView() {
  const { currentBranch, branches, employees, currentEmployee } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [resStats, resAudit] = await Promise.all([
        fetch(currentBranch ? `/api/dashboard/stats?branchId=${currentBranch.branch_id}` : "/api/dashboard/stats"),
        fetch("/api/audit"),
      ]);

      const dataStats = await resStats.json();
      const dataAudit = await resAudit.json();

      setStats(dataStats);
      if (dataAudit?.auditLogs) {
        setAuditLogs(dataAudit.auditLogs.slice(0, 6));
      }
      if (dataAudit?.errorLogs) {
        setErrorLogs(dataAudit.errorLogs.slice(0, 5));
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentBranch]);

  // Role distribution summary
  const roleCounts: Record<string, number> = {};
  employees.forEach((e) => {
    roleCounts[e.role] = (roleCounts[e.role] || 0) + 1;
  });

  const metrics = stats?.metrics ?? {};
  const totalRevenue = Number(metrics.total_revenue || 0);
  const totalSales = Number(metrics.total_transactions || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Admin Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 shadow-xs border border-slate-800 text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Super Administrator Governance Console</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-1.5 flex items-center gap-3">
              <span>Admin Management Hub</span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-white/10 text-white border border-white/20 rounded-full">
                ADMIN ACCESS
              </span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Enterprise administration for <strong className="text-white font-bold">{branches.length} Supermarket Branches</strong> and{" "}
              <strong className="text-white font-bold">{employees.length} Staff Members</strong>. Full authority over branch allocations, system permissions, audit trails, and SQL analytics.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-xs"
              title="Refresh Admin Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-white" : ""}`} />
            </button>
            <Link
              href="/admin/audit"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>Security Logs</span>
            </Link>
            <Link
              href="/admin/branches"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Manage Branches</span>
            </Link>
          </div>
        </div>

        {/* Database Status Pill Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-amber-300" />
            <span>Database: <strong className="text-white font-mono">supermarket_ADBMS</strong></span>
          </div>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Connection Pool: <strong className="text-white font-mono">ONLINE (10 conn max)</strong></span>
          </div>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-200" />
            <span>Isolation: <strong className="text-white font-mono">REPEATABLE-READ</strong></span>
          </div>
          <span className="text-white/40">•</span>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-teal-200" />
            <span>Active Admin: <strong className="text-white font-medium">{currentEmployee?.full_name ?? "Administrator"}</strong></span>
          </div>
        </div>
      </div>

      {/* Admin Executive Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Branches */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-purple-400 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Network</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 group-hover:scale-110 transition-transform">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{branches.length}</span>
            <span className="text-xs text-purple-700 font-semibold">Locations</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>All operating active</span>
            <Link href="/branches" className="text-purple-600 hover:text-purple-700 flex items-center gap-1 font-semibold">
              View <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Staff & Roles */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-blue-400 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enterprise Staff</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{employees.length}</span>
            <span className="text-xs text-blue-700 font-semibold">Employees</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>{roleCounts["ADMIN"] || 1} Admins • {roleCounts["MANAGER"] || 0} Managers</span>
            <Link href="/employees" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold">
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Network Sales */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-emerald-400 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Network Revenue</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">Rs. {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>{totalSales} Completed Sales</span>
            <Link href="/reports" className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold">
              Reports <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Audit & Security Telemetry */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-amber-400 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Security Log</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{auditLogs.length}+</span>
            <span className="text-xs text-amber-700 font-semibold">Recent Records</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>DML & DDL Triggers</span>
            <Link href="/audit" className="text-amber-700 hover:text-amber-800 flex items-center gap-1 font-semibold">
              Audit Trail <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Operations Hub (6 Large Action Cards) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Administrative Control Center</h2>
            <p className="text-xs text-slate-500">Direct access to core administrative functions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Branch Management */}
          <Link
            href="/branches"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-400 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    Branch Management
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage store branches, codes, manager assignments, and operational status.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-purple-700 font-semibold">{branches.length} Registered Stores</span>
              <span className="text-slate-400 group-hover:text-purple-600">Configure &gt;</span>
            </div>
          </Link>

          {/* 2. Employee & Roles */}
          <Link
            href="/employees"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <UserCog className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    Employees &amp; Roles
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Staff profiles, branch allocations, salary compensation, and RBAC roles.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-blue-700 font-semibold">{employees.length} Staff Profiles</span>
              <span className="text-slate-400 group-hover:text-blue-600">Manage &gt;</span>
            </div>
          </Link>

          {/* 3. Shifts & Attendance */}
          <Link
            href="/shifts"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-400 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-all">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    Shifts &amp; Rostering
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Employee work schedules, attendance tracking, and clock-in/out records.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-teal-700 font-semibold">Shift Schedule</span>
              <span className="text-slate-400 group-hover:text-teal-600">View Roster &gt;</span>
            </div>
          </Link>

          {/* 4. Audit & Error Logs */}
          <Link
            href="/audit"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-amber-400 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    Audit Trail &amp; Diagnostics
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Immutable database change log (`audit_log`) and system error logs.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-amber-700 font-semibold">Security &amp; Integrity</span>
              <span className="text-slate-400 group-hover:text-amber-600">Inspect Logs &gt;</span>
            </div>
          </Link>

          {/* 5. Reports & SQL Views */}
          <Link
            href="/reports"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-400 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Reports &amp; SQL Views
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ADBMS database views (`daily_sales_vw`, `branch_sales_vw`, `cashier_sales_vw`).
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-emerald-700 font-semibold">ADBMS Analytics</span>
              <span className="text-slate-400 group-hover:text-emerald-600">Run Reports &gt;</span>
            </div>
          </Link>

          {/* 6. System Settings */}
          <Link
            href="/settings"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Settings className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    System &amp; DB Settings
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  MySQL pool settings, database maintenance, branch policy rules.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-indigo-700 font-semibold">Configuration</span>
              <span className="text-slate-400 group-hover:text-indigo-600">Preferences &gt;</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Two-Column Section: Branch Overview Table & Live Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Branch Overview Table (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Branch Network Status</h3>
              </div>
              <Link href="/branches" className="text-xs text-purple-700 hover:text-purple-800 font-semibold">
                Manage All &gt;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 font-semibold">Branch</th>
                    <th className="py-2.5 font-semibold">City / Region</th>
                    <th className="py-2.5 font-semibold">Code</th>
                    <th className="py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map((b) => (
                    <tr key={b.branch_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{b.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{b.city}, {b.region}</td>
                      <td className="py-3 font-mono text-[11px] text-purple-700 font-bold">{b.branch_code}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/branches"
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[11px] font-medium transition-colors"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Multi-Branch ADBMS synchronization</span>
            <span className="text-emerald-700 font-semibold">100% Operational</span>
          </div>
        </div>

        {/* Live Audit Stream (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Audit Log Feed</h3>
              </div>
              <Link href="/audit" className="text-xs text-amber-700 hover:text-amber-800 font-semibold">
                Full Trail &gt;
              </Link>
            </div>

            <div className="space-y-2.5">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div
                    key={log.audit_id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          log.action === "INSERT"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : log.action === "UPDATE"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {log.action}
                      </span>
                      <div>
                        <div className="text-slate-800 font-medium font-mono text-[11px]">
                          {log.table_name} #{log.record_id}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          by <strong className="text-slate-700">{log.changed_by || "System"}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No recent audit entries detected
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>DML/DDL tracking active</span>
            <span className="text-amber-700 font-semibold font-mono text-[11px]">audit_log</span>
          </div>
        </div>
      </div>
    </div>
  );
}
