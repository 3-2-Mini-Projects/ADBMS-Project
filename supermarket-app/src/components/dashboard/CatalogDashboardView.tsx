"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  Package,
  Layers,
  Truck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Coins,
  RefreshCw,
  BarChart3,
  Boxes,
  Plus,
  ArrowRight,
  Percent,
} from "lucide-react";

interface CatalogStatsData {
  metrics: {
    total_products: number;
    active_products: number;
    inactive_products: number;
    total_categories: number;
    total_suppliers: number;
    total_inventory_valuation: number;
    potential_retail_revenue: number;
    average_profit_margin_pct: number;
    pending_price_approvals: number;
    slow_movers_count: number;
    tied_up_capital: number;
    total_stock_units: number;
  };
  categoryBreakdown: Array<{
    category_id: number;
    category_name: string;
    product_count: number;
    total_stock: number;
    total_valuation: number;
    avg_margin: number;
  }>;
  recentPriceChanges: Array<{
    history_id: number;
    product_id: number;
    product_name: string;
    barcode: string;
    old_price: number;
    new_price: number;
    price_diff: number;
    reason: string;
    changed_at: string;
    requester_name: string;
    supervisor_approval_status: string;
    supervisor_comment: string | null;
  }>;
  marginDistribution: {
    highMargin: number;
    healthyMargin: number;
    lowMargin: number;
    negativeMargin: number;
  };
}

