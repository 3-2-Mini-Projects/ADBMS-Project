"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import Link from "next/link";
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  Package,
  Layers,
  Store,
  Clock,
  TrendingDown,
  Sparkles,
  ShieldAlert,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";

export function InventoryDashboardView() {
  const { currentBranch, currentEmployee } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = currentBranch
        ? `/api/inventory/dashboard?branchId=${currentBranch.branch_id}`
        : "/api/inventory/dashboard";
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load inventory dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentBranch]);

  const summary = data?.summary ?? {};
  const expiry = data?.expiry ?? {};
  const categoryBreakdown = data?.categoryBreakdown ?? [];
  const lowStockItems = data?.lowStockItems ?? [];
  const expiringBatches = data?.expiringBatches ?? [];
  const branchComparison = data?.branchStockComparison ?? [];
  const recentActivity = data?.recentActivity ?? [];

  const totalSku = Number(summary.total_sku_count || 0);
  const healthyPct = totalSku > 0 ? Math.round((Number(summary.healthy_stock_count || 0) / totalSku) * 100) : 0;
  const lowPct = totalSku > 0 ? Math.round((Number(summary.low_stock_count || 0) / totalSku) * 100) : 0;
  const outPct = totalSku > 0 ? Math.round((Number(summary.out_of_stock_count || 0) / totalSku) * 100) : 0;

  const maxBranchValue = Math.max(...branchComparison.map((b: any) => Number(b.stock_value || 0)), 1);
  const maxCategoryValue = Math.max(...categoryBreakdown.map((c: any) => Number(c.stock_value || 0)), 1);

  const theme = {
    wrapper: isClerk
      ? "space-y-7 animate-in fade-in duration-300 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto pb-14 text-slate-100",
    kpiCard: isClerk
      ? "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
      : "bg-slate-900/60 rounded-2xl p-5 border border-slate-800 hover:border-slate-700/80 transition-all group backdrop-blur-md shadow-sm",
    kpiLabel: isClerk
      ? "text-xs font-semibold text-slate-500 uppercase tracking-wider"
      : "text-xs font-semibold text-slate-400 uppercase tracking-wider",
    kpiValue: isClerk
      ? "text-2xl font-black text-slate-900 tracking-tight font-mono"
      : "text-2xl font-black text-white tracking-tight font-mono",
    card: isClerk
      ? "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
      : "bg-slate-900/60 rounded-2xl p-6 border border-slate-800 backdrop-blur-md shadow-sm",
    cardTitle: isClerk
      ? "text-base font-bold text-slate-900 flex items-center gap-2"
      : "text-base font-bold text-white flex items-center gap-2",
    trackBg: isClerk ? "bg-slate-100" : "bg-slate-800/80",
    itemText: isClerk ? "text-slate-900 font-semibold truncate max-w-[170px]" : "text-white font-semibold truncate max-w-[170px]",
    itemSubtext: isClerk ? "text-slate-500" : "text-slate-400",
    tableThead: isClerk
      ? "border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-semibold"
      : "border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-semibold",
    tableDivide: isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/50",
    tableRowHover: isClerk ? "hover:bg-slate-50 transition-colors" : "hover:bg-slate-800/30 transition-colors",
    recentItemBg: isClerk
      ? "flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition-colors"
      : "flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:bg-slate-850 transition-colors",
    statusBadgeLow: isClerk
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse",
    statusBadgeOut: isClerk
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-rose-50 text-rose-700 border border-rose-200"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30",
    actionCard: isClerk
      ? "flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-sm"
      : "flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700/80 transition-all group backdrop-blur-md shadow-sm",
    actionLabel: isClerk
      ? "text-xs font-bold text-center text-slate-800 group-hover:text-slate-900 transition-colors"
      : "text-xs font-bold text-center text-slate-200 group-hover:text-white transition-colors",
    actionBadge: isClerk
      ? "text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
      : "text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60",
  };

  return (
    <div className={theme.wrapper}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/20 border border-indigo-500/20">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200 mb-1.5">
              <Boxes className="w-4 h-4 text-blue-200" />
              <span>Inventory Intelligence & Control Hub</span>
              {isClerk && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono">
                  Stock Clerk Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Inventory Dashboard
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm mt-1 max-w-xl">
              Active Branch:{" "}
              <strong className="text-white font-bold">{currentBranch?.name ?? "All Branches"}</strong>
              {" "}— Real-time stock levels, batch health, expiry risk & dispatch telemetry.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-sm active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-white" : ""}`} />
            </button>
            <Link
              href="/inventory"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 font-bold text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Boxes className="w-4 h-4 text-indigo-700" />
              <span>Manage Stock</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between">
            <span className={theme.kpiLabel}>Total SKUs</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              isClerk ? "bg-indigo-50 border border-indigo-100 text-indigo-600" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
            }`}>
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : Number(summary.total_sku_count || 0).toLocaleString()}
            </div>
            <div className={`text-[11px] font-semibold mt-1 ${isClerk ? "text-indigo-600" : "text-indigo-400"}`}>
              {Number(summary.total_units || 0).toLocaleString()} total units on hand
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between">
            <span className={theme.kpiLabel}>Stock Valuation</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              isClerk ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}>
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : `Rs. ${Number(summary.total_stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            </div>
            <div className={`text-[11px] font-semibold mt-1 ${isClerk ? "text-emerald-600" : "text-emerald-400"}`}>
              Cost-basis inventory valuation
            </div>
          </div>
        </div>

        {/* Low / Out Stock */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between">
            <span className={theme.kpiLabel}>Stock Alerts</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              isClerk ? "bg-amber-50 border border-amber-100 text-amber-600" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : Number(summary.low_stock_count || 0) + Number(summary.out_of_stock_count || 0)}
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-1 font-semibold">
              <span className={isClerk ? "text-rose-600 font-bold" : "text-rose-400"}>{summary.out_of_stock_count || 0} out</span>
              <span className="text-slate-400">•</span>
              <span className={isClerk ? "text-amber-600 font-bold" : "text-amber-400"}>{summary.low_stock_count || 0} low stock</span>
            </div>
          </div>
        </div>

        {/* Expiry Risk */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between">
            <span className={theme.kpiLabel}>Expiry Threat</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              isClerk ? "bg-rose-50 border border-rose-100 text-rose-600" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : expiry.expiring_30d || 0}
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-1 font-semibold">
              <span className={isClerk ? "text-rose-600 font-bold" : "text-rose-400"}>{expiry.expired_batches || 0} expired</span>
              <span className="text-slate-400">•</span>
              <span className={isClerk ? "text-amber-600 font-bold" : "text-amber-400"}>{expiry.expiring_7d || 0} in 7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Health Gauge + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Health Visual */}
        <div className={theme.card}>
          <h2 className={`${theme.cardTitle} mb-6`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Stock Health Distribution</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-44 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-500 mr-2" />
              Loading metrics...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Stacked bar */}
              <div className={`w-full h-4 rounded-full overflow-hidden flex ${theme.trackBg} p-0.5`}>
                {healthyPct > 0 && (
                  <div
                    style={{ width: `${healthyPct}%` }}
                    className="bg-emerald-500 h-full rounded-l-full transition-all duration-700"
                    title={`Healthy: ${healthyPct}%`}
                  />
                )}
                {lowPct > 0 && (
                  <div
                    style={{ width: `${lowPct}%` }}
                    className="bg-amber-500 h-full transition-all duration-700"
                    title={`Low: ${lowPct}%`}
                  />
                )}
                {outPct > 0 && (
                  <div
                    style={{ width: `${outPct}%` }}
                    className="bg-rose-500 h-full rounded-r-full transition-all duration-700"
                    title={`Out of Stock: ${outPct}%`}
                  />
                )}
                {totalSku === 0 && (
                  <div className={`w-full ${theme.trackBg} h-full rounded-full`} />
                )}
              </div>

              <div className="space-y-2.5">
                <div className={`flex items-center justify-between p-2.5 rounded-xl ${isClerk ? "bg-slate-50 border border-slate-200" : "bg-slate-950/40 border border-slate-800/60"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    <span className={`text-xs font-semibold ${isClerk ? "text-slate-800" : "text-slate-200"}`}>Healthy Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{summary.healthy_stock_count || 0} SKUs</span>
                    <span className={`text-[10px] ${theme.itemSubtext} ml-2 font-mono`}>({healthyPct}%)</span>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-xl ${isClerk ? "bg-slate-50 border border-slate-200" : "bg-slate-950/40 border border-slate-800/60"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                    <span className={`text-xs font-semibold ${isClerk ? "text-slate-800" : "text-slate-200"}`}>Low Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">{summary.low_stock_count || 0} SKUs</span>
                    <span className={`text-[10px] ${theme.itemSubtext} ml-2 font-mono`}>({lowPct}%)</span>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-2.5 rounded-xl ${isClerk ? "bg-slate-50 border border-slate-200" : "bg-slate-950/40 border border-slate-800/60"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                    <span className={`text-xs font-semibold ${isClerk ? "text-slate-800" : "text-slate-200"}`}>Out of Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">{summary.out_of_stock_count || 0} SKUs</span>
                    <span className={`text-[10px] ${theme.itemSubtext} ml-2 font-mono`}>({outPct}%)</span>
                  </div>
                </div>
              </div>

              <div className={`pt-3 border-t ${isClerk ? "border-slate-100 text-slate-600" : "border-slate-800/80 text-slate-400"} flex items-center justify-between text-xs`}>
                <span>Batches Tracked in System</span>
                <span className={`font-mono font-bold ${isClerk ? "text-slate-900" : "text-white"}`}>{expiry.total_batches || 0} active batches</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className={`lg:col-span-2 ${theme.card}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={theme.cardTitle}>
              <Layers className="w-4 h-4 text-purple-500" />
              <span>Category Stock Valuation</span>
            </h2>
            <Link href="/categories" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors">
              <span>View All Categories</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-44 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-500 mr-2" />Loading...
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-slate-500 text-xs">No category data found.</div>
          ) : (
            <div className="space-y-3.5">
              {categoryBreakdown.map((cat: any) => {
                const barWidth = Math.max(4, Math.round((Number(cat.stock_value || 0) / maxCategoryValue) * 100));
                return (
                  <div key={cat.category_name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`${theme.itemText} truncate max-w-[170px]`}>{cat.category_name}</span>
                        <span className={`${theme.itemSubtext} text-[10px] font-mono`}>{cat.sku_count} SKUs</span>
                        {Number(cat.low_stock_skus) > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                            isClerk
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}>
                            {cat.low_stock_skus} low
                          </span>
                        )}
                      </div>
                      <span className={`font-mono ${isClerk ? "text-slate-700" : "text-slate-200"} font-semibold text-[11px] shrink-0`}>
                        Rs. {Number(cat.stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${theme.trackBg}`}>
                      <div
                        style={{ width: `${barWidth}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-700 shadow-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock + Expiring Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert Table */}
        <div className={theme.card}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={theme.cardTitle}>
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <span>Low / Out-of-Stock Items</span>
            </h2>
            <Link href="/inventory/stock-alerts" className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
              <span>Alerts Center</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={theme.tableThead}>
                  <th className="pb-3 text-left">Product</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Available / Reorder</th>
                </tr>
              </thead>
              <tbody className={theme.tableDivide}>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      <Sparkles className="w-4 h-4 animate-spin mx-auto text-amber-500 mb-2" />Loading...
                    </td>
                  </tr>
                ) : lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                      All items maintained above reorder threshold!
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((item: any) => (
                    <tr key={item.inventory_id} className={theme.tableRowHover}>
                      <td className="py-3">
                        <div className={theme.itemText}>{item.product_name}</div>
                        <div className={`text-[10px] ${theme.itemSubtext} font-mono`}>{item.barcode} · {item.branch_name}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={item.status === "OUT_OF_STOCK" ? theme.statusBadgeOut : theme.statusBadgeLow}>
                          {item.status === "OUT_OF_STOCK" ? "OUT" : "LOW"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-mono font-black text-sm ${item.quantity_on_hand <= 0 ? "text-rose-500" : "text-amber-600 dark:text-amber-400"}`}>
                          {item.quantity_on_hand}
                        </span>
                        <span className={`${theme.itemSubtext} text-[10px] font-mono`}> / {item.reorder_level}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiring Batches */}
        <div className={theme.card}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={theme.cardTitle}>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Expiring Batches (30 Days)</span>
            </h2>
            <Link href="/inventory/batches" className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
              <span>Batch Tracker</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={theme.tableThead}>
                  <th className="pb-3 text-left">Product · Batch</th>
                  <th className="pb-3 text-right">Batch Qty</th>
                  <th className="pb-3 text-right">Expires In</th>
                </tr>
              </thead>
              <tbody className={theme.tableDivide}>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      <Sparkles className="w-4 h-4 animate-spin mx-auto text-rose-500 mb-2" />Loading...
                    </td>
                  </tr>
                ) : expiringBatches.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                      Zero batches expiring in the next 30 days!
                    </td>
                  </tr>
                ) : (
                  expiringBatches.map((b: any) => {
                    const daysLeft = Number(b.days_to_expiry);
                    const isExpired = daysLeft < 0;
                    const isToday = daysLeft === 0;
                    const isUrgent = (daysLeft <= 7 && !isExpired) || isToday;
                    return (
                      <tr key={b.batch_id} className={theme.tableRowHover}>
                        <td className="py-3">
                          <div className={theme.itemText}>{b.product_name}</div>
                          <div className={`text-[10px] ${theme.itemSubtext} font-mono`}>{b.batch_no} · {b.branch_name}</div>
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${isClerk ? "text-slate-800" : "text-slate-200"}`}>{b.quantity}</td>
                        <td className="py-3 text-right">
                          <span className={`text-xs font-bold font-mono ${
                            isExpired
                              ? "text-rose-600 font-black"
                              : isToday
                              ? "text-amber-600 animate-pulse font-black"
                              : isUrgent
                              ? "text-amber-600 animate-pulse font-black"
                              : "text-amber-600"
                          }`}>
                            {isExpired ? "EXPIRED" : isToday ? "TODAY" : `${daysLeft}d`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Branch Comparison + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Stock Comparison */}
        <div className={theme.card}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={theme.cardTitle}>
              <Store className="w-4 h-4 text-blue-500" />
              <span>Branch Stock Comparison</span>
            </h2>
            <Link href="/branches" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              <span>View Branches</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-36 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500 mr-2" />Loading...
            </div>
          ) : branchComparison.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-slate-500 text-xs">No branch data.</div>
          ) : (
            <div className="space-y-3.5">
              {branchComparison.map((br: any) => {
                const barPct = Math.max(4, Math.round((Number(br.stock_value || 0) / maxBranchValue) * 100));
                return (
                  <div key={br.branch_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={theme.itemText}>{br.branch_name}</span>
                        {Number(br.alerts) > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                            isClerk
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}>
                            {br.alerts} alerts
                          </span>
                        )}
                      </div>
                      <div className={`text-right text-[11px] ${theme.itemSubtext} font-mono font-medium`}>
                        {Number(br.total_units || 0).toLocaleString()} units
                      </div>
                    </div>
                    <div className={`w-full h-2 rounded-full ${theme.trackBg}`}>
                      <div
                        style={{ width: `${barPct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700 shadow-sm"
                      />
                    </div>
                    <div className={`text-[10px] ${theme.itemSubtext} text-right font-mono`}>
                      Rs. {Number(br.stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Stock Activity */}
        <div className={theme.card}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={theme.cardTitle}>
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Recent Stock Updates</span>
            </h2>
            <Link href="/inventory" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
              <span>Full Stock Grid</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="flex items-center justify-center h-36 text-slate-500 text-xs">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-500 mr-2" />Loading updates...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-slate-500 text-xs">No recent updates recorded.</div>
            ) : (
              recentActivity.map((item: any) => (
                <div key={item.inventory_id} className={theme.recentItemBg}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isClerk ? "bg-emerald-50 border border-emerald-200 text-emerald-600" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    }`}>
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${isClerk ? "text-slate-800" : "text-slate-200"} truncate max-w-[170px]`}>{item.product_name}</div>
                      <div className={`text-[10px] ${theme.itemSubtext} font-mono`}>{item.branch_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">{item.quantity_on_hand}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/inventory", icon: Boxes, label: "Stock Inventory Grid", badge: "Live Grid", color: "indigo" },
          { href: "/inventory/stock-alerts", icon: AlertTriangle, label: "Stock Alerts Center", badge: "Real-time", color: "amber" },
          { href: "/inventory/transfers", icon: ArrowLeftRight, label: "Inter-Branch Transfers", badge: "sp_transfer", color: "emerald" },
          { href: "/purchases", icon: ShieldAlert, label: "Purchase Orders", badge: "Purchasing", color: "blue" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={theme.actionCard}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                action.color === "indigo" ? "bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20" :
                action.color === "amber" ? "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                action.color === "emerald" ? "bg-teal-50 text-teal-600 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20" :
                "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={theme.actionLabel}>
                {action.label}
              </span>
              <span className={theme.actionBadge}>
                {action.badge}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
