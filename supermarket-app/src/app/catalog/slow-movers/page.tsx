"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { SlowMover } from "@/lib/types";
import {
  AlertTriangle,
  RefreshCw,
  Coins,
  Clock,
  TrendingDown,
  Sparkles,
  Percent,
  Search,
  Filter,
  CheckCircle2,
  X,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function CatalogSlowMoversPage() {
  const { currentBranch, showToast } = useApp();
  const [slowMovers, setSlowMovers] = useState<SlowMover[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [minDays, setMinDays] = useState("30");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");

  // Markdown Modal
  const [markdownModalOpen, setMarkdownModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SlowMover | null>(null);
  const [discountPct, setDiscountPct] = useState("20");
  const [markdownReason, setMarkdownReason] = useState("Slow-moving inventory clearance");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSlowMovers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
      if (minDays) params.append("minDays", minDays);
      if (selectedCategory) params.append("categoryId", selectedCategory);

      const res = await fetch(`/api/catalog/slow-movers?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSlowMovers(data);
      }
    } catch (err) {
      console.error("Error fetching slow movers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSlowMovers();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCategories(d));
  }, [currentBranch, minDays, selectedCategory]);

  const handleRefreshAnalysis = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/catalog/slow-movers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REFRESH" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Slow movers analysis refreshed from live sales ledger!", "success");
        fetchSlowMovers();
      } else {
        showToast(data.error || "Failed to refresh analysis", "error");
        setRefreshing(false);
      }
    } catch {
      showToast("Error executing refresh analysis", "error");
      setRefreshing(false);
    }
  };

  const handleApplyMarkdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/catalog/slow-movers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARKDOWN",
          slow_mover_id: selectedItem.slow_mover_id,
          product_id: selectedItem.product_id,
          discount_pct: Number(discountPct),
          reason: markdownReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        setMarkdownModalOpen(false);
        setSelectedItem(null);
        fetchSlowMovers();
      } else {
        showToast(data.error || "Failed to apply markdown", "error");
      }
    } catch {
      showToast("Error processing markdown", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscontinue = async (item: SlowMover) => {
    if (!confirm(`Are you sure you want to discontinue and deactivate "${item.product_name}"?`)) {
      return;
    }
    try {
      const res = await fetch("/api/catalog/slow-movers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCONTINUE",
          slow_mover_id: item.slow_mover_id,
          product_id: item.product_id,
          reason: "Dormant stock phase out",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        fetchSlowMovers();
      } else {
        showToast(data.error || "Failed to discontinue", "error");
      }
    } catch {
      showToast("Error discontinuing product", "error");
    }
  };

  const filteredItems = slowMovers.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.product_name?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q) ||
      item.category_name?.toLowerCase().includes(q) ||
      item.supplier_name?.toLowerCase().includes(q)
    );
  });

  // Aggregated Stats
  const totalTiedCapital = slowMovers.reduce(
    (acc, curr) => acc + Number(curr.tied_up_capital || 0),
    0
  );
  const criticalCount = slowMovers.filter((sm) => sm.days_without_sales >= 90).length;
  const avgDaysWithoutSales =
    slowMovers.length > 0
      ? Math.round(
          slowMovers.reduce((acc, curr) => acc + Number(curr.days_without_sales || 0), 0) /
            slowMovers.length
        )
      : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-rose-400 uppercase">
              <AlertTriangle className="h-3.5 w-3.5" /> Working Capital Protection
            </span>
            <span className="text-xs text-slate-400">table: slow_movers</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Slow Movers Intelligence &amp; Clearance Hub
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Identify stagnant stock with zero sales over 30/60/90+ days, liberate tied-up capital, and execute clearance markdowns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAnalysis}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            Run Stagnation Analysis
          </button>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            &larr; Catalog Dashboard
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Dormant Products</span>
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{slowMovers.length}</div>
            <div className="mt-1 text-xs text-slate-400">Items with 0 sales &gt; {minDays} days</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tied-Up Working Capital</span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-400">
              Rs. {Number(totalTiedCapital).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-xs text-slate-400">Locked in holding stock value</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Average Dormancy</span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-400">{avgDaysWithoutSales} Days</div>
            <div className="mt-1 text-xs text-slate-400">Average time since last customer sale</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Critical Stagnation</span>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-400">{criticalCount} SKUs</div>
            <div className="mt-1 text-xs text-slate-400">Dormant &gt; 90 days (Recommend Phase Out)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" /> Threshold:
          </div>
          <button
            onClick={() => setMinDays("30")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              minDays === "30"
                ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            30+ Days
          </button>
          <button
            onClick={() => setMinDays("60")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              minDays === "60"
                ? "bg-amber-600 text-white font-semibold shadow-md shadow-amber-600/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            60+ Days
          </button>
          <button
            onClick={() => setMinDays("90")}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              minDays === "90"
                ? "bg-rose-600 text-white font-semibold shadow-md shadow-rose-600/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            90+ Days (Critical)
          </button>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, barcode..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Slow Movers Data Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 pl-6 font-medium">Product / Barcode</th>
                <th className="py-3.5 font-medium">Branch / Category</th>
                <th className="py-3.5 text-right font-medium">Stock on Hand</th>
                <th className="py-3.5 text-right font-medium">Unit Cost</th>
                <th className="py-3.5 text-right font-medium">Retail Price</th>
                <th className="py-3.5 text-right font-medium">Tied Capital</th>
                <th className="py-3.5 text-center font-medium">Days Inactive</th>
                <th className="py-3.5 font-medium pl-4">Recommendation</th>
                <th className="py-3.5 pr-6 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      Loading slow movers intelligence...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.slow_mover_id} className="transition-colors hover:bg-slate-800/40">
                    <td className="py-3.5 pl-6">
                      <div className="font-semibold text-white">{item.product_name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{item.barcode}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="text-slate-300 font-medium">{item.branch_name}</div>
                      <div className="text-[11px] text-slate-400">{item.category_name}</div>
                    </td>
                    <td className="py-3.5 text-right font-bold text-white">
                      {item.quantity_on_hand} units
                    </td>
                    <td className="py-3.5 text-right font-mono text-slate-400">
                      Rs. {Number(item.cost_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right font-mono font-medium text-slate-200">
                      Rs. {Number(item.selling_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-rose-400">
                      Rs. {Number(item.tied_up_capital).toLocaleString()}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                        item.days_without_sales >= 90
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : item.days_without_sales >= 60
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      }`}>
                        {item.days_without_sales} Days
                      </span>
                    </td>
                    <td className="py-3.5 pl-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                        {item.recommended_action === "DISCOUNT_PRICE" && "🏷️ Discount Price"}
                        {item.recommended_action === "BUNDLE_PROMO" && "🎁 Bundle Promotion"}
                        {item.recommended_action === "RETURN_TO_SUPPLIER" && "🚚 Return to Vendor"}
                        {item.recommended_action === "DISCONTINUE" && "⛔ Discontinue Item"}
                        {item.recommended_action === "MONITOR" && "👀 Monitor Velocity"}
                      </span>
                      {Number(item.recommended_discount_pct) > 0 && (
                        <div className="text-[10px] text-slate-400">
                          Rec. discount: -{item.recommended_discount_pct}%
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setDiscountPct(String(item.recommended_discount_pct || 20));
                            setMarkdownModalOpen(true);
                          }}
                          className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                        >
                          Markdown
                        </button>
                        <button
                          onClick={() => handleDiscontinue(item)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        >
                          Discontinue
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No stagnant slow-moving products found for selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Markdown Modal */}
      {markdownModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Percent className="h-5 w-5 text-indigo-400" /> Apply Clearance Markdown
              </h3>
              <button
                onClick={() => setMarkdownModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Clear dormant inventory for <span className="text-white font-medium">{selectedItem.product_name}</span>
            </p>

            <form onSubmit={handleApplyMarkdown} className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-800/60 p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Selling Price:</span>
                  <span className="font-mono text-slate-200">Rs. {Number(selectedItem.selling_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Product Cost Price:</span>
                  <span className="font-mono text-slate-400">Rs. {Number(selectedItem.cost_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700/60 pt-2">
                  <span className="text-slate-400">New Price after {discountPct}% Markdown:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    Rs. {(Number(selectedItem.selling_price) * (1 - Number(discountPct) / 100)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Clearance Discount %</label>
                <div className="flex items-center gap-2">
                  {[10, 15, 20, 25, 40].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPct(String(pct))}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                        Number(discountPct) === pct
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Custom discount %"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reason / Campaign Justification</label>
                <input
                  type="text"
                  value={markdownReason}
                  onChange={(e) => setMarkdownReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMarkdownModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? "Executing..." : "Apply Clearance Markdown"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
