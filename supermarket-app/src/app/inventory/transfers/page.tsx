"use client";

import React, { useState, useEffect } from "react";
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
  ChevronRight,
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
  details: {
    event?: string;
    from_branch_id?: number;
    to_branch_id?: number;
    product_id?: number;
    quantity?: number;
  };
}

export default function StockTransfersPage() {
  const { currentEmployee, currentBranch, branches, showToast } = useApp();

  const [fromBranchId, setFromBranchId] = useState<number>(currentBranch?.branch_id || 1);
  const [toBranchId, setToBranchId] = useState<number>(2);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [transferQty, setTransferQty] = useState<number | "">("");
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);

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
        showToast(data.message || "Stock transferred successfully via sp_transfer_stock!", "success");
        setTransferQty("");
        setSelectedProductId("");
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

  const getBranchName = (bId?: number) => {
    if (!bId) return "—";
    const found = branches.find((b) => b.branch_id === bId);
    return found ? found.name : `Branch #${bId}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1">
            <Boxes className="w-4 h-4" />
            <span>ADBMS Stock Clerk Module</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-300">sp_transfer_stock</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Inter-Branch Stock Transfers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Execute safe transactional stock relocation between supermarket branches using database row-locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventory"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Boxes className="w-4 h-4 text-slate-400" />
            <span>Inventory Grid</span>
          </Link>
          <Link
            href="/inventory/stock-alerts"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Stock Alerts</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Transfer Form + History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transfer Action Card */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-teal-400" />
              <span>New Stock Relocation</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              ACID Safe
            </span>
          </div>

          <form onSubmit={handleTransfer} className="space-y-4">
            {/* From -> To Branches */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Source Branch
                </label>
                <select
                  value={fromBranchId}
                  onChange={(e) => setFromBranchId(Number(e.target.value))}
                  disabled={currentEmployee?.role !== "ADMIN"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-medium disabled:opacity-60"
                >
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Destination Branch
                </label>
                <select
                  value={toBranchId}
                  onChange={(e) => setToBranchId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 font-medium"
                >
                  {branches
                    .filter((b) => b.branch_id !== fromBranchId)
                    .map((b) => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Product Picker */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Select Product to Relocate
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Choose product with available stock --</option>
                {products
                  .filter((p) => p.quantity_on_hand > 0)
                  .map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_name} ({p.quantity_on_hand} in stock)
                    </option>
                  ))}
              </select>
            </div>

            {/* Stock Details preview */}
            {selectedProduct && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Product:</span>
                  <span className="font-semibold text-white">{selectedProduct.product_name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Barcode:</span>
                  <span className="font-mono text-slate-300">{selectedProduct.barcode}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Source Stock Available:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {selectedProduct.quantity_on_hand} units
                  </span>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Quantity to Transfer
              </label>
              <input
                type="number"
                min={1}
                max={selectedProduct ? selectedProduct.quantity_on_hand : 9999}
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 20"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedProductId || !transferQty}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing sp_transfer_stock...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Execute Inter-Branch Transfer</span>
                </>
              )}
            </button>
          </form>

          {/* ADBMS Technical Badge */}
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Database Transaction:</strong> Uses row-level locks (<code>FOR UPDATE</code>) to guarantee atomic balance deduction from Source Branch and credit to Target Branch without race conditions.
            </div>
          </div>
        </div>

        {/* Transfer History Table */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white">Transfer Audit Log</h2>
            </div>
            <button
              onClick={fetchTransferLogs}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">From $\rightarrow$ To</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-teal-400" />
                      Loading transfer history...
                    </td>
                  </tr>
                ) : transferLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No stock transfers recorded yet for this branch.
                    </td>
                  </tr>
                ) : (
                  transferLogs.map((log) => {
                    const fromName = getBranchName(log.details?.from_branch_id);
                    const toName = getBranchName(log.details?.to_branch_id);

                    return (
                      <tr key={log.log_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(log.changed_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-200">
                            <span>{fromName}</span>
                            <ArrowRight className="w-3 h-3 text-teal-400" />
                            <span className="text-teal-300">{toName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          Product #{log.details?.product_id}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/30">
                            {log.details?.quantity} units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                          {log.changed_by}
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
