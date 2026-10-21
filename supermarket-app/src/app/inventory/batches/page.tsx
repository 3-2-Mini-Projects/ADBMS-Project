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
  Trash2,
  History,
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
  isClerk,
}: {
  status: string | undefined;
  daysToExpiry?: number;
  isClerk?: boolean;
}) {
  if (status === "EXPIRED" || (daysToExpiry !== undefined && daysToExpiry < 0)) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
          isClerk
            ? "bg-rose-50 text-rose-700 border border-rose-200"
            : "bg-rose-950/70 text-rose-400 border border-rose-800/60"
        }`}
      >
        <X className="w-2.5 h-2.5" />
        EXPIRED
      </span>
    );
  }
  if (daysToExpiry === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
          isClerk
            ? "bg-amber-100 text-amber-800 border border-amber-300"
            : "bg-amber-900/70 text-amber-300 border border-amber-700/60 animate-pulse"
        }`}
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        EXPIRING TODAY
      </span>
    );
  }
  if (
    status === "NEAR_EXPIRY" ||
    status === "EXPIRING_SOON" ||
    (daysToExpiry !== undefined && daysToExpiry <= 30)
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
          isClerk
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-amber-950/70 text-amber-400 border border-amber-800/60"
        }`}
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        {daysToExpiry !== undefined ? `EXPIRING IN ${daysToExpiry}d` : "NEAR EXPIRY"}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
        isClerk
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-emerald-950/70 text-emerald-400 border border-emerald-800/60"
      }`}
    >
      <CheckCircle2 className="w-2.5 h-2.5" />
      FRESH / GOOD
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryBatchesPage() {
  const { branches, currentEmployee, showToast } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

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

  // Disposal / Write-Off Modal State
  const [disposalModalOpen, setDisposalModalOpen] = useState(false);
  const [selectedDisposalBatch, setSelectedDisposalBatch] = useState<ProductBatch | null>(null);
  const [disposalQty, setDisposalQty] = useState<number | "">("");
  const [disposalReason, setDisposalReason] = useState<string>("EXPIRED");
  const [isDisposing, setIsDisposing] = useState(false);

  // Disposal History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [disposalHistory, setDisposalHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchDisposalHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/inventory/disposal?branchId=${selectedBranchId}`);
      const data = await res.json();
      if (Array.isArray(data)) setDisposalHistory(data);
    } catch {
      console.warn("Could not load disposal history");
    } finally {
      setLoadingHistory(false);
    }
  };

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

  const handleOpenDisposal = (batch: ProductBatch) => {
    setSelectedDisposalBatch(batch);
    setDisposalQty(batch.quantity);
    const daysLeft =
      batch.days_to_expiry !== undefined ? Number(batch.days_to_expiry) : null;
    const isExpiredOrToday =
      daysLeft !== null
        ? daysLeft <= 0
        : (batch.expiry_status === "EXPIRED" || batch.status === "EXPIRED");
    setDisposalReason(isExpiredOrToday ? "EXPIRED" : "DAMAGED");
    setDisposalModalOpen(true);
  };

  const handleDisposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisposalBatch || !disposalQty) return;
    setIsDisposing(true);
    try {
      const res = await fetch("/api/inventory/disposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: selectedDisposalBatch.batch_id,
          quantity: Number(disposalQty),
          reason: disposalReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Stock disposed successfully via sp_record_stock_disposal!", "success");
        setDisposalModalOpen(false);
        fetchSummary();
        fetchBatches();
      } else {
        showToast(data.error || "Disposal failed", "error");
      }
    } catch {
      showToast("Network error executing disposal", "error");
    } finally {
      setIsDisposing(false);
    }
  };

  const theme = {
    wrapper: isClerk
      ? "space-y-6 animate-in fade-in duration-300 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-6 animate-in fade-in duration-300 text-slate-100",
    title: isClerk ? "text-2xl font-black text-slate-900 flex items-center gap-2.5" : "text-2xl font-black text-white flex items-center gap-2.5",
    subtitle: isClerk ? "mt-1 text-sm text-slate-500 font-medium" : "mt-1 text-sm text-slate-400 font-normal",
    refreshBtn: isClerk
      ? "self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-sm transition-all"
      : "self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all",
    card: isClerk
      ? "bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow transition-shadow"
      : "glass-card rounded-2xl border border-slate-800 p-4",
    cardValue: isClerk ? "text-2xl font-black text-slate-900" : "text-2xl font-black text-white",
    cardLabel: isClerk ? "text-xs text-slate-500 mt-0.5 font-medium" : "text-[11px] text-slate-400 mt-0.5 font-medium",
    cardIconBg: (bg: string) => isClerk ? bg : "bg-slate-800/80",
    searchInput: isClerk
      ? "w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:border-indigo-500 focus:outline-none shadow-sm transition-colors"
      : "w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none transition-colors",
    select: isClerk
      ? "appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none shadow-sm transition-colors cursor-pointer"
      : "appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer",
    tableCard: isClerk
      ? "bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"
      : "glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl",
    tableMeta: isClerk
      ? "flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70"
      : "flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60",
    tableThead: isClerk
      ? "border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-bold"
      : "border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider text-[11px] font-semibold",
    tableDivide: isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/60",
    rowHighlight: (expiryStatus?: string) => {
      const isExp = expiryStatus === "EXPIRED";
      const isNear = expiryStatus === "NEAR_EXPIRY" || expiryStatus === "EXPIRING_SOON";
      if (isClerk) {
        if (isExp) return "bg-rose-50/50 hover:bg-rose-50";
        if (isNear) return "bg-amber-50/50 hover:bg-amber-50";
        return "hover:bg-slate-50";
      } else {
        if (isExp) return "bg-rose-950/10 hover:bg-rose-950/20";
        if (isNear) return "bg-amber-950/10 hover:bg-amber-950/20";
        return "hover:bg-slate-800/40";
      }
    },
    batchNo: isClerk ? "py-3 px-4 font-mono font-bold text-indigo-600" : "py-3 px-4 font-mono font-bold text-indigo-400",
    prodName: isClerk ? "font-semibold text-slate-900" : "font-medium text-white",
    branchName: isClerk ? "py-3 px-4 text-slate-600 font-medium" : "py-3 px-4 text-slate-300",
    qty: isClerk ? "py-3 px-4 text-right font-mono font-bold text-slate-900" : "py-3 px-4 text-right font-mono font-bold text-white",
    receivedDate: isClerk ? "py-3 px-4 font-mono text-slate-500" : "py-3 px-4 font-mono text-slate-400",
    expiryDate: isClerk ? "py-3 px-4 font-mono text-slate-700" : "py-3 px-4 font-mono text-slate-300",
    tableFooter: isClerk
      ? "px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-4 text-[10px] text-slate-500 font-mono"
      : "px-4 py-2.5 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center gap-4 text-[10px] text-slate-500 font-mono",
  };

  // ─── Summary Card Data ────────────────────────────────────────────────────

  const cards = [
    {
      label: "Total Batches",
      value: summary?.total ?? 0,
      icon: <Layers className="w-5 h-5 text-blue-500" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Active Batches",
      value: summary?.active ?? 0,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Expiring Soon",
      value: summary?.expiring_soon ?? 0,
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "Expired Batches",
      value: summary?.expired ?? 0,
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-950/40",
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className={theme.wrapper}>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={theme.title}>
            <PackagePlus className="w-6 h-6 text-indigo-500" />
            <span>Inventory Batches</span>
          </h1>
          <p className={theme.subtitle}>
            Track received product batches, shelf-life, and expiry dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchDisposalHistory();
              setHistoryModalOpen(true);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-rose-300 hover:text-white transition-all shadow-sm"
            title="View Stock Disposal & Write-Off History"
          >
            <History className="w-3.5 h-3.5 text-rose-400" />
            <span>Disposal History</span>
          </button>

          <button
            onClick={handleRefresh}
            className={theme.refreshBtn}
            title="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBatches || loadingSummary ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card) => (
          <div
            key={card.label}
            className={theme.card}
          >
            <div className={`w-10 h-10 rounded-xl ${theme.cardIconBg(card.iconBg)} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <div className={theme.cardValue}>
              {loadingSummary ? (
                <span className="inline-block w-10 h-6 rounded bg-slate-300 dark:bg-slate-700 animate-pulse" />
              ) : (
                card.value
              )}
            </div>
            <div className={theme.cardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="batch-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or batch number..."
            className={theme.searchInput}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Branch Filter */}
        <div className="relative shrink-0">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            id="batch-branch-filter"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className={theme.select}
          >
            <option value="ALL">All Branches</option>
            {branches.map((b: Branch) => (
              <option key={b.branch_id} value={String(b.branch_id)}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            id="batch-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ExpiryStatus)}
            className={theme.select}
          >
            <option value="ALL">All Statuses</option>
            <option value="GOOD">Fresh / Good</option>
            <option value="NEAR_EXPIRY">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Batch Table */}
      <div className={theme.tableCard}>

        {/* Table meta bar */}
        <div className={theme.tableMeta}>
          <div className="flex items-center gap-2 text-xs">
            <Hash className="w-3.5 h-3.5 opacity-60" />
            <span className="font-semibold">
              {loadingBatches
                ? "Loading batches..."
                : `${batches.length} batch${batches.length !== 1 ? "es" : ""} found`}
            </span>
            {(search || statusFilter !== "ALL" || selectedBranchId !== "ALL") && (
              <span className="text-indigo-400 font-mono font-medium">(filtered)</span>
            )}
          </div>
          <div className="text-[10px] opacity-60 font-mono hidden sm:block">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={theme.tableThead}>
                <th className="py-3.5 px-4">Batch No.</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4 text-right">Quantity</th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 opacity-60" />
                    Received
                  </div>
                </th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 opacity-60" />
                    Expiry Date
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Days Left</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className={theme.tableDivide}>

              {/* Loading skeleton */}
              {loadingBatches &&
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="py-3.5 px-4">
                        <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-4/5" />
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Error state */}
              {!loadingBatches && error && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-rose-500">
                      <AlertTriangle className="w-8 h-8" />
                      <div className="font-semibold">Failed to load batches</div>
                      <div className="text-xs text-slate-500 font-mono">{error}</div>
                      <button
                        onClick={fetchBatches}
                        className="mt-2 px-4 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-500 transition-colors"
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
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <PackagePlus className="w-10 h-10 opacity-40" />
                      <div className="font-semibold">No batches found</div>
                      <div className="text-xs opacity-60">
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
                  const isExpired =
                    daysLeft !== null
                      ? daysLeft < 0
                      : (b.status === "EXPIRED" || b.expiry_status === "EXPIRED");
                  const isExpiringToday = daysLeft === 0;
                  const isNearExpiry =
                    !isExpired &&
                    (isExpiringToday ||
                      (daysLeft !== null
                        ? daysLeft <= 30
                        : (b.status === "NEAR_EXPIRY" ||
                           b.expiry_status === "NEAR_EXPIRY" ||
                           b.expiry_status === "EXPIRING_SOON")));
                  const batchStatus = isExpired ? "EXPIRED" : isNearExpiry ? "NEAR_EXPIRY" : "GOOD";

                  return (
                    <tr key={b.batch_id} className={`transition-colors ${theme.rowHighlight(batchStatus)}`}>

                      {/* Batch No */}
                      <td className={theme.batchNo}>
                        {b.batch_no}
                      </td>

                      {/* Product Name + barcode */}
                      <td className="py-3 px-4">
                        <div className={theme.prodName}>{b.product_name}</div>
                        {b.barcode && (
                          <div className="text-[10px] opacity-60 font-mono mt-0.5">
                            {b.barcode}
                          </div>
                        )}
                      </td>

                      {/* Branch */}
                      <td className={theme.branchName}>{b.branch_name}</td>

                      {/* Quantity */}
                      <td className={theme.qty}>
                        {b.quantity}
                      </td>

                      {/* Received Date */}
                      <td className={theme.receivedDate}>
                        {formatDate(b.received_date)}
                      </td>

                      {/* Expiry Date */}
                      <td className={theme.expiryDate}>
                        {b.expiry_date ? (
                          formatDate(b.expiry_date)
                        ) : (
                          <span className="opacity-40">No expiry</span>
                        )}
                      </td>

                      {/* Days Left */}
                      <td className="py-3 px-4 text-right font-mono">
                        {daysLeft === null ? (
                          <span className="opacity-40">--</span>
                        ) : daysLeft < 0 ? (
                          <span className="text-rose-500 font-bold">
                            {Math.abs(daysLeft)}d ago
                          </span>
                        ) : daysLeft === 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-black">Today</span>
                        ) : (
                          <span
                            className={
                              daysLeft <= 30
                                ? "text-amber-600 dark:text-amber-400 font-bold"
                                : isClerk
                                ? "text-slate-600"
                                : "opacity-80"
                            }
                          >
                            {daysLeft}d
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        <StatusBadge
                          status={batchStatus}
                          isClerk={isClerk}
                          daysToExpiry={daysLeft !== null ? daysLeft : undefined}
                        />
                      </td>

                      {/* Action: Dispose / Write-Off */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenDisposal(b)}
                          disabled={b.quantity <= 0}
                          className={`p-1.5 rounded-lg border text-xs font-semibold transition-all inline-flex items-center gap-1 shadow-sm disabled:opacity-40 ${
                            batchStatus === "EXPIRED"
                              ? isClerk
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                                : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/30"
                              : isClerk
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                          }`}
                          title="Dispose / Write-off stock via sp_record_stock_disposal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Write Off</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Table footer legend */}
        {!loadingBatches && !error && batches.length > 0 && (
          <div className={theme.tableFooter}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Fresh / Good
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Expiring &le; 30 days
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Expired
            </span>
            <span className="ml-auto opacity-60 hidden sm:block">
              Ordered by expiry date ASC
            </span>
          </div>
        )}
      </div>

      {/* MODAL: Stock Disposal / Write-Off */}
      {disposalModalOpen && selectedDisposalBatch && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
          isClerk ? "bg-slate-900/60 backdrop-blur-sm" : "bg-black/75 backdrop-blur-sm"
        }`}>
          <div className={`rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border ${
            isClerk ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isClerk ? "border-slate-100" : "border-slate-800"}`}>
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <h3 className={`font-bold text-sm ${isClerk ? "text-slate-900" : "text-white"}`}>
                  Stock Disposal / Write-Off
                </h3>
              </div>
              <button
                onClick={() => setDisposalModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isClerk ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-slate-400 hover:text-white"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              isClerk ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
            }`}>
              <div className="flex justify-between">
                <span className={isClerk ? "text-slate-500" : "text-slate-400"}>Batch No:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedDisposalBatch.batch_no}</span>
              </div>
              <div className="flex justify-between">
                <span className={isClerk ? "text-slate-500" : "text-slate-400"}>Product:</span>
                <span className={`font-semibold ${isClerk ? "text-slate-900" : "text-white"}`}>{selectedDisposalBatch.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className={isClerk ? "text-slate-500" : "text-slate-400"}>Branch:</span>
                <span className={isClerk ? "text-slate-700 font-medium" : "text-slate-300"}>{selectedDisposalBatch.branch_name}</span>
              </div>
              <div className="flex justify-between">
                <span className={isClerk ? "text-slate-500" : "text-slate-400"}>Current Batch Stock:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{selectedDisposalBatch.quantity} units</span>
              </div>
              {selectedDisposalBatch.expiry_date && (
                <div className="flex justify-between">
                  <span className={isClerk ? "text-slate-500" : "text-slate-400"}>Expiry Date:</span>
                  <span className={`font-mono font-semibold ${(selectedDisposalBatch.expiry_status || selectedDisposalBatch.status) === "EXPIRED" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {formatDate(selectedDisposalBatch.expiry_date)} ({selectedDisposalBatch.expiry_status || selectedDisposalBatch.status})
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleDisposalSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-semibold block mb-1 ${isClerk ? "text-slate-700" : "text-slate-300"}`}>
                  Quantity to Write Off / Dispose
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedDisposalBatch.quantity}
                  required
                  value={disposalQty}
                  onChange={(e) => setDisposalQty(e.target.value ? Number(e.target.value) : "")}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-rose-500 transition-all ${
                    isClerk
                      ? "bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-rose-100"
                      : "bg-slate-950 border border-slate-700 text-white"
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1 ${isClerk ? "text-slate-700" : "text-slate-300"}`}>
                  Disposal Reason
                </label>
                <select
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 cursor-pointer transition-all ${
                    isClerk
                      ? "bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-rose-100"
                      : "bg-slate-950 border border-slate-700 text-white"
                  }`}
                >
                  <option value="EXPIRED">EXPIRED (Passed Expiration Date)</option>
                  <option value="DAMAGED">DAMAGED (Crushed / Broken Packaging)</option>
                  <option value="SPOILED">SPOILED (Temperature / Cold-Chain Failure)</option>
                  <option value="RECALL">SUPPLIER RECALL (Safety Defect)</option>
                  <option value="SHRINKAGE">SHRINKAGE / DISCREPANCY</option>
                </select>
              </div>

              <div className={`text-[11px] p-2.5 rounded-xl border ${
                isClerk
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "text-slate-400 bg-rose-500/10 border-rose-500/20"
              }`}>
                ⚠️ Executing this will permanently deduct stock from <strong>product_batches</strong> and <strong>inventory</strong> via <code>sp_record_stock_disposal</code> and write an entry into <strong>audit_log</strong>.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisposalModalOpen(false)}
                  className={`w-1/3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isClerk
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisposing || !disposalQty}
                  className="w-2/3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {isDisposing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Write-Off...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Stock Disposal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Disposal History Log */}
      {historyModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
          isClerk ? "bg-slate-900/60 backdrop-blur-sm" : "bg-black/75 backdrop-blur-sm"
        }`}>
          <div className={`rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col border ${
            isClerk ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isClerk ? "border-slate-100" : "border-slate-800"}`}>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-rose-500" />
                <div>
                  <h3 className={`font-bold text-sm ${isClerk ? "text-slate-900" : "text-white"}`}>
                    Stock Disposal & Write-Off Audit Trail
                  </h3>
                  <div className={`text-[11px] font-mono ${isClerk ? "text-slate-500" : "text-slate-400"}`}>
                    vw_stock_movement_audit • table: product_batches
                  </div>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isClerk ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-slate-400 hover:text-white"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`overflow-x-auto flex-1 border rounded-xl ${
              isClerk ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-950/60"
            }`}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                    isClerk ? "border-slate-200 bg-slate-50 text-slate-600" : "border-slate-800 bg-slate-950/80 text-slate-400"
                  }`}>
                    <th className="py-2.5 px-3 font-mono">Timestamp</th>
                    <th className="py-2.5 px-3">Batch ID</th>
                    <th className="py-2.5 px-3 text-right">Qty Written Off</th>
                    <th className="py-2.5 px-3 text-center">Reason</th>
                    <th className="py-2.5 px-3 text-right">Authorized By</th>
                  </tr>
                </thead>
                <tbody className={isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/50"}>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto text-rose-500 mb-2" />
                        Loading disposal audit trail...
                      </td>
                    </tr>
                  ) : disposalHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500 mb-1 opacity-70" />
                        No stock disposals recorded for this filter yet.
                      </td>
                    </tr>
                  ) : (
                    disposalHistory.map((item) => (
                      <tr key={item.log_id} className={isClerk ? "hover:bg-slate-50 transition-colors" : "hover:bg-slate-800/40 transition-colors"}>
                        <td className={`py-2.5 px-3 font-mono text-[11px] ${isClerk ? "text-slate-500" : "text-slate-400"}`}>
                          {new Date(item.changed_at).toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-3 font-mono font-bold ${isClerk ? "text-indigo-600" : "text-indigo-400"}`}>
                          Batch #{item.details?.batch_id || item.record_id?.replace("disposal_batch_", "")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          -{item.details?.quantity} units
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isClerk ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}>
                            {item.details?.reason || "EXPIRED"}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono ${isClerk ? "text-slate-700" : "text-slate-300"}`}>
                          {item.changed_by?.includes("SYSTEM") || item.details?.event === "AUTO_MIDNIGHT_EXPIRY" ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isClerk
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-blue-950/60 text-blue-300 border border-blue-800"
                            }`}>
                              ⚡ 12:00 AM Auto
                            </span>
                          ) : (
                            item.changed_by
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={`pt-2 border-t flex justify-between items-center text-xs ${
              isClerk ? "border-slate-100 text-slate-500" : "border-slate-800 text-slate-400"
            }`}>
              <span>Showing up to 50 recent write-off entries from <code>audit_log</code>.</span>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors ${
                  isClerk ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
