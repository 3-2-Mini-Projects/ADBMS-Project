"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { PurchaseOrder } from "@/lib/types";
import {
  FileSpreadsheet,
  Plus,
  Truck,
  CheckCircle2,
  Calendar,
  DollarSign,
  PackageCheck,
  Sparkles,
  X,
  Layers,
} from "lucide-react";

export default function PurchasesPage() {
  const { currentBranch, showToast, currentEmployee } = useApp();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create PO Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poItems, setPoItems] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([
    { product_id: "", quantity: 50, unit_cost: 200 },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // Receive PO Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [batchExpiryDate, setBatchExpiryDate] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  useEffect(() => {
    setBatchExpiryDate(
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases");
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setSuppliers(d));
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setProducts(d));
  }, []);

  const handleAddItemRow = () => {
    setPoItems([...poItems, { product_id: "", quantity: 20, unit_cost: 150 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !currentBranch) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: Number(supplierId),
          branch_id: currentBranch.branch_id,
          expected_date: expectedDate || null,
          created_by: currentEmployee?.employee_id || 1,
          items: poItems.filter((it) => it.product_id),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Purchase Order ${data.po_number} created!`, "success");
        setCreateModalOpen(false);
        fetchOrders();
      } else {
        showToast(data.error || "Failed to create PO", "error");
      }
    } catch {
      showToast("Error creating purchase order", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleReceivePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    setIsReceiving(true);
    try {
      const res = await fetch(`/api/purchases/${selectedPO.po_id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiry_date: batchExpiryDate,
          received_by: currentEmployee?.employee_id || 1,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`PO ${selectedPO.po_number} received! Stock & batches updated.`, "success");
        setReceiveModalOpen(false);
        fetchOrders();
      } else {
        showToast(data.error || "Failed to receive PO", "error");
      }
    } catch {
      showToast("Error receiving purchase order", "error");
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-teal-400" />
            <span>Purchase Orders & Supplier Inflow</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate replenishment purchase orders and receive stock into branch inventory & product batches.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">PO Number</th>
                <th className="py-3.5 px-4 font-semibold">Supplier</th>
                <th className="py-3.5 px-4 font-semibold">Branch</th>
                <th className="py-3.5 px-4 font-semibold">Order Date</th>
                <th className="py-3.5 px-4 font-semibold">Expected Date</th>
                <th className="py-3.5 px-4 font-semibold text-center">Items</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Cost</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-teal-400 mb-2" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.po_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-400">{po.po_number}</td>
                    <td className="py-3 px-4 text-white font-medium">{po.supplier_name}</td>
                    <td className="py-3 px-4 text-slate-300">{po.branch_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(po.order_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {(po as any).items_count || 1} lines
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      Rs. {Number(po.total_cost).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          po.status === "RECEIVED"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            : po.status === "PENDING"
                            ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                            : "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {po.status !== "RECEIVED" ? (
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setReceiveModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 mx-auto"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Receive Goods</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Fulfilled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Receive PO */}
      {receiveModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-teal-400" />
                <span>Receive Goods into Stock: {selectedPO.po_number}</span>
              </h3>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div>Supplier: <strong className="text-white">{selectedPO.supplier_name}</strong></div>
              <div>Receiving Branch: <strong className="text-white">{selectedPO.branch_name}</strong></div>
              <div className="text-slate-400 text-[11px] pt-1">
                Receiving will add order quantities directly to branch inventory and register FIFO batch codes automatically.
              </div>
            </div>

            <form onSubmit={handleReceivePO} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Batch Expiry Date</label>
                <input
                  type="date"
                  required
                  value={batchExpiryDate}
                  onChange={(e) => setBatchExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReceiving}
                  className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {isReceiving ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm Receipt & Update Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create PO */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Create Purchase Order</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Supplier</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name} ({s.supplier_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">Purchase Order Items</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    + Add Product Line
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].product_id = e.target.value;
                        setPoItems(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name} ({p.barcode})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].quantity = Number(e.target.value);
                        setPoItems(updated);
                      }}
                      className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                    />

                    <input
                      type="number"
                      placeholder="Unit Cost"
                      value={item.unit_cost}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].unit_cost = Number(e.target.value);
                        setPoItems(updated);
                      }}
                      className="w-28 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                    />

                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  {isCreating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Generate Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
