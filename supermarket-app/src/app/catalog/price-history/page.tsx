"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  History,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Percent,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

export default function CatalogPriceHistoryPage() {
  const { showToast, currentEmployee } = useApp();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [search, setSearch] = useState("");

  // Supervisor Review Modal State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === "PENDING") params.append("status", "PENDING_SUPERVISOR_APPROVAL");
      else if (activeTab === "APPROVED") params.append("status", "APPROVED");
      else if (activeTab === "REJECTED") params.append("status", "REJECTED");
      else params.append("status", "ALL");

      const res = await fetch(`/api/catalog/price-approvals?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Error loading price history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceHistory();
  }, [activeTab]);

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/catalog/price-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history_id: selectedItem.history_id,
          decision,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        setModalOpen(false);
        setSelectedItem(null);
        setComment("");
        fetchPriceHistory();
      } else {
        showToast(data.error || "Failed to submit decision", "error");
      }
    } catch {
      showToast("Error processing decision", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.product_name?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q) ||
      item.requester_name?.toLowerCase().includes(q) ||
      item.reason?.toLowerCase().includes(q)
    );
  });

  const pendingCount = history.filter(
    (h) => h.supervisor_approval_status === "PENDING_SUPERVISOR_APPROVAL"
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-400 uppercase">
              <History className="h-3.5 w-3.5" /> Pricing Governance
            </span>
            <span className="text-xs text-slate-400">table: product_price_history</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Price History &amp; Supervisor Approvals
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Audit trail of all retail price modifications, reason codes, supervisor review decisions, and margin elasticity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPriceHistory()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            Refresh
          </button>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
          >
            Product Catalog &rarr;
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "ALL"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            All Revisions ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`relative rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "PENDING"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Awaiting Approval
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-bold text-slate-900">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "APPROVED"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab("REJECTED")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "REJECTED"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, barcode, reason..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 pl-6 font-medium">Product / Barcode</th>
                <th className="py-3.5 font-medium">Category</th>
                <th className="py-3.5 text-right font-medium">Old Price</th>
                <th className="py-3.5 text-right font-medium">New Price</th>
                <th className="py-3.5 text-right font-medium">Variance</th>
                <th className="py-3.5 pl-4 font-medium">Modified By</th>
                <th className="py-3.5 font-medium">Reason &amp; Supervisor Notes</th>
                <th className="py-3.5 text-center font-medium">Status</th>
                <th className="py-3.5 pr-6 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      Loading price history records...
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.history_id} className="transition-colors hover:bg-slate-800/40">
                    <td className="py-3.5 pl-6">
                      <div className="font-semibold text-white">{item.product_name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{item.barcode}</div>
                    </td>
                    <td className="py-3.5 text-slate-300">{item.category_name || "General"}</td>
                    <td className="py-3.5 text-right font-mono text-slate-400">
                      Rs. {Number(item.old_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-white">
                      Rs. {Number(item.new_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right">
                      <span className={`font-mono font-semibold ${
                        Number(item.price_variance_pct) < 0
                          ? "text-rose-400"
                          : Number(item.price_variance_pct) > 0
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }`}>
                        {Number(item.price_variance_pct) > 0 ? `+${item.price_variance_pct}%` : `${item.price_variance_pct}%`}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4">
                      <div className="text-slate-200">{item.requester_name || "Catalog Manager"}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(item.changed_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 max-w-xs">
                      <div className="text-slate-300 truncate font-medium">{item.reason}</div>
                      {item.supervisor_comment && (
                        <div className="text-[10px] text-indigo-400 italic">
                          Supervisor: &ldquo;{item.supervisor_comment}&rdquo;
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                        item.supervisor_approval_status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : item.supervisor_approval_status === "REJECTED"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                      }`}>
                        {item.supervisor_approval_status === "PENDING_SUPERVISOR_APPROVAL"
                          ? "Pending Review"
                          : item.supervisor_approval_status || "Approved"}
                      </span>
                    </td>
                    <td className="py-3.5 pr-6 text-right">
                      {item.supervisor_approval_status === "PENDING_SUPERVISOR_APPROVAL" ? (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setModalOpen(true);
                          }}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No price revision records found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supervisor Review Modal */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Supervisor Price Change Review</h3>
                <p className="text-xs text-slate-400">Verify policy compliance before store deployment</p>
              </div>
            </div>

            <div className="my-4 space-y-2.5 rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="font-semibold text-white">{selectedItem.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Barcode:</span>
                <span className="font-mono text-slate-300">{selectedItem.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Selling Price:</span>
                <span className="font-mono font-medium text-slate-200">Rs. {selectedItem.old_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cost Price:</span>
                <span className="font-mono text-slate-300">Rs. {selectedItem.cost_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Proposed New Price:</span>
                <span className="font-mono font-bold text-amber-400">Rs. {selectedItem.new_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Price Variance:</span>
                <span className={`font-mono font-bold ${Number(selectedItem.price_variance_pct) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {selectedItem.price_variance_pct}%
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-2">
                <span className="text-slate-400">Margin Status:</span>
                <span className={`font-mono font-semibold ${selectedItem.is_below_cost ? "text-rose-400" : "text-emerald-400"}`}>
                  {selectedItem.is_below_cost ? "⚠️ Selling Below Cost Price!" : "Profitable"}
                </span>
              </div>
              <div className="pt-1 text-slate-400 italic">
                Reason given: &ldquo;{selectedItem.reason}&rdquo;
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Supervisor Approval Comment / Justification
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="E.g., Approved for seasonal clearance promo..."
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision("REJECTED")}
                className="rounded-xl border border-rose-600 bg-rose-600/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-600/30 transition-colors disabled:opacity-50"
              >
                Reject Revision
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision("APPROVED")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                Approve &amp; Update Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
