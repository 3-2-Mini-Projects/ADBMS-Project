"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  ArrowLeftRight,
  Boxes,
  Store,
  RefreshCw,
  Send,
  History,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  Package,
} from "lucide-react";

interface ProductStock {
  product_id: number;
  product_name: string;
  barcode: string;
  quantity_on_hand: number;
  category_name?: string;
}

interface TransferLog {
  log_id: number;
  action: string;
  changed_by: string;
  changed_at: string;
  product_name?: string | null;
  barcode?: string | null;
  operator_name?: string | null;
  details: {
    event?: string;
    from_branch_id?: number;
    to_branch_id?: number;
    product_id?: number;
    quantity?: number;
    product_name?: string;
  };
}

export default function StockTransfersPage() {
  const { currentEmployee, currentBranch, branches, showToast } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

  const [fromBranchId, setFromBranchId] = useState<number>(currentBranch?.branch_id || 1);
  const [toBranchId, setToBranchId] = useState<number>(2);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [transferQty, setTransferQty] = useState<number | "">("");
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync initial branch from context
  useEffect(() => {
    if (currentBranch?.branch_id) {
      setFromBranchId(currentBranch.branch_id);
      const other = branches.find((b) => b.branch_id !== currentBranch.branch_id);
      if (other) setToBranchId(other.branch_id);
    }
  }, [currentBranch, branches]);

  // Load products available at source branch
  const fetchSourceInventory = async () => {
    if (!fromBranchId) return;
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/inventory?branchId=${fromBranchId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch {
      showToast("Failed to fetch branch inventory", "error");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load transfer audit logs
  const fetchTransferLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/inventory/transfers?branchId=${fromBranchId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransferLogs(data);
      }
    } catch {
      console.warn("Could not load transfer history");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSourceInventory();
    fetchTransferLogs();
  }, [fromBranchId]);

  const selectedProduct = products.find((p) => p.product_id === Number(selectedProductId));

  const availableProducts = useMemo(() => {
    return products.filter((p) => p.quantity_on_hand > 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const term = productSearch.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.product_name.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term) ||
        (p.category_name && p.category_name.toLowerCase().includes(term))
    );
  }, [availableProducts, productSearch]);

  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return transferLogs;
    const term = logSearch.toLowerCase();
    return transferLogs.filter((log) => {
      const pName = log.product_name || `Product #${log.details?.product_id}`;
      const op = log.operator_name || log.changed_by;
      const bcode = log.barcode || "";
      return (
        pName.toLowerCase().includes(term) ||
        op.toLowerCase().includes(term) ||
        bcode.toLowerCase().includes(term)
      );
    });
  }, [transferLogs, logSearch]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBranchId || !toBranchId || !selectedProductId || !transferQty) {
      showToast("Please fill in all transfer fields", "error");
      return;
    }

    if (fromBranchId === toBranchId) {
      showToast("Source and destination branch cannot be the same", "error");
      return;
    }

    if (selectedProduct && Number(transferQty) > selectedProduct.quantity_on_hand) {
      showToast(
        `Cannot transfer ${transferQty}. Source only has ${selectedProduct.quantity_on_hand} available.`,
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_branch_id: fromBranchId,
          to_branch_id: toBranchId,
          product_id: Number(selectedProductId),
          quantity: Number(transferQty),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Stock transferred successfully!", "success");
        setTransferQty("");
        setSelectedProductId("");
        setProductSearch("");
        fetchSourceInventory();
        fetchTransferLogs();
      } else {
        showToast(data.error || "Failed to execute transfer", "error");
      }
    } catch {
      showToast("Network error executing transfer", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getBranch = (bId?: number) => {
    if (!bId) return null;
    return branches.find((b) => b.branch_id === bId) || null;
  };

  const fromBranch = getBranch(fromBranchId);
  const toBranch = getBranch(toBranchId);

  // Quick preset helper
  const applyPreset = (amount: number | "max") => {
    if (!selectedProduct) return;
    if (amount === "max") {
      setTransferQty(selectedProduct.quantity_on_hand);
    } else {
      const clamped = Math.min(amount, selectedProduct.quantity_on_hand);
      setTransferQty(clamped);
    }
  };

  const isQtyInvalid = selectedProduct
    ? Number(transferQty) <= 0 || Number(transferQty) > selectedProduct.quantity_on_hand
    : false;

  // Theme configuration: supports light theme for Stock Clerk while keeping dark theme for Admin
  const theme = {
    wrapper: "space-y-6 max-w-7xl mx-auto pb-14 animate-in fade-in duration-300 text-slate-800",
    headerBorder: "border-slate-200",
    title: "text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3",
    subtitle: "text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium",
    navLink: "px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-2xs",
    alertLink: "px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all flex items-center gap-2 shadow-2xs",
    card: "bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5",
    kpiCard: "bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs hover:border-slate-300 transition-colors",
    cardHeaderBorder: "border-slate-100",
    cardTitle: "text-sm font-bold text-slate-900",
    cardSubtext: "text-[11px] text-slate-500",
    corridorBox: "grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200",
    select: "w-full px-2.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 font-medium focus:outline-none focus:border-teal-600 disabled:opacity-75 disabled:cursor-not-allowed shadow-2xs",
    prodSelect: "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-600 font-medium shadow-2xs",
    searchInput: "w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 shadow-2xs",
    snapshotBox: "p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3.5 animate-in fade-in duration-200",
    presetBtn: "flex-1 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-[11px] font-mono font-bold text-slate-700 hover:text-slate-900 transition-colors shadow-2xs",
    presetMaxBtn: "px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-[11px] font-mono font-bold text-white transition-colors shadow-2xs",
    calcBox: "p-2.5 rounded-lg bg-white border border-teal-100 text-[11px] space-y-1 shadow-2xs",
    input: "w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 shadow-2xs",
    acidBox: "pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80",
    historyCard: "lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col",
    historyHeaderBg: "p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50",
    historySearchInput: "pl-7 pr-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 w-36 sm:w-44 shadow-2xs",
    historyRefreshBtn: "p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all text-xs flex items-center gap-1.5 shadow-2xs",
    thead: "border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider",
    tbodyDivide: "divide-y divide-slate-100",
    rowHover: "hover:bg-slate-50 transition-colors",
    itemText: "font-semibold text-slate-900 truncate max-w-[170px]",
    operatorPill: "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 font-medium",
    qtyBadge: "inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-mono font-bold text-xs",
  };

  return (
    <div className={theme.wrapper}>
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${theme.headerBorder} pb-6`}>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-teal-700 dark:text-teal-400 font-bold">Direct Branch Transfer</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className={isClerk ? "text-slate-600 font-medium" : "text-slate-400 font-medium"}>Atomic Stock Sync</span>
          </div>
          <h1 className={theme.title}>
            <ArrowLeftRight className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            <span>Inter-Branch Stock Transfers</span>
          </h1>
          <p className={theme.subtitle}>
            Execute ACID-compliant inventory relocations between branches. Deducts source inventory and credits target branch atomically.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/inventory"
            className={theme.navLink}
          >
            <Boxes className="w-4 h-4 text-slate-400" />
            <span>Inventory Grid</span>
          </Link>
          <Link
            href="/inventory/stock-alerts"
            className={theme.alertLink}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Stock Alerts</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Origin Branch */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Origin Branch</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isClerk ? "bg-teal-50 border border-teal-200 text-teal-700" : "bg-teal-500/10 border border-teal-500/20 text-teal-400"
            }`}>
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-base font-bold truncate ${isClerk ? "text-slate-900" : "text-white"}`}>
            {fromBranch?.name ?? "Select Branch"}
          </div>
          <div className="text-[11px] font-mono text-teal-600 dark:text-teal-400 mt-0.5 flex items-center gap-1.5 font-semibold">
            <span>Code: {fromBranch?.branch_code ?? "—"}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 dark:text-slate-400">{fromBranch?.city ?? "Local"}</span>
          </div>
        </div>

        {/* Transferable SKUs */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Transferable SKUs</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isClerk ? "bg-indigo-50 border border-indigo-200 text-indigo-700" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
            }`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-xl font-bold font-mono ${isClerk ? "text-slate-900" : "text-white"}`}>
            {loadingProducts ? "—" : availableProducts.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Products with available stock at origin
          </div>
        </div>

        {/* Target Branch */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Target Destination</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isClerk ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
            }`}>
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-base font-bold truncate ${isClerk ? "text-slate-900" : "text-white"}`}>
            {toBranch?.name ?? "Select Target"}
          </div>
          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1.5 font-semibold">
            <span>Code: {toBranch?.branch_code ?? "—"}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 dark:text-slate-400">{toBranch?.city ?? "Target"}</span>
          </div>
        </div>

        {/* Total Relocations Logged */}
        <div className={theme.kpiCard}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Transfer Audit Entries</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isClerk ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}>
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-xl font-bold font-mono ${isClerk ? "text-slate-900" : "text-white"}`}>
            {loadingLogs ? "—" : transferLogs.length}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
            Verified atomic transactions logged
          </div>
        </div>
      </div>

      {/* Main Grid: Transfer Form + History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Transfer Action Card */}
        <div className={`lg:col-span-5 ${theme.card}`}>
          <div className={`flex items-center justify-between border-b ${theme.cardHeaderBorder} pb-4`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isClerk ? "bg-teal-50 border border-teal-200 text-teal-700" : "bg-teal-500/15 border border-teal-500/30 text-teal-400"
              }`}>
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className={theme.cardTitle}>New Stock Relocation</h2>
                <div className={theme.cardSubtext}>Dispatch stock between registered branches</div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>ACID Safe</span>
            </span>
          </div>

          <form onSubmit={handleTransfer} className="space-y-4.5">
            {/* Visual Corridor: From & To */}
            <div className="space-y-2">
              <div className={`flex items-center justify-between text-xs font-semibold ${isClerk ? "text-slate-700" : "text-slate-300"}`}>
                <span>Transfer Corridor</span>
                <span className="text-[10px] text-slate-500 font-mono">Real-time DB Route</span>
              </div>
              <div className={theme.corridorBox}>
                {/* Source Branch */}
                <div>
                  <label className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider block mb-1">
                    Origin Branch
                  </label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => {
                      setFromBranchId(Number(e.target.value));
                      setSelectedProductId("");
                      setTransferQty("");
                    }}
                    disabled={currentEmployee?.role !== "ADMIN"}
                    className={theme.select}
                  >
                    {branches.map((b) => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.name} ({b.branch_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Branch */}
                <div>
                  <label className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider block mb-1">
                    Destination Branch
                  </label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(Number(e.target.value))}
                    className={theme.select}
                  >
                    {branches
                      .filter((b) => b.branch_id !== fromBranchId)
                      .map((b) => (
                        <option key={b.branch_id} value={b.branch_id}>
                          {b.name} ({b.branch_code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Product Picker */}
            <div className="space-y-1.5">
              <div className={`flex items-center justify-between text-xs font-semibold ${isClerk ? "text-slate-700" : "text-slate-300"}`}>
                <label htmlFor="product-select">Select Product</label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {filteredProducts.length} available
                </span>
              </div>

              {/* Optional Search filter if there are many products */}
              {availableProducts.length > 5 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product by name or barcode..."
                    className={theme.searchInput}
                  />
                </div>
              )}

              <select
                id="product-select"
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value ? Number(e.target.value) : "");
                  setTransferQty("");
                }}
                className={theme.prodSelect}
              >
                <option value="">-- Choose product from source inventory --</option>
                {filteredProducts.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} — [{p.quantity_on_hand} available] ({p.barcode})
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Selected Product Snapshot & Presets */}
            {selectedProduct && (
              <div className={theme.snapshotBox}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isClerk ? "text-slate-900" : "text-white"}`}>
                      <span>{selectedProduct.product_name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Barcode: <span className={isClerk ? "text-slate-800 font-semibold" : "text-slate-300"}>{selectedProduct.barcode}</span>
                      {selectedProduct.category_name && (
                        <> · <span className="text-teal-600 dark:text-teal-400 font-semibold">{selectedProduct.category_name}</span></>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Available</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {selectedProduct.quantity_on_hand}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">units</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>Quick Fill Quantity:</span>
                    {selectedProduct.quantity_on_hand > 0 && (
                      <button
                        type="button"
                        onClick={() => applyPreset("max")}
                        className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-mono font-bold"
                      >
                        Transfer Max ({selectedProduct.quantity_on_hand})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {[5, 10, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        disabled={selectedProduct.quantity_on_hand < preset}
                        className={theme.presetBtn}
                      >
                        +{preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => applyPreset("max")}
                      className={theme.presetMaxBtn}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Real-time After Balance Preview */}
                {Number(transferQty) > 0 && (
                  <div className={theme.calcBox}>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Source Remaining:</span>
                      <span className={`font-mono font-bold ${
                        selectedProduct.quantity_on_hand - Number(transferQty) < 0
                          ? "text-rose-600 font-black"
                          : isClerk ? "text-slate-800" : "text-slate-200"
                      }`}>
                        {selectedProduct.quantity_on_hand - Number(transferQty)} units
                      </span>
                    </div>
                    {selectedProduct.quantity_on_hand - Number(transferQty) < 0 && (
                      <div className="text-[10px] text-rose-600 flex items-center gap-1 font-semibold pt-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>Cannot transfer more than available stock!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <label htmlFor="transfer-qty-input" className={`text-xs font-semibold block ${isClerk ? "text-slate-700" : "text-slate-300"}`}>
                Quantity to Relocate
              </label>
              <div className="relative">
                <input
                  id="transfer-qty-input"
                  type="number"
                  min={1}
                  max={selectedProduct ? selectedProduct.quantity_on_hand : 9999}
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Enter unit quantity..."
                  className={theme.input}
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400 pointer-events-none">
                  Units
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedProductId || !transferQty || isQtyInvalid}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Transfer...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Execute Inter-Branch Transfer</span>
                </>
              )}
            </button>
          </form>

          {/* ADBMS Technical Info Footer */}
          <div className={theme.acidBox}>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className={isClerk ? "text-slate-900 font-bold" : "text-slate-200"}>ACID Transaction Guarantee:</strong> Uses row-level locks (<code className="text-teal-700 dark:text-teal-300 font-bold">FOR UPDATE</code>) to guarantee atomic balance deduction from Source Branch and credit to Destination Branch without race conditions.
            </div>
          </div>
        </div>

        {/* Transfer History Table */}
        <div className={theme.historyCard}>
          {/* Header & Search */}
          <div className={theme.historyHeaderBg}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isClerk ? "bg-teal-50 border border-teal-200 text-teal-700" : "bg-teal-500/15 border border-teal-500/30 text-teal-400"
              }`}>
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className={theme.cardTitle}>Transfer Audit Log</h2>
                <div className={theme.cardSubtext}>Immutable record of branch transfers</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter audit log..."
                  className={theme.historySearchInput}
                />
              </div>
              <button
                onClick={fetchTransferLogs}
                disabled={loadingLogs}
                className={theme.historyRefreshBtn}
                title="Refresh audit log"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin text-teal-600" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={theme.thead}>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Route (From $\rightarrow$ To)</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Operator</th>
                </tr>
              </thead>
              <tbody className={theme.tbodyDivide}>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600 dark:text-teal-400" />
                      Loading transfer history...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-slate-500">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 mx-auto mb-2.5">
                        <ArrowLeftRight className="w-5 h-5" />
                      </div>
                      <div className="font-semibold text-slate-600 dark:text-slate-400">No transfer records found</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        {logSearch ? "Try clearing your search filter" : "Execute a stock relocation above to create the first record"}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const fromName = getBranch(log.details?.from_branch_id)?.name || `Branch #${log.details?.from_branch_id}`;
                    const toName = getBranch(log.details?.to_branch_id)?.name || `Branch #${log.details?.to_branch_id}`;
                    const displayProduct = log.product_name || `Product #${log.details?.product_id}`;
                    const displayOperator = log.operator_name || log.changed_by;

                    return (
                      <tr key={log.log_id} className={theme.rowHover}>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(log.changed_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <span className={isClerk ? "text-slate-800 font-semibold" : "text-slate-300 font-semibold"}>{fromName}</span>
                            <ArrowRight className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="text-teal-700 dark:text-teal-300 font-bold">{toName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className={theme.itemText} title={displayProduct}>
                            {displayProduct}
                          </div>
                          {log.barcode ? (
                            <div className="text-[10px] font-mono text-slate-400">{log.barcode}</div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-400">ID #{log.details?.product_id}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className={theme.qtyBadge}>
                            {log.details?.quantity} units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className={theme.operatorPill}>
                            {displayOperator}
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
    </div>
  );
}
