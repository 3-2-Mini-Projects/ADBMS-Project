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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 shadow-xs border border-slate-800 text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Multi-Branch Operational Overview</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
              Supermarket Management Hub
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              Active Branch:{" "}
              <strong className="text-white font-bold">
                {currentBranch?.name ?? "All Branches"}
              </strong>{" "}
              ({currentBranch?.city ?? "Central"}). Real-time inventory tracking, POS checkout, and ADBMS audit logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-xs"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-white" : ""}`} />
            </button>
            <Link
              href="/cashier/pos"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:scale-[1.01] active:scale-[0.99] transition-all"
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
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              Rs. {Number(metrics.total_revenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span>Discounts: Rs. {Number(metrics.total_discount || 0).toFixed(0)}</span>
              <span>•</span>
              <span>Tax: Rs. {Number(metrics.total_tax || 0).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Sales</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {Number(metrics.total_transactions || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{metrics.total_items_sold || 0} total units sold</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Triggers</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.low_stock_count || 0}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium mt-1">
              <span>{metrics.expiring_batches_count || 0} batches expiring soon</span>
            </div>
          </div>
        </div>

        {/* Active Promos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Campaigns</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:scale-110 transition-transform">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.active_promotions_count || 0} Active
            </div>
            <div className="text-[11px] text-purple-700 font-medium mt-1">
              Discounts & loyalty coupons applied
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Daily Sales Trend & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Trend Chart Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Sales Trend (daily_sales_vw)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated daily performance from the database view
              </p>
            </div>
            <Link
              href="/reports"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
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
                      <div className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                        Rs.{Number(day.total_sales).toFixed(0)}
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 transition-all cursor-pointer shadow-sm group-hover:scale-y-105 origin-bottom"
                      />
                      <span className="text-[10px] text-slate-500 font-mono mt-1">
                        {new Date(day.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
              No daily sales data recorded yet. Complete a checkout in POS!
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payment Methods</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">payment_summary_vw</span>
          </div>

          <div className="space-y-3">
            {paymentMethods.map((pm: any) => {
              const totalAmount = Number(pm.total_amount || 0);
              return (
                <div
                  key={pm.method}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        pm.method === "CASH"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : pm.method === "CARD"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : pm.method === "POINTS"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {pm.method[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{pm.method}</div>
                      <div className="text-[11px] text-slate-500">{pm.payment_count} transactions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 font-mono">
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <span>Top Fast-Moving Products</span>
            </h2>
            <Link
              href="/products"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {topProducts.map((p: any, idx: number) => (
              <div
                key={p.product_id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{p.product_name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-mono">{p.barcode}</span>
                      <span>•</span>
                      <span>{p.category_name || "General"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-700 font-mono">
                    {p.units_sold} sold
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Rs. {Number(p.total_revenue || 0).toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Recent Completed Sales</span>
            </h2>
            <Link
              href="/sales"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>All Sales</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-3">Sale ID</th>
                  <th className="pb-3">Branch</th>
                  <th className="pb-3">Cashier</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((s: any) => (
                  <tr key={s.sale_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-mono font-bold text-blue-600">
                      <Link href={`/sales?search=${s.sale_id}`} className="hover:underline">
                        #SALE-{s.sale_id}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-700">{s.branch_name}</td>
                    <td className="py-3 text-slate-700">{s.cashier_name}</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-700">
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
