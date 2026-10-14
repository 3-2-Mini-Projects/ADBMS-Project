"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { ReturnItem } from "@/lib/types";
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Receipt,
  User,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function ReturnsPage() {
  const { currentEmployee, showToast } = useApp();
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Return Workflow State
  const [saleSearchId, setSaleSearchId] = useState("");
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [searchingSale, setSearchingSale] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [reason, setReason] = useState("Damaged product");
  const [restock, setRestock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/returns");
      const data = await res.json();
      if (Array.isArray(data)) setReturns(data);
    } catch (err) {
      console.error("Error fetching returns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  // Search Sale items to return
  const searchSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleSearchId.trim()) return;
    setSearchingSale(true);
    setSelectedItem(null);
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(saleSearchId.trim())}`);
      const data = await res.json();
      if (data && data.items && data.items.length > 0) {
        setSaleItems(data.items);
        showToast(`Found Sale #${data.sale_id} with ${data.items.length} items.`, "success");
      } else {
        showToast("Sale not found or has no items.", "warning");
        setSaleItems([]);
      }
    } catch {
      showToast("Error searching sale.", "error");
    } finally {
      setSearchingSale(false);
    }
  };

  // Submit return
  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      showToast("Please select a sale item to return", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sale_item_id: selectedItem.sale_item_id,
          quantity: Number(returnQty),
          reason,
          processed_by: currentEmployee?.employee_id || 1,
          restock,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(`Return processed! Refund amount: Rs. ${Number(result.refund_amount).toFixed(2)}`, "success");
        setSelectedItem(null);
        setSaleItems([]);
        setSaleSearchId("");
        fetchReturns();
      } else {
        showToast(result.error || "Failed to process return", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to process return", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <RotateCcw className="w-6 h-6 text-rose-400" />
          <span>Returns & Customer Refunds</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Validate returned goods against original receipts, issue calculated refunds, and restock sellable inventory.
        </p>
      </div>

      {/* Process Return Action Form Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-400" />
          <span>Step 1: Look up Original Sale Receipt</span>
        </h2>

        <form onSubmit={searchSale} className="flex gap-3 max-w-md">
          <input
            type="number"
            value={saleSearchId}
            onChange={(e) => setSaleSearchId(e.target.value)}
            placeholder="Enter Sale ID (e.g. 1, 2)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={searchingSale}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Search Items</span>
          </button>
        </form>

        {/* Items from searched sale */}
        {saleItems.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-300">Step 2: Select Item to Return</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {saleItems.map((item) => (
                <button
                  type="button"
                  key={item.sale_item_id}
                  onClick={() => {
                    setSelectedItem(item);
                    setReturnQty(1);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedItem?.sale_item_id === item.sale_item_id
                      ? "bg-rose-950/40 border-rose-500/80 text-white"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-white">{item.product_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Barcode: {item.barcode} • Purchased Qty: {item.quantity}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      Rs. {Number(item.unit_price).toFixed(2)}
                    </div>
                    {selectedItem?.sale_item_id === item.sale_item_id && (
                      <span className="text-[10px] text-rose-400 font-bold">Selected</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Item Details & Submit */}
        {selectedItem && (
          <form onSubmit={handleProcessReturn} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 pt-4">
            <h3 className="text-xs font-bold text-rose-400">Step 3: Refund Specifications</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Return Quantity (Max: {selectedItem.quantity})</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.quantity}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Return Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Damaged product">Damaged product</option>
                  <option value="Expired before date">Expired before date</option>
                  <option value="Customer changed mind">Customer changed mind</option>
                  <option value="Incorrect item billed">Incorrect item billed</option>
                  <option value="Defective packaging">Defective packaging</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Restock into Inventory?</label>
                <label className="flex items-center gap-2 mt-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restock}
                    onChange={(e) => setRestock(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <span>Yes, return to sellable inventory</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Total Refund Due:</span>
                <span className="text-sm font-black font-mono text-rose-400 ml-2">
                  Rs. {(Number(selectedItem.unit_price) * returnQty).toFixed(2)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                {isSubmitting ? <Sparkles className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Authorize & Process Refund</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Historical Returns Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Returns & Refund Log</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">{returns.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-3 px-4 font-semibold">Return ID</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Sale Ref</th>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold text-center">Qty</th>
                <th className="py-3 px-4 font-semibold">Reason</th>
                <th className="py-3 px-4 font-semibold">Processed By</th>
                <th className="py-3 px-4 font-semibold text-right">Refund Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading returns log...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No returns processed yet.
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.return_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">#RET-{r.return_id}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(r.return_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-400">
                      {r.sale_id ? `#SALE-${r.sale_id}` : `Item #${r.sale_item_id}`}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">{r.product_name}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">{r.quantity}</td>
                    <td className="py-3 px-4 text-slate-300">{r.reason || "N/A"}</td>
                    <td className="py-3 px-4 text-slate-400">{r.processor_name || "Manager"}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      Rs. {Number(r.refund_amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
