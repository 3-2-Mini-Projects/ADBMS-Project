"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  Sparkles,
  ArrowRight,
  ClipboardCheck,
  TrendingUp,
  Package,
  DollarSign,
  Truck,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface ReorderItem {
  inventory_id: number;
  branch_id: number;
  branch_name: string;
  product_id: number;
  barcode: string;
  product_name: string;
  category_name?: string;
  supplier_name?: string;
  quantity_on_hand: number;
  reorder_level: number;
  unit_price: number | string;
  cost_price: number | string;
  stock_status: string;
  sales_velocity: number | string;
  suggested_reorder_qty: number;
}

export default function ReorderSuggestionsPage() {
  const { currentEmployee, currentBranch } = useApp();
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"recommended" | "all">("recommended");

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const branchParam = currentBranch ? `?branchId=${currentBranch.branch_id}` : "";
      const res = await fetch(`/api/inventory${branchParam}`);
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [currentBranch]);

  // Filter items: Recommended = either suggested_reorder_qty > 0 OR stock_status != NORMAL
  const filteredItems = items.filter((item) => {
    if (filterMode === "recommended") {
      return Number(item.suggested_reorder_qty) > 0 || item.stock_status !== "NORMAL";
    }
    return true;
  });

  const totalReplenishUnits = filteredItems.reduce(
    (sum, it) => sum + (Number(it.suggested_reorder_qty) > 0 ? Number(it.suggested_reorder_qty) : Math.max(0, it.reorder_level * 2 - it.quantity_on_hand)),
    0
  );

  const estimatedCost = filteredItems.reduce(
    (sum, it) => {
      const qty = Number(it.suggested_reorder_qty) > 0 ? Number(it.suggested_reorder_qty) : Math.max(0, it.reorder_level * 2 - it.quantity_on_hand);
      return sum + qty * Number(it.cost_price || 0);
    },
    0
  );

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <ClipboardCheck className="w-6 h-6 text-teal-400" />
              <span>Smart Reorder Replenishment</span>
            </h1>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
              UDF: fn_suggested_reorder_qty
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Automated stock replenishment advised by 30-day velocity, lead days, and safety stock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuggestions}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700/50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-400" : ""}`} />
            <span>Recalculate</span>
          </button>
          <Link
            href="/purchases"
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Open Purchase Orders</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 bg-slate-900/60 border border-slate-800 text-white">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Items Needing Restock</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-white">
            {items.filter((it) => it.stock_status !== "NORMAL" || Number(it.suggested_reorder_qty) > 0).length}
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-slate-900/60 border border-teal-500/20 text-white">
          <div className="flex justify-between items-center text-teal-400 text-xs">
            <span>Total Units to Order</span>
            <Package className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-teal-400">
            {totalReplenishUnits} units
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-slate-900/60 border border-emerald-500/20 text-white">
          <div className="flex justify-between items-center text-emerald-400 text-xs">
            <span>Est. Replenishment Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-emerald-400">
            Rs. {estimatedCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setFilterMode("recommended")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filterMode === "recommended"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Urgent & Recommended Restocks
        </button>
        <button
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filterMode === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All Product Catalog ({items.length})
        </button>
      </div>

      {/* Suggestions Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4 text-right">Available Stock</th>
                <th className="py-3.5 px-4 text-right">Reorder Level</th>
                <th className="py-3.5 px-4 text-right">Sales Velocity</th>
                <th className="py-3.5 px-4 text-center">Calculated Suggestion</th>
                <th className="py-3.5 px-4 text-right">Unit Cost</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-teal-400 mb-2" />
                    Calculating reorder requirements via fn_suggested_reorder_qty...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ClipboardCheck className="w-6 h-6 mx-auto text-emerald-500 mb-2 opacity-60" />
                    All products are adequately stocked! No reorders needed right now.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const qtyToOrder = Number(item.suggested_reorder_qty) > 0
                    ? Number(item.suggested_reorder_qty)
                    : Math.max(0, item.reorder_level * 2 - item.quantity_on_hand);

                  return (
                    <tr key={item.inventory_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{item.barcode} • {item.category_name || "General"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{item.supplier_name || "—"}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {item.quantity_on_hand}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {item.reorder_level}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-teal-400 font-semibold">
                        {Number(item.sales_velocity || 0).toFixed(2)}/day
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          +{qtyToOrder} units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        Rs. {Number(item.cost_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href="/purchases"
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold transition-all inline-flex items-center gap-1 shadow-sm"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Order</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
