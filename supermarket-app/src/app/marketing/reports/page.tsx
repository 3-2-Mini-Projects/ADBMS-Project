"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Percent,
  Ticket,
  Building2,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Users,
  Trophy,
} from "lucide-react";
import type {
  MarketingSummaryRow,
  PromoReportRow,
  BranchReportRow,
  TierReportRow,
  DailyTrendRow,
} from "@/app/api/marketing/reports/route";
import { MarketingPredictiveAnalytics } from "@/components/marketing/MarketingPredictiveAnalytics";

interface MarketingReportData {
  summary: MarketingSummaryRow;
  promotions: PromoReportRow[];
  branchSales: BranchReportRow[];
  tierBreakdown: TierReportRow[];
  dailyTrend: DailyTrendRow[];
}

export default function MarketingReportsPage() {
  const { currentBranch, currentEmployee, authenticatedUser, isLoading: isAppLoading } = useApp();
  const [data, setData] = useState<MarketingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"analytics" | "campaigns" | "coupons" | "branch" | "daily">("analytics");

  const userBranchId = currentBranch?.branch_id || currentEmployee?.branch_id || authenticatedUser?.branch_id;

  const loadReportData = async () => {
    if (!userBranchId && isAppLoading) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (userBranchId) {
        params.append("branchId", String(userBranchId));
      }
      const res = await fetch(`/api/marketing/reports?${params.toString()}`);
      if (res.ok) {
        const json: unknown = await res.json();
        if (json && typeof json === "object" && "summary" in json) {
          setData(json as MarketingReportData);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const msg = errJson?.error || `Server returned status ${res.status}`;
        setErrorMsg(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading marketing report";
      setErrorMsg(msg);
      console.error("Error loading marketing report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAppLoading || userBranchId) {
      loadReportData();
    }
  }, [userBranchId, isAppLoading]);

  const summary = data?.summary;
  const promotions = data?.promotions || [];
  const branchSales = data?.branchSales || [];
  const tierBreakdown = data?.tierBreakdown || [];
  const dailyTrend = data?.dailyTrend || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:border-b-2 print:border-black">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 print:text-black">
            <BarChart3 className="w-6 h-6 text-amber-400 print:text-black" />
            <span>Marketing Analytics & Campaign Report</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 print:hidden flex-wrap">
          <Link
            href="/marketing/reports/top-loyalty-customers"
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-500/30 shadow-md"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top 10 Loyalty Report</span>
          </Link>

          <button
            onClick={loadReportData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export / Print PDF</span>
          </button>
        </div>
      </div>

      {/* Error Alert if request failed */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadReportData}
            className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-white font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3 Executive KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3">
        {/* KPI 1: Gross Revenue */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-white print:border-gray-300">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gross Revenue</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-400 print:hidden" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1 print:text-black">
            Rs. {Number(summary?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {summary?.total_transactions || 0} completed checkouts
          </div>
        </div>

        {/* KPI 2: Total Discounts Given */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-white print:border-gray-300">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Discounts Absorbed</span>
            <Percent className="w-3.5 h-3.5 text-rose-400 print:hidden" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1 print:text-black">
            Rs. {Number(summary?.total_discounts || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Promotions & vouchers
          </div>
        </div>

        {/* KPI 3: Discount-to-Sales Ratio */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-white print:border-gray-300">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Discount / Sales %</span>
            <Percent className="w-3.5 h-3.5 text-amber-400 print:hidden" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1 print:text-black">
            {summary?.discount_ratio_pct || 0}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Healthy target: 2% – 5%
          </div>
        </div>

      </div>

      {/* Navigation Tabs (Hidden in Print) */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-1 print:hidden">
        {[
          { key: "analytics", label: "Predictive Analytics & Growth", icon: Sparkles },
          { key: "campaigns", label: `Active Promotions (${promotions.length})`, icon: Percent },
          { key: "coupons", label: `Coupon Utilization Ledger (${summary?.total_coupons || 0})`, icon: Ticket },
          { key: "branch", label: "Store Branch Performance", icon: Building2 },
          { key: "daily", label: "Daily Discount Trend", icon: Calendar },
        ].map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                isSelected
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 0: PREDICTIVE PERFORMANCE & GROWTH DECISIONS (GRAPH + PIE CHART) */}
      {/* ========================================================================= */}
      <div className={activeTab === "analytics" ? "block" : "hidden print:block"}>
        <MarketingPredictiveAnalytics
          summary={summary}
          dailyTrend={dailyTrend}
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PROMOTIONS & CAMPAIGNS PERFORMANCE */}
      {/* ========================================================================= */}
      <div className={activeTab === "campaigns" ? "block" : "hidden print:block"}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl print:border-gray-300 print:bg-white">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between print:border-b print:bg-gray-100">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                <Percent className="w-4 h-4 text-emerald-400 print:text-black" />
                <span>Active Promotional Campaigns</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold print:text-black">
              <span>{promotions.length} Active Campaigns</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold print:border-gray-300 print:bg-gray-50 print:text-black">
                  <th className="py-3 px-4 font-mono">ID</th>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4 text-center">Discount %</th>
                  <th className="py-3 px-4 font-mono">Start Date</th>
                  <th className="py-3 px-4 font-mono">End Date</th>
                  <th className="py-3 px-4 text-center">Linked Coupons</th>
                  <th className="py-3 px-4 text-center">Redeemed</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono print:divide-gray-200 print:text-black">
                {promotions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No promotion records found.
                    </td>
                  </tr>
                ) : (
                  promotions.map((p) => (
                    <tr key={p.promo_id} className="hover:bg-slate-800/30 transition-colors print:hover:bg-transparent">
                      <td className="py-3 px-4 text-slate-500">#{p.promo_id}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-white print:text-black">{p.name}</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold print:text-black">{Number(p.discount_percent)}%</td>
                      <td className="py-3 px-4 text-slate-400 print:text-black">
                        {p.start_date ? new Date(p.start_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-400 print:text-black">
                        {p.end_date ? new Date(p.end_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-400 font-bold print:text-black">{p.associated_coupons || 0}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold print:text-black">{p.redeemed_coupons || 0}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50 print:bg-emerald-100 print:text-emerald-800"
                              : p.status === "SCHEDULED"
                              ? "bg-blue-950 text-blue-400 border border-blue-800/50 print:bg-blue-100 print:text-blue-800"
                              : "bg-slate-800 text-slate-400 border border-slate-700 print:bg-gray-100 print:text-gray-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: COUPON & VOUCHER UTILIZATION LEDGER */}
      {/* ========================================================================= */}
      <div className={activeTab === "coupons" ? "block" : "hidden print:block"}>
        <div className="space-y-4">
          {/* Inventory Funnel Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono print:grid-cols-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 print:bg-white print:border-gray-300">
              <div className="text-xs text-slate-400 font-sans">Total Issued</div>
              <div className="text-xl font-bold text-white mt-1 print:text-black">{summary?.total_coupons || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">All vouchers</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 print:bg-white print:border-gray-300">
              <div className="text-xs text-slate-400 font-sans">Active & Ready</div>
              <div className="text-xl font-bold text-amber-400 mt-1 print:text-black">{summary?.available_coupons || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Within validity</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 print:bg-white print:border-gray-300">
              <div className="text-xs text-slate-400 font-sans">Redeemed at POS</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 print:text-black">{summary?.redeemed_coupons || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Successfully applied</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 print:bg-white print:border-gray-300">
              <div className="text-xs text-slate-400 font-sans">Expired Unused</div>
              <div className="text-xl font-bold text-rose-400 mt-1 print:text-black">{summary?.expired_coupons || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Past deadline</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 print:bg-white print:border-gray-300">
              <div className="text-xs text-slate-400 font-sans">VIP Targeted</div>
              <div className="text-xl font-bold text-purple-400 mt-1 print:text-black">{summary?.vip_coupons || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Customer-bound</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 print:bg-white print:border-gray-300">
              <div className="text-xs text-slate-400 font-sans">Public Vouchers</div>
              <div className="text-xl font-bold text-blue-400 mt-1 print:text-black">{summary?.public_coupons || 0}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Open redemption</div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: STORE BRANCH PERFORMANCE (branch_sales_vw) */}
      {/* ========================================================================= */}
      <div className={activeTab === "branch" ? "block" : "hidden print:block"}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl print:border-gray-300 print:bg-white">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between print:border-b print:bg-gray-100">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                <Building2 className="w-4 h-4 text-blue-400 print:text-black" />
                <span>Store Marketing & Sales Performance</span>
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold font-mono print:border-gray-300 print:bg-gray-50 print:text-black">
                  <th className="py-3 px-4 font-sans">Branch Store</th>
                  <th className="py-3 px-4 font-sans">City / Region</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">Gross Sales</th>
                  <th className="py-3 px-4 text-right">Discounts Absorbed</th>
                  <th className="py-3 px-4 text-center">Discount % of Sales</th>
                  <th className="py-3 px-4 text-right">Net Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono print:divide-gray-200 print:text-black">
                {branchSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      No branch sales records available.
                    </td>
                  </tr>
                ) : (
                  branchSales.map((b) => (
                    <tr key={b.branch_id} className="hover:bg-slate-800/30 transition-colors print:hover:bg-transparent">
                      <td className="py-3 px-4 font-sans font-bold text-white print:text-black">{b.branch_name}</td>
                      <td className="py-3 px-4 font-sans text-slate-400 print:text-black">{b.city}</td>
                      <td className="py-3 px-4 text-center text-slate-300 print:text-black">{b.transactions}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400 print:text-black">
                        Rs. {Number(b.total_sales).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-400 font-bold print:text-black">
                        -Rs. {Number(b.total_discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-300 font-bold print:text-black">
                        {b.discount_pct}%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300 print:text-black">
                        Rs. {Number(b.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: DAILY CHECKOUT DISCOUNT TREND (daily_sales_vw) */}
      {/* ========================================================================= */}
      <div className={activeTab === "daily" ? "block" : "hidden print:block"}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl print:border-gray-300 print:bg-white">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between print:border-b print:bg-gray-100">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                <Calendar className="w-4 h-4 text-amber-400 print:text-black" />
                <span>Daily Checkout Sales & Promotional Discount Trend</span>
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold font-mono print:border-gray-300 print:bg-gray-50 print:text-black">
                  <th className="py-3 px-4 font-sans">Date</th>
                  <th className="py-3 px-4 text-center">Transactions</th>
                  <th className="py-3 px-4 text-right">Discounts Granted</th>
                  <th className="py-3 px-4 text-right">Net Sales Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono print:divide-gray-200 print:text-black">
                {dailyTrend.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                      No daily records found.
                    </td>
                  </tr>
                ) : (
                  dailyTrend.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors print:hover:bg-transparent">
                      <td className="py-3 px-4 text-blue-400 font-bold font-sans print:text-black">
                        {new Date(row.sale_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center text-white print:text-black">{row.transactions}</td>
                      <td className="py-3 px-4 text-right text-rose-400 font-bold print:text-black">
                        -Rs. {Number(row.total_discount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold print:text-black">
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
    </div>
  );
}
