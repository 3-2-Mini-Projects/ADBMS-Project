"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Tag,
  TrendingUp,
  ArrowUpRight,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Receipt,
  Boxes,
  Plus,
} from "lucide-react";

export function DashboardView() {
  const { currentBranch, currentEmployee } = useApp();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentEmployee?.role === "STOCK_CLERK") {
      router.replace("/inventory/dashboard");
    }
  }, [currentEmployee, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const url = currentBranch
        ? `/api/dashboard/stats?branchId=${currentBranch.branch_id}`
        : "/api/dashboard/stats";
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentBranch]);

  const metrics = data?.metrics ?? {};
  const recentSales = data?.recentSales ?? [];
  const branchSales = data?.branchSales ?? [];
  const paymentMethods = data?.paymentMethods ?? [];
  const topProducts = data?.topProducts ?? [];
  const dailySalesTrend = data?.dailySalesTrend ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Welcome & Quick Actions Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-800/30 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Multi-Branch Operational Overview</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Supermarket Management Hub
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Active Branch:{" "}
              <strong className="text-white font-semibold">
                {currentBranch?.name ?? "All Branches"}
              </strong>{" "}
              ({currentBranch?.city ?? "Central"}). Real-time inventory tracking, POS checkout, and ADBMS audit logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>
            <Link
              href="/cashier/pos"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-xl shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Open POS Checkout</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Net Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              Rs. {Number(metrics.total_revenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
              <span>Discounts: Rs. {Number(metrics.total_discount || 0).toFixed(0)}</span>
              <span>•</span>
              <span>Tax: Rs. {Number(metrics.total_tax || 0).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Completed Sales</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {Number(metrics.total_transactions || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{metrics.total_items_sold || 0} total units sold</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Low Stock Triggers</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {metrics.low_stock_count || 0}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 mt-1">
              <span>{metrics.expiring_batches_count || 0} batches expiring soon</span>
            </div>
          </div>
        </div>

        {/* Active Promos */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-purple-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Campaigns</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {metrics.active_promotions_count || 0} Active
            </div>
            <div className="text-[11px] text-purple-400 mt-1">
              Discounts & loyalty coupons applied
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Daily Sales Trend & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Trend Chart Card */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Sales Trend (daily_sales_vw)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregated daily performance from the database view
              </p>
            </div>
            <Link
              href="/reports"
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>View full view</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {dailySalesTrend.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 h-44 items-end pt-6">
                {dailySalesTrend.map((day: any) => {
                  const maxSale = Math.max(
                    ...dailySalesTrend.map((d: any) => Number(d.total_sales || 1)),
                    1000
                  );
                  const heightPct = Math.max(15, Math.round((Number(day.total_sales) / maxSale) * 100));

                  return (
                    <div key={day.sale_date} className="flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                        Rs.{Number(day.total_sales).toFixed(0)}
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-blue-700 to-indigo-500 hover:from-blue-600 hover:to-indigo-400 transition-all cursor-pointer shadow-lg shadow-blue-900/30 group-hover:scale-y-105 origin-bottom"
                      />
                      <span className="text-[10px] text-slate-400 font-mono mt-1">
                        {new Date(day.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
              No daily sales data recorded yet. Complete a checkout in POS!
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Payment Methods</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">payment_summary_vw</span>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((pm: any) => {
              const totalAmount = Number(pm.total_amount || 0);
              return (
                <div
                  key={pm.method}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        pm.method === "CASH"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : pm.method === "CARD"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : pm.method === "POINTS"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {pm.method[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{pm.method}</div>
                      <div className="text-[11px] text-slate-400">{pm.payment_count} transactions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white font-mono">
                      Rs. {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Products & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              <span>Top Fast-Moving Products</span>
            </h2>
            <Link
              href="/products"
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {topProducts.map((p: any, idx: number) => (
              <div
                key={p.product_id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{p.product_name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono">{p.barcode}</span>
                      <span>•</span>
                      <span>{p.category_name || "General"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    {p.units_sold} sold
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Rs. {Number(p.total_revenue || 0).toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Recent Completed Sales</span>
            </h2>
            <Link
              href="/sales"
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>All Sales</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Sale ID</th>
                  <th className="pb-3 font-medium">Branch</th>
                  <th className="pb-3 font-medium">Cashier</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentSales.map((s: any) => (
                  <tr key={s.sale_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold text-blue-400">
                      <Link href={`/sales?search=${s.sale_id}`} className="hover:underline">
                        #SALE-{s.sale_id}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-300">{s.branch_name}</td>
                    <td className="py-3 text-slate-300">{s.cashier_name}</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-400">
                      Rs. {Number(s.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
