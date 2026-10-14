"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Tag,
  Gift,
  Coins,
  Sparkles,
  Users,
} from "lucide-react";

export default function MarketingReportsPage() {
  const { currentBranch } = useApp();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
        const res = await fetch(`/api/marketing/dashboard?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setReportData(json);
        }
      } catch (err) {
        console.error("Error loading marketing reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [currentBranch]);

  const discountTrend = reportData?.discountTrend || [];
  const tierBreakdown = reportData?.tierBreakdown || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Marketing Analytics & Campaign Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical discount trends, campaign revenue return, and membership points redemption reporting from daily_sales_vw and database ledgers.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400">Total Discounts Granted</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            Rs. {Number(reportData?.summary?.total_discounts_given ?? 0).toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400">Loyalty Member Sales Total</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            Rs. {Number(reportData?.summary?.member_revenue ?? 0).toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400">Points Currency Redeemed</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            Rs. {Number(reportData?.summary?.points_currency_redeemed ?? 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Daily Sales & Discount Trend Table (from daily_sales_vw) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Daily Promotional Discounts (daily_sales_vw)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Aggregated daily checkout transactions and promotional discounts applied.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Transactions</th>
                <th className="py-3 px-4 text-right">Total Discounts</th>
                <th className="py-3 px-4 text-right">Net Sales Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                    Loading marketing reports...
                  </td>
                </tr>
              ) : discountTrend.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                    No discount records found.
                  </td>
                </tr>
              ) : (
                discountTrend.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-blue-400 font-bold">
                      {new Date(row.sale_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center text-white">{row.transactions}</td>
                    <td className="py-3 px-4 text-right text-rose-400">
                      -Rs. {Number(row.total_discount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                      Rs. {Number(row.total_sales).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
