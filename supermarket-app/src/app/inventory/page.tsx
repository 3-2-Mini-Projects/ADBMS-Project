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
  const { currentBranch, showToast } = useApp();
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-indigo-400" />
            <span>Inventory & Batch Expiry Tracking</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track branch quantities, reorder thresholds, and FIFO expiry date rotations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBatchModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/40 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Receive New Batch</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "stock"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Branch Stock Levels ({inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "batches"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock by product name, barcode, or brand..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500"
              />
            </form>

            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                lowStockOnly
                  ? "bg-amber-950/60 border-amber-600 text-amber-300"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Low Stock Alerts Only</span>
            </button>
          </div>

          {/* Stock Table */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">Barcode</th>
                    <th className="py-3.5 px-4 font-semibold">Product Name</th>
                    <th className="py-3.5 px-4 font-semibold">Branch</th>
                    <th className="py-3.5 px-4 font-semibold">Category</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Available Qty</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Reorder Level</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Selling Price</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingStock ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Sparkles className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-2" />
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
                      <tr key={item.inventory_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{item.barcode}</td>
                        <td className="py-3 px-4 font-medium text-white">{item.product_name}</td>
                        <td className="py-3 px-4 text-slate-300">{item.branch_name}</td>
                        <td className="py-3 px-4 text-slate-400">{item.category_name || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              item.quantity_on_hand <= 0
                                ? "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                                : item.quantity_on_hand <= item.reorder_level
                                ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                                : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            }`}
                          >
                            {item.quantity_on_hand <= 0
                              ? "OUT OF STOCK"
                              : item.quantity_on_hand <= item.reorder_level
                              ? "LOW STOCK"
                              : "IN STOCK"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                          {item.quantity_on_hand}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {item.reorder_level}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
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
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
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
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Batch No</th>
                  <th className="py-3.5 px-4 font-semibold">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold">Branch</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Quantity</th>
                  <th className="py-3.5 px-4 font-semibold">Received Date</th>
                  <th className="py-3.5 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Expiry Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
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
                    <tr key={b.batch_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{b.batch_no}</td>
                      <td className="py-3 px-4 font-medium text-white">{b.product_name}</td>
                      <td className="py-3 px-4 text-slate-300">{b.branch_name}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {b.quantity}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {b.received_date ? new Date(b.received_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : "No Expiry"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            b.expiry_status === "EXPIRED"
                              ? "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                              : b.expiry_status === "NEAR_EXPIRY"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/60 animate-pulse"
                              : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>Adjust Stock & Reorder Level</span>
              </h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-white">{selectedItem.product_name}</div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Current Stock ({selectedItem.branch_name}):</span>
                <span className="font-bold text-white">{selectedItem.quantity_on_hand} units</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Current Reorder Level:</span>
                <span className="font-bold text-amber-400">{selectedItem.reorder_level} units</span>
              </div>
              {quantityChange !== "" && !isNaN(Number(quantityChange)) && Number(quantityChange) !== 0 && (
                <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-blue-400">Resulting Stock:</span>
                  <span className="font-bold text-emerald-400">
                    {Math.max(0, Number(selectedItem.quantity_on_hand) + Number(quantityChange))} units
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Quantity Change <span className="text-slate-500 font-normal">(enter 0 or leave empty to keep current stock)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. +10, -5, or 0"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm font-bold placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Reorder Level Threshold <span className="text-slate-500 font-normal">(triggers Low Stock alert)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Register Product Batch</span>
              </h3>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Product</label>
                <select
                  required
                  value={newBatch.product_id}
                  onChange={(e) => setNewBatch({ ...newBatch, product_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
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
                <label className="text-xs text-slate-300 block mb-1">Batch Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MILK-B2"
                  value={newBatch.batch_no}
                  onChange={(e) => setNewBatch({ ...newBatch, batch_no: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Batch Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="50"
                  value={newBatch.quantity}
                  onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={newBatch.expiry_date}
                  onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingBatch}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
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
