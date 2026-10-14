"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import Link from "next/link";
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  XCircle,
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
  PackagePlus,
  BarChart3,
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
      ? "space-y-8 animate-in fade-in duration-500 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-8 animate-in fade-in duration-500",
    kpiCard: isClerk
      ? "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
      : "glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all group",
    kpiLabel: isClerk
      ? "text-xs font-bold text-slate-500 uppercase tracking-wider"
      : "text-xs font-semibold text-slate-400 uppercase tracking-wider",
    kpiValue: isClerk
      ? "text-2xl font-black text-slate-900 tracking-tight"
      : "text-2xl font-black text-white tracking-tight",
    card: isClerk
      ? "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
      : "glass-card rounded-2xl p-6 border border-slate-800/80",
    cardTitle: isClerk
      ? "text-base font-bold text-slate-900 flex items-center gap-2"
      : "text-base font-bold text-white flex items-center gap-2",
    trackBg: isClerk ? "bg-slate-100" : "bg-slate-800",
    itemText: isClerk ? "text-slate-900 font-semibold" : "text-white font-semibold",
    itemSubtext: isClerk ? "text-slate-500" : "text-slate-400",
    tableThead: isClerk
      ? "border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider"
      : "border-b border-slate-800/80 text-slate-400 text-[11px] uppercase tracking-wider",
    tableDivide: isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/40",
    tableRowHover: isClerk ? "hover:bg-slate-50 transition-colors" : "hover:bg-slate-800/30 transition-colors",
    recentItemBg: isClerk
      ? "flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition-colors"
      : "flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/40 transition-colors",
    actionLink: (color: string) => {
      if (isClerk) {
        const lightMap: Record<string, string> = {
          indigo: "border-indigo-200 hover:border-indigo-400 text-indigo-700 bg-white hover:bg-indigo-50/50 shadow-sm",
          amber: "border-amber-200 hover:border-amber-400 text-amber-700 bg-white hover:bg-amber-50/50 shadow-sm",
          emerald: "border-emerald-200 hover:border-emerald-400 text-emerald-700 bg-white hover:bg-emerald-50/50 shadow-sm",
          blue: "border-blue-200 hover:border-blue-400 text-blue-700 bg-white hover:bg-blue-50/50 shadow-sm",
        };
        return lightMap[color] || lightMap.indigo;
      } else {
        const darkMap: Record<string, string> = {
          indigo: "border-indigo-800/40 hover:border-indigo-500/50 text-indigo-400 bg-indigo-950/30 hover:bg-indigo-900/40",
          amber: "border-amber-800/40 hover:border-amber-500/50 text-amber-400 bg-amber-950/30 hover:bg-amber-900/40",
          emerald: "border-emerald-800/40 hover:border-emerald-500/50 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/40",
          blue: "border-blue-800/40 hover:border-blue-500/50 text-blue-400 bg-blue-950/30 hover:bg-blue-900/40",
        };
        return darkMap[color] || darkMap.indigo;
      }
    },
    actionText: isClerk ? "text-slate-800" : "text-slate-200",
  };

  return (
    <div className={theme.wrapper}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-6 md:p-8 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200 mb-1">
              <Boxes className="w-4 h-4" />
              <span>Inventory Intelligence Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Inventory Dashboard
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              Branch:{" "}
              <strong className="text-white font-bold">{currentBranch?.name ?? "All Branches"}</strong>
              {" "}— Real-time stock health, expiry tracking &amp; reorder intelligence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-sm"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-white" : ""}`} />
            </button>
            <Link
              href="/inventory"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 font-bold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : Number(summary.total_sku_count || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-indigo-600 font-semibold mt-1">
              {Number(summary.total_units || 0).toLocaleString()} total units on hand
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between">
            <span className={theme.kpiLabel}>Stock Value</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : `Rs. ${Number(summary.total_stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              Total cost-basis inventory value
            </div>
          </div>
        </div>

        {/* Low / Out Stock */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between">
            <span className={theme.kpiLabel}>Stock Alerts</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : Number(summary.low_stock_count || 0) + Number(summary.out_of_stock_count || 0)}
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-1 font-semibold">
              <span className="text-rose-500">{summary.out_of_stock_count || 0} out of stock</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-500">{summary.low_stock_count || 0} low</span>
            </div>
          </div>
        </div>

        {/* Expiry Risk */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between">
            <span className={theme.kpiLabel}>Expiry Risk</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={theme.kpiValue}>
              {loading ? "—" : expiry.expiring_30d || 0}
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-1 font-semibold">
              <span className="text-rose-500">{expiry.expired_batches || 0} expired</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-500">{expiry.expiring_7d || 0} in 7 days</span>
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
            <span>Stock Health Overview</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-36 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-500 mr-2" />
              Loading...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stacked bar */}
              <div className={`w-full h-5 rounded-full overflow-hidden flex ${theme.trackBg}`}>
                {healthyPct > 0 && (
                  <div
                    style={{ width: `${healthyPct}%` }}
                    className="bg-emerald-500 h-full transition-all duration-700"
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
                    className="bg-rose-500 h-full transition-all duration-700"
                    title={`Out of Stock: ${outPct}%`}
                  />
                )}
                {totalSku === 0 && (
                  <div className="w-full bg-slate-300 dark:bg-slate-700 h-full rounded-full" />
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className={`text-xs ${theme.itemText}`}>Healthy Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-500">{summary.healthy_stock_count || 0} SKUs</span>
                    <span className={`text-[10px] ${theme.itemSubtext} ml-2`}>({healthyPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className={`text-xs ${theme.itemText}`}>Low Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-500">{summary.low_stock_count || 0} SKUs</span>
                    <span className={`text-[10px] ${theme.itemSubtext} ml-2`}>({lowPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className={`text-xs ${theme.itemText}`}>Out of Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-500">{summary.out_of_stock_count || 0} SKUs</span>
                    <span className={`text-[10px] ${theme.itemSubtext} ml-2`}>({outPct}%)</span>
                  </div>
                </div>
              </div>

              <div className={`pt-3 border-t ${isClerk ? "border-slate-100" : "border-slate-800/60"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${theme.itemSubtext}`}>Batches tracked</span>
                  <span className={`text-xs font-bold ${theme.itemText} font-mono`}>{expiry.total_batches || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className={`lg:col-span-2 ${theme.card}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={theme.cardTitle}>
              <Layers className="w-4 h-4 text-purple-500" />
              <span>Category Stock Value</span>
            </h2>
            <Link href="/categories" className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
              <span>Categories</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-36 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-500 mr-2" />Loading...
            </div>
          ) : categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-slate-500 text-xs">No category data found.</div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat: any) => {
                const barWidth = Math.max(4, Math.round((Number(cat.stock_value || 0) / maxCategoryValue) * 100));
                return (
                  <div key={cat.category_name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`${theme.itemText} truncate max-w-[140px]`}>{cat.category_name}</span>
                        <span className={`${theme.itemSubtext} text-[10px]`}>{cat.sku_count} SKUs</span>
                        {Number(cat.low_stock_skus) > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            isClerk
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                          }`}>
                            {cat.low_stock_skus} low
                          </span>
                        )}
                      </div>
                      <span className={`font-mono ${isClerk ? "text-slate-700" : "text-slate-300"} font-semibold text-[11px] shrink-0`}>
                        Rs. {Number(cat.stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${theme.trackBg}`}>
                      <div
                        style={{ width: `${barWidth}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-700"
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
            <Link href="/inventory?lowStock=true" className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={theme.tableThead}>
                  <th className="pb-3 text-left font-semibold">Product</th>
                  <th className="pb-3 text-center font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold">Qty / Reorder</th>
                </tr>
              </thead>
              <tbody className={theme.tableDivide}>
                {loading ? (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-500">
                    <Sparkles className="w-4 h-4 animate-spin mx-auto text-amber-500 mb-2" />Loading...
                  </td></tr>
                ) : lowStockItems.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-emerald-500">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-2 text-emerald-500" />All items above reorder levels!
                  </td></tr>
                ) : (
                  lowStockItems.map((item: any) => (
                    <tr key={item.inventory_id} className={theme.tableRowHover}>
                      <td className="py-3">
                        <div className={`font-semibold ${theme.itemText} truncate max-w-[140px]`}>{item.product_name}</div>
                        <div className={`text-[10px] ${theme.itemSubtext} font-mono`}>{item.barcode} · {item.branch_name}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          item.status === "OUT_OF_STOCK"
                            ? isClerk ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                            : isClerk ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse" : "bg-amber-950/60 text-amber-400 border border-amber-800/40 animate-pulse"
                        }`}>
                          {item.status === "OUT_OF_STOCK" ? "OUT" : "LOW"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-mono font-black text-sm ${item.quantity_on_hand <= 0 ? "text-rose-500" : "text-amber-500"}`}>
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
              <span>Expiring Batches (30d)</span>
            </h2>
            <Link href="/inventory" className="text-xs font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1">
              <span>View Batches</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={theme.tableThead}>
                  <th className="pb-3 text-left font-semibold">Product · Batch</th>
                  <th className="pb-3 text-right font-semibold">Qty</th>
                  <th className="pb-3 text-right font-semibold">Expires In</th>
                </tr>
              </thead>
              <tbody className={theme.tableDivide}>
                {loading ? (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-500">
                    <Sparkles className="w-4 h-4 animate-spin mx-auto text-rose-500 mb-2" />Loading...
                  </td></tr>
                ) : expiringBatches.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-emerald-500">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-2 text-emerald-500" />No batches expiring soon!
                  </td></tr>
                ) : (
                  expiringBatches.map((b: any) => {
                    const daysLeft = Number(b.days_to_expiry);
                    const isExpired = daysLeft < 0;
                    const isUrgent = daysLeft <= 7 && !isExpired;
                    return (
                      <tr key={b.batch_id} className={theme.tableRowHover}>
                        <td className="py-3">
                          <div className={`font-semibold ${theme.itemText} truncate max-w-[150px]`}>{b.product_name}</div>
                          <div className={`text-[10px] ${theme.itemSubtext} font-mono`}>{b.batch_no} · {b.branch_name}</div>
                        </td>
                        <td className={`py-3 text-right font-mono font-bold ${theme.itemText}`}>{b.quantity}</td>
                        <td className="py-3 text-right">
                          <span className={`text-xs font-bold font-mono ${
                            isExpired ? "text-rose-500 font-black" : isUrgent ? "text-amber-500 animate-pulse font-black" : "text-amber-500"
                          }`}>
                            {isExpired ? "EXPIRED" : `${daysLeft}d`}
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
            <Link href="/branches" className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1">
              <span>Branches</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500 mr-2" />Loading...
            </div>
          ) : branchComparison.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-xs">No branch data.</div>
          ) : (
            <div className="space-y-3">
              {branchComparison.map((br: any) => {
                const barPct = Math.max(4, Math.round((Number(br.stock_value || 0) / maxBranchValue) * 100));
                return (
                  <div key={br.branch_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={theme.itemText}>{br.branch_name}</span>
                        {Number(br.alerts) > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            isClerk
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                          }`}>
                            {br.alerts} alerts
                          </span>
                        )}
                      </div>
                      <div className={`text-right text-[11px] ${theme.itemSubtext} font-mono font-medium`}>
                        {Number(br.total_units || 0).toLocaleString()} units
                      </div>
                    </div>
                    <div className={`w-full h-2.5 rounded-full ${theme.trackBg}`}>
                      <div
                        style={{ width: `${barPct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700"
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
            <Link href="/inventory" className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
              <span>Full Inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-500 text-xs">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-500 mr-2" />Loading...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-500 text-xs">No recent activity.</div>
            ) : (
              recentActivity.map((item: any) => (
                <div key={item.inventory_id} className={theme.recentItemBg}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isClerk
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-slate-800 border border-slate-700"
                    }`}>
                      <Boxes className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${theme.itemText} truncate max-w-[160px]`}>{item.product_name}</div>
                      <div className={`text-[10px] ${theme.itemSubtext} font-mono`}>{item.branch_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-500 font-mono">{item.quantity_on_hand}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(item.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/inventory", icon: Boxes, label: "Stock Levels", color: "indigo" },
          { href: "/inventory/stock-alerts", icon: AlertTriangle, label: "Stock Alerts", color: "amber" },
          { href: "/inventory/reorder-suggestions", icon: PackagePlus, label: "Reorder Suggestions", color: "emerald" },
          { href: "/purchases", icon: ShieldAlert, label: "Purchase Orders", color: "blue" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all group ${theme.actionLink(action.color)}`}
            >
              <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className={`text-xs font-bold text-center ${theme.actionText}`}>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