export function CatalogDashboardView() {
  const { currentBranch, showToast } = useApp();
  const [data, setData] = useState<CatalogStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Approval Modal State
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [supervisorComment, setSupervisorComment] = useState("");
  const [processingDecision, setProcessingDecision] = useState(false);

  const fetchStats = async () => {
    try {
      const url = currentBranch
        ? `/api/catalog/stats?branchId=${currentBranch.branch_id}`
        : `/api/catalog/stats`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error loading catalog stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentBranch]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!selectedApproval) return;
    setProcessingDecision(true);
    try {
      const res = await fetch("/api/catalog/price-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history_id: selectedApproval.history_id,
          decision,
          comment: supervisorComment.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message, "success");
        setApprovalModalOpen(false);
        setSelectedApproval(null);
        setSupervisorComment("");
        fetchStats();
      } else {
        showToast(result.error || "Failed to process decision", "error");
      }
    } catch {
      showToast("Error processing supervisor decision", "error");
    } finally {
      setProcessingDecision(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading Catalog Manager Intelligence...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_products: 0,
    active_products: 0,
    inactive_products: 0,
    total_categories: 0,
    total_suppliers: 0,
    total_inventory_valuation: 0,
    potential_retail_revenue: 0,
    average_profit_margin_pct: 0,
    pending_price_approvals: 0,
    slow_movers_count: 0,
    tied_up_capital: 0,
    total_stock_units: 0,
  };

  const totalMarginCount =
    (data?.marginDistribution.highMargin || 0) +
    (data?.marginDistribution.healthyMargin || 0) +
    (data?.marginDistribution.lowMargin || 0) +
    (data?.marginDistribution.negativeMargin || 0) || 1;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative overflow-hidden shadow-xs border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold tracking-wider text-blue-200 uppercase">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Catalog Command Center
              </span>
              {currentBranch && (
                <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-xs text-slate-200 font-medium">
                  📍 {currentBranch.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
              Product Merchandising &amp; Pricing Intelligence
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Manage product master records, category hierarchy, vendor pricing, supervisor review gates, and identify stagnant slow-moving inventory across all branch locations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/15 disabled:opacity-50 shadow-xs backdrop-blur-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
              Refresh
            </button>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Manage Products
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Ribbon (6 Tiles) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Products */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total SKUs</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 border border-blue-100">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{metrics.total_products}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="text-emerald-700 font-semibold">{metrics.active_products} Active</span>
              <span>&bull;</span>
              <span className="text-slate-400">{metrics.inactive_products} Inactive</span>
            </div>
          </div>
        </div>

        {/* Avg Profit Margin */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Avg Markup</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">{metrics.average_profit_margin_pct}%</div>
            <div className="mt-1 text-[11px] text-slate-500">Gross retail margin</div>
          </div>
        </div>

        {/* Categories & Suppliers */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Hierarchy</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 border border-purple-100">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{metrics.total_categories}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              Categories &bull; <span className="font-semibold text-slate-700">{metrics.total_suppliers} Vendors</span>
            </div>
          </div>
        </div>

        {/* Inventory Cost Valuation */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Cost Value</span>
            <div className="rounded-xl bg-cyan-50 p-2 text-cyan-600 border border-cyan-100">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 truncate">
              Rs. {Number(metrics.total_inventory_valuation || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {Number(metrics.total_stock_units || 0).toLocaleString()} physical units
            </div>
          </div>
        </div>

        {/* Pending Approvals (Gate) */}
        <Link
          href="/catalog/price-history"
          className="group rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs transition-all hover:shadow-md hover:bg-amber-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-800">Approvals</span>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-900">{metrics.pending_price_approvals}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-800">
              <span>Price changes pending review</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>

        {/* Slow Movers Alert */}
        <Link
          href="/catalog/slow-movers"
          className="group rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs transition-all hover:shadow-md hover:bg-rose-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-800">Slow Movers</span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-900">{metrics.slow_movers_count}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-800">
              <span>Tied capital: Rs. {Number(metrics.tied_up_capital || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </Link>
      </div>

      {/* Row 2: Category Breakdown & Margin Elasticity Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category Performance Matrix (2 Cols) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Category Catalog Breakdown</h2>
              <p className="text-xs text-slate-500">Live inventory valuation and margin density by taxonomy</p>
            </div>
            <Link
              href="/categories"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Manage Categories &rarr;
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 pl-2 font-semibold">Category</th>
                  <th className="py-3 text-right font-semibold">SKU Count</th>
                  <th className="py-3 text-right font-semibold">Units In Stock</th>
                  <th className="py-3 text-right font-semibold">Cost Valuation</th>
                  <th className="py-3 text-right pr-2 font-semibold">Avg Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
                  data.categoryBreakdown.map((cat) => (
                    <tr key={cat.category_id} className="transition-colors hover:bg-slate-50/70">
                      <td className="py-3 pl-2 font-medium text-slate-900">{cat.category_name}</td>
                      <td className="py-3 text-right font-mono text-slate-600">{cat.product_count}</td>
                      <td className="py-3 text-right font-mono text-slate-600">
                        {Number(cat.total_stock).toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-900 font-semibold">
                        Rs. {Number(cat.total_valuation).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <span
                          className={`font-mono font-semibold ${
                            Number(cat.avg_margin) > 25
                              ? "text-emerald-700"
                              : Number(cat.avg_margin) > 10
                              ? "text-blue-700"
                              : "text-amber-700"
                          }`}
                        >
                          {Number(cat.avg_margin).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No category metrics available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Margin Distribution Profile (1 Col) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Profit Margin Health</h2>
                <p className="text-xs text-slate-500">Retail price markup distribution</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-emerald-700 font-semibold">High Margin (&gt;30%)</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {data?.marginDistribution.highMargin || 0} SKUs
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${(((data?.marginDistribution.highMargin || 0) / totalMarginCount) * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-blue-700 font-semibold">Healthy Margin (15% - 30%)</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {data?.marginDistribution.healthyMargin || 0} SKUs
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${(((data?.marginDistribution.healthyMargin || 0) / totalMarginCount) * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-amber-700 font-semibold">Low Margin (0% - 15%)</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {data?.marginDistribution.lowMargin || 0} SKUs
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{
                      width: `${(((data?.marginDistribution.lowMargin || 0) / totalMarginCount) * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-rose-700 font-semibold">Loss Leader / Negative Margin</span>
                  <span className="text-slate-900 font-mono font-bold">
                    {data?.marginDistribution.negativeMargin || 0} SKUs
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{
                      width: `${(((data?.marginDistribution.negativeMargin || 0) / totalMarginCount) * 100).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Governance Policy:</span> Price updates resulting in a drop &gt;15% or selling below cost require Supervisor Approval.
          </div>
        </div>
      </div>

      {/* Row 3: Pricing Audit & Approval Queue (Latest 10 Changes) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Pricing Governance &amp; Audit Trail</h2>
              {metrics.pending_price_approvals > 0 && (
                <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 animate-pulse">
                  {metrics.pending_price_approvals} Requires Attention
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Live log of product price revisions and supervisor approval decisions</p>
          </div>

          <Link
            href="/catalog/price-history"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Complete Price Audit Log &rarr;
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 pl-2 font-semibold">Product &amp; SKU</th>
                <th className="py-3 text-right font-semibold">Old Price</th>
                <th className="py-3 text-right font-semibold">New Price</th>
                <th className="py-3 text-right font-semibold">Diff %</th>
                <th className="py-3 pl-4 font-semibold">Requested By</th>
                <th className="py-3 font-semibold">Reason</th>
                <th className="py-3 text-center font-semibold">Status</th>
                <th className="py-3 pr-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentPriceChanges && data.recentPriceChanges.length > 0 ? (
                data.recentPriceChanges.map((change) => {
                  const pct =
                    change.old_price > 0
                      ? (((change.new_price - change.old_price) / change.old_price) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr key={change.history_id} className="transition-colors hover:bg-slate-50/70">
                      <td className="py-3 pl-2">
                        <div className="font-semibold text-slate-900">{change.product_name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{change.barcode}</div>
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500">
                        Rs. {Number(change.old_price).toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        Rs. {Number(change.new_price).toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`font-mono font-semibold ${
                            Number(pct) < 0
                              ? "text-rose-600"
                              : Number(pct) > 0
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {Number(pct) > 0 ? `+${pct}%` : `${pct}%`}
                        </span>
                      </td>
                      <td className="py-3 pl-4">
                        <div className="font-medium text-slate-800">{change.requester_name || "Catalog Manager"}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(change.changed_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 max-w-xs text-slate-600 truncate">{change.reason}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            change.supervisor_approval_status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : change.supervisor_approval_status === "REJECTED"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                          }`}
                        >
                          {change.supervisor_approval_status === "PENDING_SUPERVISOR_APPROVAL"
                            ? "Pending Review"
                            : change.supervisor_approval_status || "Approved"}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        {change.supervisor_approval_status === "PENDING_SUPERVISOR_APPROVAL" ? (
                          <button
                            onClick={() => {
                              setSelectedApproval(change);
                              setApprovalModalOpen(true);
                            }}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No price revision records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supervisor Review Modal Dialog */}
      {approvalModalOpen && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600 border border-amber-200">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supervisor Price Approval Review</h3>
                <p className="text-xs text-slate-500">Enforce margin compliance before store deployment</p>
              </div>
            </div>

            <div className="my-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-semibold text-slate-900">{selectedApproval.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Barcode:</span>
                <span className="font-mono text-slate-700">{selectedApproval.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Selling Price:</span>
                <span className="font-mono font-medium text-slate-800">
                  Rs. {Number(selectedApproval.old_price).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proposed New Price:</span>
                <span className="font-mono font-bold text-amber-700">
                  Rs. {Number(selectedApproval.new_price).toFixed(2)}
                </span>
              </div>
              <div className="pt-1 text-slate-500 italic">
                Reason given: &ldquo;{selectedApproval.reason}&rdquo;
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Supervisor Approval Comment / Justification
              </label>
              <textarea
                value={supervisorComment}
                onChange={(e) => setSupervisorComment(e.target.value)}
                placeholder="E.g., Approved for weekend clearance promotion..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingDecision}
                onClick={() => handleDecision("REJECTED")}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                Reject Revision
              </button>
              <button
                type="button"
                disabled={processingDecision}
                onClick={() => handleDecision("APPROVED")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
              >
                Approve &amp; Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
