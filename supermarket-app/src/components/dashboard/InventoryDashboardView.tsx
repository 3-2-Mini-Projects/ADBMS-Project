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
  const { currentBranch } = useApp();
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/70 via-purple-900/40 to-slate-900 border border-indigo-800/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-purple-500 rounded-full blur-2xl translate-y-1/3" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
              <Boxes className="w-4 h-4" />
              <span>Inventory Intelligence Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Inventory Dashboard
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Branch:{" "}
              <strong className="text-white">{currentBranch?.name ?? "All Branches"}</strong>
              {" "}— Real-time stock health, expiry tracking &amp; reorder intelligence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
            <Link
              href="/inventory"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Boxes className="w-4 h-4" />
              <span>Manage Stock</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-indigo-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total SKUs</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {loading ? "—" : Number(summary.total_sku_count || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-indigo-400 mt-1">
              {Number(summary.total_units || 0).toLocaleString()} total units on hand
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Stock Value</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {loading ? "—" : `Rs. ${Number(summary.total_stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              Total cost-basis inventory value
            </div>
          </div>
        </div>

        {/* Low / Out Stock */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Stock Alerts</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {loading ? "—" : Number(summary.low_stock_count || 0) + Number(summary.out_of_stock_count || 0)}
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-1">
              <span className="text-rose-400">{summary.out_of_stock_count || 0} out of stock</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">{summary.low_stock_count || 0} low</span>
            </div>
          </div>
        </div>

        {/* Expiry Risk */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-rose-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Expiry Risk</span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {loading ? "—" : expiry.expiring_30d || 0}
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-1">
              <span className="text-rose-400">{expiry.expired_batches || 0} expired</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">{expiry.expiring_7d || 0} in 7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Health Gauge + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Health Visual */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Stock Health Overview</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-36 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-400 mr-2" />
              Loading...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stacked bar */}
              <div className="w-full h-5 rounded-full overflow-hidden flex">
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
                  <div className="w-full bg-slate-700 h-full rounded-full" />
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-300">Healthy Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">{summary.healthy_stock_count || 0} SKUs</span>
                    <span className="text-[10px] text-slate-500 ml-2">({healthyPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-slate-300">Low Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">{summary.low_stock_count || 0} SKUs</span>
                    <span className="text-[10px] text-slate-500 ml-2">({lowPct}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs text-slate-300">Out of Stock</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-400">{summary.out_of_stock_count || 0} SKUs</span>
                    <span className="text-[10px] text-slate-500 ml-2">({outPct}%)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Batches tracked</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">{expiry.total_batches || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Category Stock Value</span>
            </h2>
            <Link href="/categories" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              <span>Categories</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-36 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-400 mr-2" />Loading...
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
                        <span className="text-slate-200 font-medium truncate max-w-[140px]">{cat.category_name}</span>
                        <span className="text-slate-500 text-[10px]">{cat.sku_count} SKUs</span>
                        {Number(cat.low_stock_skus) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 font-bold">
                            {cat.low_stock_skus} low
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-300 text-[11px] shrink-0">
                        Rs. {Number(cat.stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800">
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
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <span>Low / Out-of-Stock Items</span>
            </h2>
            <Link href="/inventory?lowStock=true" className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 text-left font-medium">Product</th>
                  <th className="pb-3 text-center font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Qty / Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-500">
                    <Sparkles className="w-4 h-4 animate-spin mx-auto text-amber-400 mb-2" />Loading...
                  </td></tr>
                ) : lowStockItems.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-2" />All items above reorder levels!
                  </td></tr>
                ) : (
                  lowStockItems.map((item: any) => (
                    <tr key={item.inventory_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <div className="font-medium text-white truncate max-w-[140px]">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.barcode} · {item.branch_name}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          item.status === "OUT_OF_STOCK"
                            ? "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                            : "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                        }`}>
                          {item.status === "OUT_OF_STOCK" ? "OUT" : "LOW"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-mono font-bold text-sm ${item.quantity_on_hand <= 0 ? "text-rose-400" : "text-amber-400"}`}>
                          {item.quantity_on_hand}
                        </span>
                        <span className="text-slate-500 text-[10px] font-mono"> / {item.reorder_level}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiring Batches */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Expiring Batches (30d)</span>
            </h2>
            <Link href="/inventory" className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1">
              <span>View Batches</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 text-left font-medium">Product · Batch</th>
                  <th className="pb-3 text-right font-medium">Qty</th>
                  <th className="pb-3 text-right font-medium">Expires In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-500">
                    <Sparkles className="w-4 h-4 animate-spin mx-auto text-rose-400 mb-2" />Loading...
                  </td></tr>
                ) : expiringBatches.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-2" />No batches expiring soon!
                  </td></tr>
                ) : (
                  expiringBatches.map((b: any) => {
                    const daysLeft = Number(b.days_to_expiry);
                    const isExpired = daysLeft < 0;
                    const isUrgent = daysLeft <= 7 && !isExpired;
                    return (
                      <tr key={b.batch_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3">
                          <div className="font-medium text-white truncate max-w-[150px]">{b.product_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.batch_no} · {b.branch_name}</div>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-300">{b.quantity}</td>
                        <td className="py-3 text-right">
                          <span className={`text-xs font-bold font-mono ${
                            isExpired ? "text-rose-400" : isUrgent ? "text-amber-400 animate-pulse" : "text-orange-400"
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
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-400" />
              <span>Branch Stock Comparison</span>
            </h2>
            <Link href="/branches" className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
              <span>Branches</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-spin text-blue-400 mr-2" />Loading...
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
                        <span className="font-medium text-slate-200">{br.branch_name}</span>
                        {Number(br.alerts) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 font-bold">
                            {br.alerts} alerts
                          </span>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        {Number(br.total_units || 0).toLocaleString()} units
                      </div>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800">
                      <div
                        style={{ width: `${barPct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-700"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 text-right font-mono">
                      Rs. {Number(br.stock_value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Stock Activity */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Recent Stock Updates</span>
            </h2>
            <Link href="/inventory" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              <span>Full Inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-500 text-xs">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400 mr-2" />Loading...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-500 text-xs">No recent activity.</div>
            ) : (
              recentActivity.map((item: any) => (
                <div key={item.inventory_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Boxes className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white truncate max-w-[160px]">{item.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.branch_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400 font-mono">{item.quantity_on_hand}</div>
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
          const colorMap: Record<string, string> = {
            indigo: "border-indigo-800/40 hover:border-indigo-500/50 text-indigo-400 bg-indigo-950/30 hover:bg-indigo-900/40",
            amber: "border-amber-800/40 hover:border-amber-500/50 text-amber-400 bg-amber-950/30 hover:bg-amber-900/40",
            emerald: "border-emerald-800/40 hover:border-emerald-500/50 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/40",
            blue: "border-blue-800/40 hover:border-blue-500/50 text-blue-400 bg-blue-950/30 hover:bg-blue-900/40",
          };
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all group ${colorMap[action.color]}`}
            >
              <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-center text-slate-200">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
