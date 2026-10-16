"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/context";
import { ProductBatch, Branch } from "@/lib/types";
import {
  PackagePlus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Store,
  RefreshCw,
  X,
  CalendarDays,
  Hash,
  ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchSummary {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
}

type ExpiryStatus = "ALL" | "GOOD" | "NEAR_EXPIRY" | "EXPIRED";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({
  status,
  daysToExpiry,
}: {
  status: string | undefined;
  daysToExpiry?: number;
}) {
  if (status === "EXPIRED") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-rose-950/70 text-rose-400 border border-rose-800/60">
        <X className="w-2.5 h-2.5" />
        EXPIRED
      </span>
    );
  }
  if (status === "NEAR_EXPIRY") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-950/70 text-amber-400 border border-amber-800/60 animate-pulse">
        <AlertTriangle className="w-2.5 h-2.5" />
        {daysToExpiry !== undefined ? `EXPIRING IN ${daysToExpiry}d` : "NEAR EXPIRY"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
      <CheckCircle2 className="w-2.5 h-2.5" />
      FRESH / GOOD
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryBatchesPage() {
  const { branches } = useApp();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<ExpiryStatus>("ALL");

  // Data
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // ── Build query params ────────────────────────────────────────────────────

  const buildParams = useCallback((): string => {
    const p = new URLSearchParams();
    if (selectedBranchId !== "ALL") p.set("branchId", selectedBranchId);
    if (search.trim()) p.set("search", search.trim());
    if (statusFilter !== "ALL") p.set("status", statusFilter);
    return p.toString();
  }, [selectedBranchId, search, statusFilter]);

  // ── Fetch summary ─────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const p = new URLSearchParams();
      if (selectedBranchId !== "ALL") p.set("branchId", selectedBranchId);
      p.set("summary", "true");
      const res = await fetch(`/api/inventory/batches?${p.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSummary(await res.json());
    } catch (err: any) {
      console.error("Error fetching batch summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedBranchId]);

  // ── Fetch batches ─────────────────────────────────────────────────────────

  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/batches?${buildParams()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setBatches(data);
      } else {
        throw new Error(data.error ?? "Unexpected response");
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load batches");
    } finally {
      setLoadingBatches(false);
    }
  }, [buildParams]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    setLastRefreshed(new Date());
    fetchSummary();
    fetchBatches();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBatches();
  };

  // ─── Summary Card Data ────────────────────────────────────────────────────

  const cards = [
    {
      label: "Total Batches",
      value: summary?.total ?? 0,
      icon: <Layers className="w-5 h-5" />,
      gradient: "from-blue-600/20 to-indigo-600/20",
      border: "border-blue-800/40",
      iconColor: "text-blue-400",
      textColor: "text-blue-300",
    },
    {
      label: "Active",
      value: summary?.active ?? 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
      gradient: "from-emerald-600/20 to-teal-600/20",
      border: "border-emerald-800/40",
      iconColor: "text-emerald-400",
      textColor: "text-emerald-300",
    },
    {
      label: "Expiring Soon",
      value: summary?.expiring_soon ?? 0,
      icon: <Clock className="w-5 h-5" />,
      gradient: "from-amber-600/20 to-orange-600/20",
      border: "border-amber-800/40",
      iconColor: "text-amber-400",
      textColor: "text-amber-300",
    },
    {
      label: "Expired",
      value: summary?.expired ?? 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: "from-rose-600/20 to-red-600/20",
      border: "border-rose-800/40",
      iconColor: "text-rose-400",
      textColor: "text-rose-300",
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6 animate-in fade-in duration-300">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <PackagePlus className="w-6 h-6 text-indigo-400" />
            <span>Inventory Batches</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Track received product batches and expiry dates.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          title="Refresh data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingBatches || loadingSummary ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`glass-card rounded-2xl border ${card.border} p-4 bg-gradient-to-br ${card.gradient}`}
          >
            <div className={`${card.iconColor} mb-2`}>{card.icon}</div>
            <div className={`text-2xl font-black ${card.textColor}`}>
              {loadingSummary ? (
                <span className="inline-block w-10 h-6 rounded bg-slate-700/60 animate-pulse" />
              ) : (
                card.value
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            id="batch-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or batch number..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Branch Filter */}
        <div className="relative shrink-0">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <select
            id="batch-branch-filter"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b: Branch) => (
              <option key={b.branch_id} value={String(b.branch_id)}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <select
            id="batch-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExpiryStatus)}
            className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="GOOD">Fresh / Good</option>
            <option value="NEAR_EXPIRY">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Batch Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">

        {/* Table meta bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Hash className="w-3.5 h-3.5" />
            <span className="font-semibold">
              {loadingBatches
                ? "Loading..."
                : `${batches.length} batch${batches.length !== 1 ? "es" : ""} found`}
            </span>
            {(search || statusFilter !== "ALL" || selectedBranchId !== "ALL") && (
              <span className="text-indigo-400 font-mono">(filtered)</span>
            )}
          </div>
          <div className="text-[10px] text-slate-600 font-mono hidden sm:block">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">Batch No.</th>
                <th className="py-3.5 px-4 font-semibold">Product Name</th>
                <th className="py-3.5 px-4 font-semibold">Branch</th>
                <th className="py-3.5 px-4 font-semibold text-right">Quantity</th>
                <th className="py-3.5 px-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Received
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Expiry Date
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Days Left</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">

              {/* Loading skeleton */}
              {loadingBatches &&
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="py-3.5 px-4">
                        <div className="h-3 rounded bg-slate-800/60 w-4/5" />
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Error state */}
              {!loadingBatches && error && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-rose-400">
                      <AlertTriangle className="w-8 h-8" />
                      <div className="font-semibold">Failed to load batches</div>
                      <div className="text-xs text-slate-500 font-mono">{error}</div>
                      <button
                        onClick={fetchBatches}
                        className="mt-2 px-4 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-800/50 text-xs font-semibold text-rose-300 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loadingBatches && !error && batches.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <PackagePlus className="w-10 h-10 text-slate-700" />
                      <div className="font-semibold text-slate-400">No batches found</div>
                      <div className="text-xs text-slate-600">
                        {search || statusFilter !== "ALL" || selectedBranchId !== "ALL"
                          ? "Try adjusting your search or filters."
                          : "No product batches have been recorded yet."}
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loadingBatches &&
                !error &&
                batches.map((b) => {
                  const daysLeft =
                    b.days_to_expiry !== undefined ? Number(b.days_to_expiry) : null;
                  const rowHighlight =
                    b.expiry_status === "EXPIRED"
                      ? "bg-rose-950/10 hover:bg-rose-950/20"
                      : b.expiry_status === "NEAR_EXPIRY"
                      ? "bg-amber-950/10 hover:bg-amber-950/20"
                      : "hover:bg-slate-800/40";

                  return (
                    <tr key={b.batch_id} className={`transition-colors ${rowHighlight}`}>

                      {/* Batch No */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                        {b.batch_no}
                      </td>

                      {/* Product Name + barcode */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{b.product_name}</div>
                        {b.barcode && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {b.barcode}
                          </div>
                        )}
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4 text-slate-300">{b.branch_name}</td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {b.quantity}
                      </td>

                      {/* Received Date */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {formatDate(b.received_date)}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {b.expiry_date ? (
                          formatDate(b.expiry_date)
                        ) : (
                          <span className="text-slate-600">No expiry</span>
                        )}
                      </td>

                      {/* Days Left */}
                      <td className="py-3 px-4 text-right font-mono">
                        {daysLeft === null ? (
                          <span className="text-slate-600">--</span>
                        ) : daysLeft < 0 ? (
                          <span className="text-rose-400 font-bold">
                            {Math.abs(daysLeft)}d ago
                          </span>
                        ) : daysLeft === 0 ? (
                          <span className="text-rose-400 font-bold">Today</span>
                        ) : (
                          <span
                            className={
                              daysLeft <= 14
                                ? "text-amber-400 font-bold"
                                : "text-slate-300"
                            }
                          >
                            {daysLeft}d
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        <StatusBadge
                          status={b.expiry_status}
                          daysToExpiry={
                            daysLeft !== null && daysLeft >= 0 ? daysLeft : undefined
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Table footer legend */}
        {!loadingBatches && !error && batches.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center gap-4 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500/70 inline-block" />
              Fresh / Good
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500/70 inline-block" />
              Expiring &lt;= 14 days
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500/70 inline-block" />
              Expired
            </span>
            <span className="ml-auto text-slate-600 hidden sm:block">
              Ordered by expiry date ASC
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
