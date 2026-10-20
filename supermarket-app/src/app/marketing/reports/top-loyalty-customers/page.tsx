"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/context";
import {
  Trophy,
  Calendar,
  Building2,
  Users,
  Award,
  Sparkles,
  Download,
  Printer,
  ChevronDown,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Store,
  Layers,
} from "lucide-react";

interface RankedCustomer {
  rank: number;
  customer_id: number;
  full_name: string;
  card_no: string;
  phone: string;
  email: string | null;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  total_points_earned: number;
  transaction_count: number;
  sales_count: number;
  branches_visited?: number;
  last_earned_at: string;
  branch_id?: number;
  branch_name?: string;
  branch_code?: string;
  branch_city?: string;
  branch_breakdown?: Array<{
    branch_id: number;
    branch_name: string;
    branch_code: string;
    branch_city: string;
    points_earned: number;
  }>;
}

interface GroupedBranch {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  branch_city: string;
  customers: RankedCustomer[];
}

export default function TopLoyaltyCustomersReportPage() {
  const { currentEmployee, currentBranch, branches, showToast } = useApp();

  // Date Range Defaults
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEndDate = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [scope, setScope] = useState<"branch" | "all">("branch");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Report Data States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [reportResults, setReportResults] = useState<RankedCustomer[]>([]);
  const [branchGroups, setBranchGroups] = useState<GroupedBranch[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);

  const isGlobalUser = currentEmployee?.role === "ADMIN" || !currentEmployee?.branch_id;

  // Auto-set branch filter if employee is branch-restricted
  useEffect(() => {
    if (currentEmployee && !isGlobalUser && currentEmployee.branch_id) {
      setSelectedBranchId(String(currentEmployee.branch_id));
      setScope("branch");
    }
  }, [currentEmployee, isGlobalUser]);

  // Fetch report function
  const fetchReport = async () => {
    if (startDate > endDate) {
      setErrorMsg("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const params = new URLSearchParams();
      params.append("start_date", startDate);
      params.append("end_date", endDate);
      params.append("scope", scope);

      if (scope === "branch" && selectedBranchId !== "ALL") {
        params.append("branch_id", selectedBranchId);
      }

      const res = await fetch(`/api/marketing/reports/top-loyalty-customers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to load top loyalty customer rankings.");
        setReportResults([]);
        setBranchGroups([]);
        return;
      }

      setReportResults(data.results || []);
      setBranchGroups(data.branches || []);
      setUserInfo(data.user_info);
    } catch (err: any) {
      setErrorMsg(err.message || "Network error loading report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [scope]);

  // Quick Preset Helper
  const applyPreset = (preset: "today" | "week" | "month" | "last_month" | "quarter" | "ytd") => {
    const today = new Date();
    let start = new Date();
    const end = new Date();

    if (preset === "today") {
      start = today;
    } else if (preset === "week") {
      start = new Date(today);
      start.setDate(today.getDate() - 7);
    } else if (preset === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === "last_month") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end.setDate(0); // Last day of previous month
    } else if (preset === "quarter") {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), quarterMonth, 1);
    } else if (preset === "ytd") {
      start = new Date(today.getFullYear(), 0, 1);
    }

    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  // Filtered Results by Customer Name or Card
  const filteredCustomers = useMemo(() => {
    if (!searchFilter.trim()) return reportResults;
    const q = searchFilter.toLowerCase();
    return reportResults.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.card_no?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [reportResults, searchFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (reportResults.length === 0) {
      showToast("No report data to export.", "error");
      return;
    }

    const headers =
      scope === "all"
        ? ["Rank", "Card No", "Customer Name", "Tier", "Phone", "Total Points Earned", "Visits", "Branches"]
        : ["Rank", "Branch", "Card No", "Customer Name", "Tier", "Phone", "Points Earned", "Sales Count"];

    const rows = reportResults.map((r) =>
      scope === "all"
        ? [
            r.rank,
            r.card_no,
            `"${r.full_name}"`,
            r.tier,
            r.phone,
            r.total_points_earned,
            r.transaction_count,
            r.branches_visited || 1,
          ]
        : [
            r.rank,
            `"${r.branch_name || ""}"`,
            r.card_no,
            `"${r.full_name}"`,
            r.tier,
            r.phone,
            r.total_points_earned,
            r.sales_count,
          ]
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Top_10_Loyalty_Customers_${scope}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Report exported successfully as CSV!", "success");
  };

  // Summary Metrics
  const totalPoints = reportResults.reduce((acc, curr) => acc + curr.total_points_earned, 0);
  const topMember = reportResults.length > 0 ? reportResults[0] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Top 10 Loyalty Customers</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Identify and rank high-value customers based on qualifying loyalty points earned across selected dates
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            disabled={reportResults.length === 0}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter and Configuration Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {/* Row 1: Scope & Date Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Ranking Scope:</span>
            </span>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setScope("branch")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  scope === "branch"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Top 10 Per Branch</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isGlobalUser) {
                    showToast(
                      "Chain-wide ranking across all branches is restricted to head-office marketing and administrators.",
                      "error"
                    );
                    return;
                  }
                  setScope("all");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  scope === "all"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-950/40"
                    : !isGlobalUser
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-400 hover:text-white"
                }`}
                title={
                  !isGlobalUser
                    ? "Restricted: Chain-wide view requires head-office / administrator role"
                    : "Rank customers chain-wide across all branches"
                }
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>All Branches (Chain-Wide)</span>
                {!isGlobalUser && <span className="text-[10px] text-rose-400 ml-1">🔒</span>}
              </button>
            </div>
          </div>

          {/* Quick Date Range Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Presets:</span>
            {[
              { label: "Today", val: "today" },
              { label: "This Week", val: "week" },
              { label: "This Month", val: "month" },
              { label: "Last Month", val: "last_month" },
              { label: "This Quarter", val: "quarter" },
              { label: "Year to Date", val: "ytd" },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => applyPreset(p.val as any)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Date Inputs, Branch Filter, and Generate Button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Start Date */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Start Date (From)</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-amber-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>End Date (To)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-amber-500"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>Branch Filter</span>
            </label>
            <select
              value={selectedBranchId}
              disabled={scope === "all" || !isGlobalUser}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-semibold focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGlobalUser && (
                <option value="ALL">All Branches (Full Breakdown)</option>
              )}
              {branches.map((b) => (
                <option key={b.branch_id} value={String(b.branch_id)}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Generate Report Button */}
          <div>
            <button
              type="button"
              onClick={fetchReport}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Calculating Rankings..." : "Generate Report"}</span>
            </button>
          </div>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Total Points Earned in Period</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1.5">
            +{totalPoints.toLocaleString()} pts
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Aggregated from {reportResults.length} ranked customer profiles
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Top #1 Ranked Member</span>
          </div>
          <div className="text-lg font-bold text-white mt-1 truncate">
            {topMember ? topMember.full_name : "No qualifying customers"}
          </div>
          <div className="text-[11px] text-amber-400 font-mono mt-0.5">
            {topMember ? `${topMember.card_no} • ${topMember.total_points_earned.toLocaleString()} pts (${topMember.tier})` : "—"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Active Earning Scope</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {scope === "all" ? "Chain-Wide (All Branches)" : selectedBranchId === "ALL" ? "All Operating Branches" : `Branch #${selectedBranchId}`}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {startDate} → {endDate}
          </div>
        </div>
      </div>

      {/* Results Header with Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <span>Rankings Output</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
            {filteredCustomers.length} Top Customers
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search within report results..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Results Table Section */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
          <p className="text-xs font-medium">Aggregating qualifying transactions & calculating window ranks...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
          <div className="text-3xl">🪙</div>
          <h3 className="text-sm font-bold text-white">No qualifying loyalty earnings found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No customers earned points between {startDate} and {endDate} for the selected branch/scope. Try expanding the date range or selecting another branch.
          </p>
        </div>
      ) : scope === "all" ? (
        /* ========================================================================= */
        /* CHAIN-WIDE RANKINGS TABLE                                                 */
        /* ========================================================================= */
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Card Number</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4 text-center">Tier</th>
                  <th className="py-3.5 px-4 text-right">Points Earned</th>
                  <th className="py-3.5 px-4 text-center">Visits / Stores</th>
                  <th className="py-3.5 px-4">Branch Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredCustomers.map((c) => {
                  return (
                    <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Rank Medal Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                            c.rank === 1
                              ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300"
                              : c.rank === 2
                              ? "bg-slate-300 text-slate-950 shadow-md ring-2 ring-slate-200"
                              : c.rank === 3
                              ? "bg-amber-700 text-white shadow-md ring-2 ring-amber-600"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {c.rank}
                        </span>
                      </td>

                      {/* Card Number */}
                      <td className="py-3.5 px-4 font-bold text-amber-400">
                        {c.card_no}
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-4 font-sans font-medium text-white">
                        <div>{c.full_name}</div>
                        {c.email && <div className="text-[10px] text-slate-500 font-mono">{c.email}</div>}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {c.phone}
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded font-bold border ${
                            c.tier === "PLATINUM"
                              ? "bg-purple-950/80 text-purple-300 border-purple-800/60"
                              : c.tier === "GOLD"
                              ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                              : c.tier === "SILVER"
                              ? "bg-slate-800 text-slate-300 border border-slate-700"
                              : "bg-orange-950/80 text-orange-300 border border-orange-800/60"
                          }`}
                        >
                          {c.tier}
                        </span>
                      </td>

                      {/* Points Earned */}
                      <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-sm">
                        +{c.total_points_earned.toLocaleString()} pts
                      </td>

                      {/* Visits / Stores Count */}
                      <td className="py-3.5 px-4 text-center text-slate-300 font-sans">
                        <span className="font-bold text-white">{c.transaction_count}</span> earns •{" "}
                        <span className="text-amber-400 font-semibold">{c.branches_visited || 1} branch(es)</span>
                      </td>

                      {/* Branch Breakdown Pills */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex gap-1.5 flex-wrap">
                          {c.branch_breakdown && c.branch_breakdown.length > 0 ? (
                            c.branch_breakdown.map((b) => (
                              <span
                                key={b.branch_id}
                                className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1"
                              >
                                <span>{b.branch_name}:</span>
                                <strong className="text-emerald-400 font-mono">+{b.points_earned}</strong>
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* PER-BRANCH RANKINGS TABLE (Separated & restarting ranks per branch)        */
        /* ========================================================================= */
        <div className="space-y-6">
          {(branchGroups.length > 0 ? branchGroups : [{ branch_id: 1, branch_name: "Branch", branch_code: "BR", branch_city: "", customers: filteredCustomers }]).map((bg) => (
            <div
              key={bg.branch_id}
              className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl"
            >
              {/* Branch Header Banner */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">
                    {bg.branch_name} ({bg.branch_code})
                  </h3>
                  {bg.branch_city && (
                    <span className="text-[11px] text-slate-400 font-sans font-medium">
                      • {bg.branch_city}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  Top {bg.customers.length} Earners
                </span>
              </div>

              {/* Branch Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                      <th className="py-3 px-4 text-center w-14">Rank</th>
                      <th className="py-3 px-4 font-mono">Card No</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4 text-center">Tier</th>
                      <th className="py-3 px-4 text-right">Points Earned</th>
                      <th className="py-3 px-4 text-center">Sales Transactions</th>
                      <th className="py-3 px-4">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {bg.customers.map((c) => (
                      <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Rank Badge */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                              c.rank === 1
                                ? "bg-amber-400 text-slate-950 font-bold"
                                : c.rank === 2
                                ? "bg-slate-300 text-slate-950 font-bold"
                                : c.rank === 3
                                ? "bg-amber-700 text-white font-bold"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {c.rank}
                          </span>
                        </td>

                        {/* Card Number */}
                        <td className="py-3 px-4 font-bold text-amber-400">{c.card_no}</td>

                        {/* Customer */}
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          <div>{c.full_name}</div>
                          {c.email && <div className="text-[10px] text-slate-500 font-mono">{c.email}</div>}
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 text-slate-300">{c.phone}</td>

                        {/* Tier */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                              c.tier === "PLATINUM"
                                ? "bg-purple-950/80 text-purple-300 border-purple-800/60"
                                : c.tier === "GOLD"
                                ? "bg-amber-950/80 text-amber-300 border-amber-800/60"
                                : c.tier === "SILVER"
                                ? "bg-slate-800 text-slate-300 border border-slate-700"
                                : "bg-orange-950/80 text-orange-300 border border-orange-800/60"
                            }`}
                          >
                            {c.tier}
                          </span>
                        </td>

                        {/* Points */}
                        <td className="py-3 px-4 text-right font-black text-emerald-400 text-sm">
                          +{c.total_points_earned.toLocaleString()} pts
                        </td>

                        {/* Transactions Count */}
                        <td className="py-3 px-4 text-center font-sans text-slate-300">
                          <span className="font-bold text-white">{c.sales_count}</span> purchase(s) •{" "}
                          <span className="text-slate-400">{c.transaction_count} rewards</span>
                        </td>

                        {/* Last Earned Date */}
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {c.last_earned_at ? new Date(c.last_earned_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
