"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  History,
  ShieldAlert,
  Search,
  RefreshCw,
} from "lucide-react";

export default function CatalogPriceHistoryPage() {
  const { showToast } = useApp();
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-700 uppercase">
              <History className="h-3.5 w-3.5" /> Pricing Governance
            </span>
            <span className="text-xs text-slate-400">table: product_price_history</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Price History &amp; Supervisor Approvals
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Audit trail of all retail price modifications, reason codes, supervisor review decisions, and margin elasticity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPriceHistory()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Product Catalog &rarr;
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "ALL"
                ? "bg-indigo-600 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Revisions ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`relative rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "PENDING"
                ? "bg-amber-600 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Awaiting Approval
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "APPROVED"
                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab("REJECTED")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "REJECTED"
                ? "bg-rose-600 text-white font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, barcode, reason..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 pl-6 font-semibold">Product / Barcode</th>
                <th className="py-3.5 font-semibold">Category</th>
                <th className="py-3.5 text-right font-semibold">Old Price</th>
                <th className="py-3.5 text-right font-semibold">New Price</th>
                <th className="py-3.5 text-right font-semibold">Variance</th>
                <th className="py-3.5 pl-4 font-semibold">Modified By</th>
                <th className="py-3.5 font-semibold">Reason &amp; Supervisor Notes</th>
                <th className="py-3.5 text-center font-semibold">Status</th>
                <th className="py-3.5 pr-6 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      Loading price history records...
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.history_id} className="transition-colors hover:bg-slate-50/70">
                    <td className="py-3.5 pl-6">
                      <div className="font-semibold text-slate-900">{item.product_name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{item.barcode}</div>
                    </td>
                    <td className="py-3.5 text-slate-600">{item.category_name || "General"}</td>
                    <td className="py-3.5 text-right font-mono text-slate-500">
                      Rs. {Number(item.old_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                      Rs. {Number(item.new_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right">
                      <span className={`font-mono font-semibold ${
                        Number(item.price_variance_pct) < 0
                          ? "text-rose-600"
                          : Number(item.price_variance_pct) > 0
                          ? "text-emerald-600"
                          : "text-slate-500"
                      }`}>
                        {Number(item.price_variance_pct) > 0 ? `+${item.price_variance_pct}%` : `${item.price_variance_pct}%`}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4">
                      <div className="font-medium text-slate-800">{item.requester_name || "Catalog Manager"}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(item.changed_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 max-w-xs">
                      <div className="text-slate-700 truncate font-medium">{item.reason}</div>
                      {item.supervisor_comment && (
                        <div className="text-[10px] text-indigo-700 italic">
                          Supervisor: &ldquo;{item.supervisor_comment}&rdquo;
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                        item.supervisor_approval_status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : item.supervisor_approval_status === "REJECTED"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
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
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600 border border-amber-200">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supervisor Price Change Review</h3>
                <p className="text-xs text-slate-500">Verify policy compliance before store deployment</p>
              </div>
            </div>

            <div className="my-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-semibold text-slate-900">{selectedItem.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Barcode:</span>
                <span className="font-mono text-slate-700">{selectedItem.barcode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Selling Price:</span>
                <span className="font-mono font-medium text-slate-800">Rs. {selectedItem.old_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost Price:</span>
                <span className="font-mono text-slate-700">Rs. {selectedItem.cost_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proposed New Price:</span>
                <span className="font-mono font-bold text-amber-700">Rs. {selectedItem.new_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Price Variance:</span>
                <span className={`font-mono font-bold ${Number(selectedItem.price_variance_pct) < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedItem.price_variance_pct}%
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Margin Status:</span>
                <span className={`font-mono font-semibold ${selectedItem.is_below_cost ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedItem.is_below_cost ? "⚠️ Selling Below Cost Price!" : "Profitable"}
                </span>
              </div>
              <div className="pt-1 text-slate-500 italic">
                Reason given: &ldquo;{selectedItem.reason}&rdquo;
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Supervisor Approval Comment / Justification
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="E.g., Approved for seasonal clearance promo..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision("REJECTED")}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                Reject Revision
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision("APPROVED")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
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
