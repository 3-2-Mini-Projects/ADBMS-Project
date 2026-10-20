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
  CheckCircle2,
  XCircle,
  Percent,
  Coins,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Boxes,
  Plus,
  ArrowRight,
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
    supervisor_approval_status: string;
    changed_by_name: string;
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
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [slowMovers, setSlowMovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Action Modal states
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [supervisorComment, setSupervisorComment] = useState("");
  const [processingDecision, setProcessingDecision] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const branchParam = currentBranch ? `?branchId=${currentBranch.branch_id}` : "";
      
      const [statsRes, approvalsRes, slowMoversRes] = await Promise.all([
        fetch(`/api/catalog/stats${branchParam}`),
        fetch(`/api/catalog/price-approvals?status=PENDING_SUPERVISOR_APPROVAL`),
        fetch(`/api/catalog/slow-movers${branchParam ? branchParam + "&minDays=30" : "?minDays=30"}`)
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setData(stats);
      }
      if (approvalsRes.ok) {
        const approvals = await approvalsRes.json();
        if (Array.isArray(approvals)) setPendingApprovals(approvals);
      }
      if (slowMoversRes.ok) {
        const sm = await slowMoversRes.json();
        if (Array.isArray(sm)) setSlowMovers(sm.slice(0, 5));
      }
    } catch (err) {
      console.error("Error loading catalog dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
  }, [currentBranch]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleSupervisorDecision = async (decision: "APPROVED" | "REJECTED") => {
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
        fetchDashboardData();
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading Catalog Manager Intelligence...</p>
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
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                <Sparkles className="h-3.5 w-3.5" /> Catalog Manager Command Center
              </span>
              {currentBranch && (
                <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-300">
                  📍 {currentBranch.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Product Merchandising & Pricing Intelligence
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Manage product master records, category hierarchy, vendor pricing, supervisor review gates, and identify stagnant slow-moving inventory across all branch locations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-700/80 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
              Refresh
            </button>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95"
            >
              <Package className="h-4 w-4" /> Manage Products
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Key Executive Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Total Products */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Products</span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{metrics.total_products}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">{metrics.active_products} active</span>
              <span>•</span>
              <span className="text-slate-500">{metrics.inactive_products} inactive</span>
            </div>
          </div>
        </div>

        {/* Card 2: Inventory Valuation */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Catalog Cost Value</span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">
              Rs. {Number(metrics.total_inventory_valuation).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {Number(metrics.total_stock_units).toLocaleString()} total stock units
            </div>
          </div>
        </div>

        {/* Card 3: Potential Retail Value */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Retail Potential</span>
            <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-cyan-400">
              Rs. {Number(metrics.potential_retail_revenue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              At current unit prices
            </div>
          </div>
        </div>

        {/* Card 4: Average Profit Margin */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Average Margin</span>
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-400">
              {metrics.average_profit_margin_pct}%
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`inline-block h-2 w-2 rounded-full ${metrics.average_profit_margin_pct >= 20 ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span>{metrics.average_profit_margin_pct >= 20 ? "Healthy Markup" : "Competitive"}</span>
            </div>
          </div>
        </div>

        {/* Card 5: Pending Supervisor Approvals */}
        <div className={`rounded-2xl border p-5 shadow-lg backdrop-blur-sm transition-all ${
          metrics.pending_price_approvals > 0
            ? "border-amber-500/40 bg-amber-950/20 shadow-amber-500/10"
            : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Price Reviews</span>
            <div className={`rounded-xl p-2 ${metrics.pending_price_approvals > 0 ? "bg-amber-500/20 text-amber-400 animate-pulse" : "bg-slate-800 text-slate-400"}`}>
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${metrics.pending_price_approvals > 0 ? "text-amber-400" : "text-white"}`}>
              {metrics.pending_price_approvals}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {metrics.pending_price_approvals > 0 ? "Awaiting Supervisor" : "All Approved"}
            </div>
          </div>
        </div>

        {/* Card 6: Slow Movers */}
        <div className={`rounded-2xl border p-5 shadow-lg backdrop-blur-sm transition-all ${
          metrics.slow_movers_count > 0
            ? "border-rose-500/30 bg-rose-950/20 shadow-rose-500/10"
            : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Slow Movers</span>
            <div className={`rounded-xl p-2 ${metrics.slow_movers_count > 0 ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-400"}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${metrics.slow_movers_count > 0 ? "text-rose-400" : "text-white"}`}>
              {metrics.slow_movers_count}
            </div>
            <div className="mt-1 text-xs text-rose-300/80">
              Rs. {Number(metrics.tied_up_capital).toLocaleString(undefined, { maximumFractionDigits: 0 })} tied capital
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Category Breakdown + Margin Spectrum */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category Breakdown (2 columns) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Merchandise Category Valuation</h2>
              <p className="text-xs text-slate-400">Stock distribution and gross margin by department</p>
            </div>
            <Link
              href="/categories"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Categories Directory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 text-right font-medium">Products</th>
                  <th className="pb-3 text-right font-medium">Stock Units</th>
                  <th className="pb-3 text-right font-medium">Cost Valuation</th>
                  <th className="pb-3 text-right font-medium">Avg Margin</th>
                  <th className="pb-3 text-center font-medium">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
                  data.categoryBreakdown.map((cat) => (
                    <tr key={cat.category_id} className="transition-colors hover:bg-slate-800/40">
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {cat.category_name}
                      </td>
                      <td className="py-3 text-right text-slate-300">{cat.product_count}</td>
                      <td className="py-3 text-right text-slate-300">{Number(cat.total_stock).toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-emerald-400 font-semibold">
                        Rs. {Number(cat.total_valuation).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-200">
                        {cat.avg_margin}%
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          cat.avg_margin >= 25
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : cat.avg_margin >= 15
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}>
                          {cat.avg_margin >= 25 ? "High Margin" : cat.avg_margin >= 15 ? "Normal" : "Slim"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No category data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Margin Spectrum Analysis (1 column) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white">Profit Margin Spectrum</h2>
              <p className="text-xs text-slate-400">Distribution of product markup health</p>
            </div>

            <div className="space-y-4">
              {/* High Margin */}
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-emerald-400">High Margin (&gt; 30%)</span>
                  <span className="text-slate-300 font-semibold">{data?.marginDistribution.highMargin || 0} items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${((data?.marginDistribution.highMargin || 0) / totalMarginCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Healthy Margin */}
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-blue-400">Healthy Margin (15% - 30%)</span>
                  <span className="text-slate-300 font-semibold">{data?.marginDistribution.healthyMargin || 0} items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${((data?.marginDistribution.healthyMargin || 0) / totalMarginCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Low Margin */}
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-amber-400">Low Margin (0% - 15%)</span>
                  <span className="text-slate-300 font-semibold">{data?.marginDistribution.lowMargin || 0} items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{
                      width: `${((data?.marginDistribution.lowMargin || 0) / totalMarginCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Negative Margin */}
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-rose-400">Selling Below Cost (&lt; 0%)</span>
                  <span className="text-rose-400 font-bold">{data?.marginDistribution.negativeMargin || 0} items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-rose-500"
                    style={{
                      width: `${((data?.marginDistribution.negativeMargin || 0) / totalMarginCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-medium text-indigo-300 mb-1">
              <ShieldAlert className="h-4 w-4" /> Supervisor Price Policy Rule
            </div>
            <p className="text-slate-400 leading-relaxed">
              Any price reduction exceeding <span className="text-white font-semibold">15%</span> or selling below cost price triggers mandatory supervisor review prior to store activation.
            </p>
          </div>
        </div>
      </div>

      {/* Two Interactive Modules: Supervisor Approvals + Slow Movers Hub */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Module A: Supervisor Price Review Queue */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Supervisor Approval Queue</h2>
                <p className="text-xs text-slate-400">Price revisions exceeding threshold</p>
              </div>
            </div>
            <Link
              href="/catalog/price-history"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Full History &rarr;
            </Link>
          </div>

          {pendingApprovals.length > 0 ? (
            <div className="space-y-3">
              {pendingApprovals.map((req) => (
                <div
                  key={req.history_id}
                  className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 transition-all hover:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">{req.product_name}</div>
                      <div className="text-[11px] text-slate-400">
                        Barcode: <span className="font-mono text-slate-300">{req.barcode}</span> • By: {req.requester_name || "Catalog Staff"}
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                      Pending Review
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900/80 p-2.5 text-xs">
                    <div>
                      <span className="text-slate-400">Current: </span>
                      <span className="font-mono font-medium text-slate-300">Rs. {req.old_price}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Proposed: </span>
                      <span className="font-mono font-bold text-amber-400">Rs. {req.new_price}</span>
                    </div>
                    <div>
                      <span className={`font-mono font-semibold ${Number(req.price_variance_pct) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {Number(req.price_variance_pct) > 0 ? `+${req.price_variance_pct}%` : `${req.price_variance_pct}%`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-400 italic">
                    Reason: &ldquo;{req.reason}&rdquo;
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedApproval(req);
                        setApprovalModalOpen(true);
                      }}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                    >
                      Review Decision
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400/80 mb-2" />
              <p className="text-sm font-medium text-slate-300">Approval Queue is Clear</p>
              <p className="text-xs text-slate-500 mt-0.5">No price changes require supervisor approval at this time.</p>
            </div>
          )}
        </div>

        {/* Module B: Slow Movers Action Center */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Slow Movers Action Center</h2>
                <p className="text-xs text-slate-400">Dormant items locking up store capital</p>
              </div>
            </div>
            <Link
              href="/catalog/slow-movers"
              className="text-xs font-medium text-rose-400 hover:text-rose-300"
            >
              All Slow Movers &rarr;
            </Link>
          </div>

          {slowMovers.length > 0 ? (
            <div className="space-y-3">
              {slowMovers.map((item) => (
                <div
                  key={item.slow_mover_id}
                  className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 transition-all hover:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.branch_name} • {item.category_name}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      item.stagnation_level === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}>
                      {item.days_without_sales} Days Dormant
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Stock on Hand: </span>
                      <span className="font-bold text-white">{item.quantity_on_hand} units</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Locked Capital: </span>
                      <span className="font-mono font-bold text-rose-400">
                        Rs. {Number(item.tied_up_capital).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      Recommendation: <strong className="text-amber-300 font-medium">{item.recommended_action}</strong>
                    </span>
                    <Link
                      href="/catalog/slow-movers"
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Take Action
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400/80 mb-2" />
              <p className="text-sm font-medium text-slate-300">Healthy Sales Turnover</p>
              <p className="text-xs text-slate-500 mt-0.5">No critical slow-moving items detected in this branch.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Catalog Price History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Catalog Price Changes</h2>
            <p className="text-xs text-slate-400">Audited price revisions, modifier employee, and justification</p>
          </div>
          <Link
            href="/catalog/price-history"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            View Full Price History &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Barcode</th>
                <th className="pb-3 text-right font-medium">Previous Price</th>
                <th className="pb-3 text-right font-medium">New Price</th>
                <th className="pb-3 text-right font-medium">Difference</th>
                <th className="pb-3 font-medium pl-4">Modifier</th>
                <th className="pb-3 font-medium">Reason</th>
                <th className="pb-3 text-center font-medium">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.recentPriceChanges && data.recentPriceChanges.length > 0 ? (
                data.recentPriceChanges.map((log) => (
                  <tr key={log.history_id} className="transition-colors hover:bg-slate-800/40">
                    <td className="py-3 font-medium text-white">{log.product_name}</td>
                    <td className="py-3 font-mono text-slate-400">{log.barcode}</td>
                    <td className="py-3 text-right font-mono text-slate-400">Rs. {Number(log.old_price).toFixed(2)}</td>
                    <td className="py-3 text-right font-mono font-bold text-white">Rs. {Number(log.new_price).toFixed(2)}</td>
                    <td className={`py-3 text-right font-mono font-semibold ${
                      Number(log.price_diff) > 0 ? "text-emerald-400" : Number(log.price_diff) < 0 ? "text-rose-400" : "text-slate-400"
                    }`}>
                      {Number(log.price_diff) > 0 ? `+Rs. ${log.price_diff}` : `Rs. ${log.price_diff}`}
                    </td>
                    <td className="py-3 pl-4 text-slate-300">{log.changed_by_name || "Catalog Manager"}</td>
                    <td className="py-3 text-slate-400 max-w-xs truncate">{log.reason}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        log.supervisor_approval_status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : log.supervisor_approval_status === "REJECTED"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {log.supervisor_approval_status || "APPROVED"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    No recent price adjustments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supervisor Review Modal */}
      {approvalModalOpen && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Supervisor Price Change Review</h3>
            <p className="mt-1 text-xs text-slate-400">
              Review requested price update for <span className="text-white font-medium">{selectedApproval.product_name}</span>
            </p>

            <div className="my-4 space-y-2 rounded-xl bg-slate-800/60 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Unit Price:</span>
                <span className="font-mono font-medium text-slate-200">Rs. {selectedApproval.old_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cost Price:</span>
                <span className="font-mono text-slate-300">Rs. {selectedApproval.cost_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Proposed New Price:</span>
                <span className="font-mono font-bold text-amber-400">Rs. {selectedApproval.new_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Variance:</span>
                <span className={`font-mono font-bold ${Number(selectedApproval.price_variance_pct) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {selectedApproval.price_variance_pct}%
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-2">
                <span className="text-slate-400">Proposed Margin:</span>
                <span className={`font-mono font-semibold ${selectedApproval.is_below_cost ? "text-rose-400" : "text-emerald-400"}`}>
                  {selectedApproval.is_below_cost ? "⚠️ Selling Below Cost!" : `Rs. ${selectedApproval.proposed_margin}`}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">Supervisor Decision Comment</label>
              <textarea
                value={supervisorComment}
                onChange={(e) => setSupervisorComment(e.target.value)}
                placeholder="Optional supervisor notes or justification..."
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingDecision}
                onClick={() => handleSupervisorDecision("REJECTED")}
                className="rounded-xl border border-rose-600 bg-rose-600/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-600/30 transition-colors"
              >
                Reject Revision
              </button>
              <button
                type="button"
                disabled={processingDecision}
                onClick={() => handleSupervisorDecision("APPROVED")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Approve &amp; Apply Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
