"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { InventoryItem, ProductBatch } from "@/lib/types";
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  Plus,
  Edit2,
  CheckCircle2,
  Clock,
  Layers,
  Store,
  Sparkles,
  X,
} from "lucide-react";

export default function InventoryPage() {
  const { currentBranch, currentEmployee, showToast } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";
  const [activeTab, setActiveTab] = useState<"stock" | "batches">("stock");

  // Stock State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Batches State
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityChange, setQuantityChange] = useState<string>("0");
  const [reorderLevel, setReorderLevel] = useState<string>("10");
  const [adjustmentReason, setAdjustmentReason] = useState("Inventory recount / adjustment");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Add Batch Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    product_id: "",
    batch_no: "",
    quantity: "",
    received_date: "",
    expiry_date: "",
  });
  const [isAddingBatch, setIsAddingBatch] = useState(false);

  useEffect(() => {
    setNewBatch((prev) => ({
      ...prev,
      received_date: new Date().toISOString().split("T")[0],
    }));
  }, []);

  const fetchStock = async () => {
    setLoadingStock(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
      if (lowStockOnly) params.append("lowStock", "true");
      if (search.trim()) params.append("search", search.trim());
      params.append("_t", String(Date.now()));

      const res = await fetch(`/api/inventory?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setInventory(data);
    } catch (err) {
      console.error("Error fetching stock:", err);
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
      params.append("_t", String(Date.now()));

      const res = await fetch(`/api/inventory/batches?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setBatches(data);
    } catch (err) {
      console.error("Error fetching batches:", err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchStock();
    fetchBatches();
  }, [currentBranch, lowStockOnly]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsAdjusting(true);
    try {
      const payload: any = {
        inventory_id: selectedItem.inventory_id,
        reason: adjustmentReason || "Inventory recount / adjustment",
      };

      if (quantityChange !== "" && !isNaN(Number(quantityChange))) {
        payload.quantity_change = Number(quantityChange);
      } else {
        payload.quantity_change = 0;
      }

      if (reorderLevel !== "" && !isNaN(Number(reorderLevel))) {
        payload.reorder_level = Number(reorderLevel);
      }

      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Updated stock & reorder level for ${selectedItem.product_name}!`, "success");
        setAdjustModalOpen(false);
        fetchStock();
      } else {
        showToast(data.error || "Adjustment failed", "error");
      }
    } catch {
      showToast("Error updating stock", "error");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch) return;
    setIsAddingBatch(true);
    try {
      const res = await fetch("/api/inventory/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newBatch,
          branch_id: currentBranch.branch_id,
          quantity: Number(newBatch.quantity),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("New product batch registered and added to stock!", "success");
        setBatchModalOpen(false);
        fetchBatches();
        fetchStock();
      } else {
        showToast(data.error || "Failed to add batch", "error");
      }
    } catch {
      showToast("Error registering batch", "error");
    } finally {
      setIsAddingBatch(false);
    }
  };

  const theme = {
    wrapper: isClerk
      ? "space-y-6 animate-in fade-in duration-300 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-6 animate-in fade-in duration-300 text-slate-100",
    title: isClerk ? "text-2xl font-black text-slate-900 flex items-center gap-2.5" : "text-2xl font-black text-white flex items-center gap-2.5",
    subtitle: isClerk ? "text-xs text-slate-500 mt-1" : "text-xs text-slate-400 mt-1",
    tabBorder: isClerk ? "border-slate-200" : "border-slate-800",
    tabInactive: isClerk
      ? "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-sm"
      : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white",
    searchBox: isClerk
      ? "w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 font-mono shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
      : "w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 font-mono focus:border-blue-500 focus:outline-none transition-colors",
    searchIcon: isClerk ? "text-slate-400" : "text-slate-500",
    filterBtnInactive: isClerk
      ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white",
    filterBtnActive: isClerk
      ? "bg-amber-100 border-amber-400 text-amber-900 shadow-sm"
      : "bg-amber-500/20 border-amber-500/50 text-amber-300",
    tableCard: isClerk
      ? "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      : "glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl",
    thead: isClerk
      ? "border-b border-slate-200 bg-slate-50/80 text-slate-600 uppercase text-[11px] font-semibold tracking-wider"
      : "border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[11px] font-semibold tracking-wider",
    tbodyDivide: isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/60",
    rowHover: isClerk ? "hover:bg-blue-50/30 transition-colors" : "hover:bg-slate-800/40 transition-colors",
    barcode: isClerk ? "text-blue-600 font-bold" : "text-blue-400 font-bold",
    productName: isClerk ? "font-semibold text-slate-900" : "font-semibold text-white",
    branchText: isClerk ? "text-slate-600" : "text-slate-300",
    categoryText: isClerk ? "text-slate-500" : "text-slate-400",
    qtyText: isClerk ? "text-slate-900" : "text-white",
    reorderText: isClerk ? "text-slate-500 font-semibold" : "text-slate-400 font-semibold",
    priceText: isClerk ? "text-emerald-700 font-bold" : "text-emerald-400 font-bold",
    actionBtn: isClerk
      ? "p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white border border-slate-200 transition-colors"
      : "p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-colors",
    badgeInStock: isClerk
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-emerald-950/70 text-emerald-400 border border-emerald-800/60",
    badgeLowStock: isClerk
      ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
      : "bg-amber-950/70 text-amber-400 border border-amber-800/60 animate-pulse",
    badgeOutOfStock: isClerk
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-rose-950/70 text-rose-400 border border-rose-800/60",
    batchNo: isClerk ? "text-indigo-600 font-bold" : "text-indigo-400 font-bold",
    modalOverlay: isClerk
      ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      : "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200",
    modalCard: isClerk
      ? "bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-900"
      : "bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white",
    modalHeaderBorder: isClerk ? "border-slate-100" : "border-slate-800",
    modalTitle: isClerk ? "text-slate-900 font-bold text-sm flex items-center gap-2" : "text-white font-bold text-sm flex items-center gap-2",
    modalInfoBox: isClerk
      ? "bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5"
      : "bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5",
    modalLabel: isClerk ? "text-xs font-semibold text-slate-700 block mb-1" : "text-xs text-slate-300 block mb-1",
    modalInput: isClerk
      ? "w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-sm font-bold placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
      : "w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm font-bold focus:outline-none focus:border-blue-500",
    modalCancelBtn: isClerk
      ? "w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
      : "w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold",
  };

  return (
    <div className={theme.wrapper}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={theme.title}>
            <Boxes className="w-6 h-6 text-indigo-500" />
            <span>Inventory & Batch Expiry Tracking</span>
          </h1>
          <p className={theme.subtitle}>
            Track branch quantities, reorder thresholds, and FIFO expiry date rotations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBatchModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Receive New Batch</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-3 border-b ${theme.tabBorder} pb-3`}>
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "stock"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : theme.tabInactive
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Branch Stock Levels ({inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "batches"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : theme.tabInactive
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Product Batches & Expiry ({batches.length})</span>
        </button>
      </div>

      {activeTab === "stock" ? (
        <div className="space-y-4">
          {/* Stock Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchStock();
              }}
              className="relative flex-1 w-full"
            >
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.searchIcon}`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock by product name, barcode, or brand..."
                className={theme.searchBox}
              />
            </form>

            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                lowStockOnly ? theme.filterBtnActive : theme.filterBtnInactive
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low Stock Alerts Only</span>
            </button>
          </div>

          {/* Stock Table */}
          <div className={theme.tableCard}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={theme.thead}>
                    <th className="py-3.5 px-4">Barcode</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Branch</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Available Qty</th>
                    <th className="py-3.5 px-4 text-right">Reorder Level</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={theme.tbodyDivide}>
                  {loadingStock ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Sparkles className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                        Loading stock levels...
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        No inventory items matching filter.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr key={item.inventory_id} className={theme.rowHover}>
                        <td className={`py-3 px-4 font-mono ${theme.barcode}`}>{item.barcode}</td>
                        <td className={`py-3 px-4 ${theme.productName}`}>
                          <div className="font-semibold">{item.product_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">
                              Velocity: {Number((item as any).sales_velocity ?? 0).toFixed(2)}/day
                            </span>
                            {Number((item as any).suggested_reorder_qty) > 0 && (
                              <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                Suggest: +{(item as any).suggested_reorder_qty}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-3 px-4 ${theme.branchText}`}>{item.branch_name}</td>
                        <td className={`py-3 px-4 ${theme.categoryText}`}>{item.category_name || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              item.quantity_on_hand <= 0
                                ? theme.badgeOutOfStock
                                : item.quantity_on_hand <= item.reorder_level
                                ? theme.badgeLowStock
                                : theme.badgeInStock
                            }`}
                          >
                            {item.quantity_on_hand <= 0
                              ? "OUT OF STOCK"
                              : item.quantity_on_hand <= item.reorder_level
                              ? "LOW STOCK"
                              : "IN STOCK"}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-black ${theme.qtyText} text-sm`}>
                          {item.quantity_on_hand}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono ${theme.reorderText}`}>
                          {item.reorder_level}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono ${theme.priceText}`}>
                          Rs. {Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setQuantityChange("0");
                              setReorderLevel(String(item.reorder_level ?? 10));
                              setAdjustmentReason("Inventory recount / adjustment");
                              setAdjustModalOpen(true);
                            }}
                            className={theme.actionBtn}
                            title="Adjust Stock & Reorder Level"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Batches & Expiry Tab */
        <div className={theme.tableCard}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={theme.thead}>
                  <th className="py-3.5 px-4 font-semibold">Batch No</th>
                  <th className="py-3.5 px-4 font-semibold">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold">Branch</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Quantity</th>
                  <th className="py-3.5 px-4 font-semibold">Received Date</th>
                  <th className="py-3.5 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Expiry Status</th>
                </tr>
              </thead>
              <tbody className={theme.tbodyDivide}>
                {loadingBatches ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Loading batches...
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No product batches found.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.batch_id} className={theme.rowHover}>
                      <td className={`py-3 px-4 font-mono ${theme.batchNo}`}>{b.batch_no}</td>
                      <td className={`py-3 px-4 ${theme.productName}`}>{b.product_name}</td>
                      <td className={`py-3 px-4 ${theme.branchText}`}>{b.branch_name}</td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${theme.qtyText}`}>
                        {b.quantity}
                      </td>
                      <td className={`py-3 px-4 font-mono ${theme.categoryText}`}>
                        {b.received_date ? new Date(b.received_date).toLocaleDateString() : "—"}
                      </td>
                      <td className={`py-3 px-4 font-mono ${theme.branchText}`}>
                        {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : "No Expiry"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            b.expiry_status === "EXPIRED"
                              ? theme.badgeOutOfStock
                              : b.expiry_status === "NEAR_EXPIRY"
                              ? theme.badgeLowStock
                              : theme.badgeInStock
                          }`}
                        >
                          {b.expiry_status === "EXPIRED"
                            ? "EXPIRED"
                            : b.expiry_status === "NEAR_EXPIRY"
                            ? `EXPIRING (${b.days_to_expiry}d)`
                            : "FRESH / GOOD"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Adjust Stock & Reorder Level */}
      {adjustModalOpen && selectedItem && (
        <div className={theme.modalOverlay}>
          <div className={theme.modalCard}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme.modalHeaderBorder}`}>
              <h3 className={theme.modalTitle}>
                <Edit2 className="w-4 h-4 text-blue-500" />
                <span>Adjust Stock & Reorder Level</span>
              </h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={theme.modalInfoBox}>
              <div className="text-xs font-bold">{selectedItem.product_name}</div>
              <div className="flex justify-between text-[11px] opacity-80 font-mono">
                <span>Current Stock ({selectedItem.branch_name}):</span>
                <span className="font-black">{selectedItem.quantity_on_hand} units</span>
              </div>
              <div className="flex justify-between text-[11px] opacity-80 font-mono">
                <span>Current Reorder Level:</span>
                <span className="font-bold text-amber-500">{selectedItem.reorder_level} units</span>
              </div>
              {quantityChange !== "" && !isNaN(Number(quantityChange)) && Number(quantityChange) !== 0 && (
                <div className={`flex justify-between text-[11px] font-mono pt-1.5 border-t ${theme.modalHeaderBorder}`}>
                  <span className="text-blue-500 font-medium">Resulting Stock:</span>
                  <span className="font-black text-emerald-500">
                    {Math.max(0, Number(selectedItem.quantity_on_hand) + Number(quantityChange))} units
                  </span>
                </div>
              )}

              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1 text-[11px] mt-2">
                <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>ADBMS Analytics (UDF Functions)</span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>Sales Velocity (fn_product_sales_velocity):</span>
                  <span className="font-bold">{Number((selectedItem as any).sales_velocity || 0).toFixed(2)} units/day</span>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>Suggested Reorder (fn_suggested_reorder_qty):</span>
                  <span className="font-bold text-amber-400">+{Number((selectedItem as any).suggested_reorder_qty || 0)} units</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className={theme.modalLabel}>
                  Quantity Change <span className="opacity-60 font-normal">(enter 0 or leave empty to keep current stock)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. +10, -5, or 0"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  className={theme.modalInput}
                />
              </div>

              <div>
                <label className={theme.modalLabel}>
                  Reorder Level Threshold <span className="opacity-60 font-normal">(triggers Low Stock alert)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className={theme.modalInput}
                  required
                />
              </div>

              <div>
                <label className={theme.modalLabel}>Audit Reason</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className={theme.modalInput}
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className={theme.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                >
                  Confirm Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Batch */}
      {batchModalOpen && (
        <div className={theme.modalOverlay}>
          <div className={theme.modalCard}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme.modalHeaderBorder}`}>
              <h3 className={theme.modalTitle}>
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>Register Product Batch</span>
              </h3>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4">
              <div>
                <label className={theme.modalLabel}>Product</label>
                <select
                  required
                  value={newBatch.product_id}
                  onChange={(e) => setNewBatch({ ...newBatch, product_id: e.target.value })}
                  className={theme.modalInput}
                >
                  <option value="">Select Product</option>
                  {inventory.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.product_name} ({item.barcode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={theme.modalLabel}>Batch Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MILK-B2"
                  value={newBatch.batch_no}
                  onChange={(e) => setNewBatch({ ...newBatch, batch_no: e.target.value })}
                  className={theme.modalInput}
                />
              </div>

              <div>
                <label className={theme.modalLabel}>Batch Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="50"
                  value={newBatch.quantity}
                  onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
                  className={theme.modalInput}
                />
              </div>

              <div>
                <label className={theme.modalLabel}>Expiry Date</label>
                <input
                  type="date"
                  value={newBatch.expiry_date}
                  onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                  className={theme.modalInput}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className={theme.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingBatch}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                >
                  Save Batch & Increase Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
