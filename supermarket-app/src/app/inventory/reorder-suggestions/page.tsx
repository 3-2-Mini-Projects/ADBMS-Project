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
  RotateCcw,
  Pencil,
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
  supplier_id?: number;
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
  const isClerk = currentEmployee?.role === "STOCK_CLERK";
  const assignedBranchId = isClerk && currentEmployee?.branch_id
    ? currentEmployee.branch_id
    : currentBranch?.branch_id;

  const [items, setItems] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"recommended" | "all">("recommended");

  // Stock clerk manual overrides for reorder quantities
  const [customQuantities, setCustomQuantities] = useState<Record<number, number>>({});

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const branchParam = assignedBranchId ? `?branchId=${assignedBranchId}` : "";
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
  }, [assignedBranchId]);

  const getDefaultSuggestedQty = (item: ReorderItem): number => {
    return Number(item.suggested_reorder_qty) > 0
      ? Number(item.suggested_reorder_qty)
      : Math.max(0, item.reorder_level * 2 - item.quantity_on_hand);
  };

  const getEffectiveQty = (item: ReorderItem): number => {
    if (customQuantities[item.inventory_id] !== undefined) {
      return customQuantities[item.inventory_id];
    }
    return getDefaultSuggestedQty(item);
  };

  const handleQtyChange = (inventoryId: number, val: number) => {
    setCustomQuantities((prev) => ({
      ...prev,
      [inventoryId]: Math.max(0, val),
    }));
  };

  const handleResetQty = (inventoryId: number) => {
    setCustomQuantities((prev) => {
      const next = { ...prev };
      delete next[inventoryId];
      return next;
    });
  };

  const handleResetAll = () => {
    setCustomQuantities({});
  };

  // Filter items: Recommended = either suggested_reorder_qty > 0 OR stock_status != NORMAL
  const filteredItems = items.filter((item) => {
    if (filterMode === "recommended") {
      return Number(item.suggested_reorder_qty) > 0 || item.stock_status !== "NORMAL";
    }
    return true;
  });

  const totalReplenishUnits = filteredItems.reduce(
    (sum, it) => sum + getEffectiveQty(it),
    0
  );

  const estimatedCost = filteredItems.reduce(
    (sum, it) => sum + getEffectiveQty(it) * Number(it.cost_price || 0),
    0
  );

  const manualEditsCount = Object.keys(customQuantities).length;

  const theme = {
    wrapper: "space-y-6 animate-in fade-in duration-300 text-slate-800",
    title: "text-2xl font-black text-slate-900 flex items-center gap-2.5",
    subtitle: "mt-1 text-sm text-slate-500 font-medium",
    recalcBtn: "px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all",
    kpiCard: "rounded-2xl p-4 bg-white border border-slate-200 shadow-xs",
    kpiCardTeal: "rounded-2xl p-4 bg-white border border-teal-200 shadow-xs",
    kpiCardEmerald: "rounded-2xl p-4 bg-white border border-emerald-200 shadow-xs",
    kpiLabel: "text-slate-500 text-xs font-semibold",
    kpiValue: "text-2xl font-black mt-2 font-mono text-slate-900",
    kpiValueTeal: "text-2xl font-black mt-2 font-mono text-teal-700",
    kpiValueEmerald: "text-2xl font-black mt-2 font-mono text-emerald-700",
    kpiSubtext: "text-[10px] text-slate-500 font-mono mt-1",
    tabBorder: "border-slate-200",
    tabInactive: "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs",
    resetEditsBtn: "sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all shadow-2xs",
    tableCard: "bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs",
    thead: "border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold",
    tbodyDivide: "divide-y divide-slate-100",
    rowHover: "hover:bg-slate-50 transition-colors",
    prodName: "font-semibold text-slate-900",
    prodMeta: "text-[10px] font-mono text-slate-500",
    supplierText: "py-3.5 px-4 text-slate-600",
    stockQty: "py-3.5 px-4 text-right font-mono font-bold text-slate-900",
    reorderLevel: "py-3.5 px-4 text-right font-mono text-slate-600",
    velocity: "py-3.5 px-4 text-right font-mono text-teal-700 font-bold",
    qtyControlBox: "inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs",
    qtyBtn: "w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center transition-colors border border-slate-200 shadow-2xs",
    qtyInput: "w-14 px-1 py-0.5 text-center bg-transparent font-mono font-bold text-xs text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded",
    qtyResetBtn: "text-[10px] text-amber-700 hover:text-amber-900 p-1 rounded bg-amber-100 hover:bg-amber-200 transition-colors",
    costTotal: "text-slate-900 font-bold",
    costPerUnit: "text-[10px] text-slate-500",
  };

  return (
    <section className={theme.wrapper}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={theme.title}>
              <ClipboardCheck className="w-6 h-6 text-teal-600" />
              <span>Smart Reorder Replenishment</span>
            </h1>
          </div>
          <p className={theme.subtitle}>
            Automated stock replenishment advised by 30-day velocity, lead days, and safety stock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuggestions}
            className={theme.recalcBtn}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
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
        <div className={theme.kpiCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={theme.kpiLabel}>Items Needing Restock</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className={theme.kpiValue}>
            {items.filter((it) => it.stock_status !== "NORMAL" || Number(it.suggested_reorder_qty) > 0).length}
          </div>
        </div>

        <div className={theme.kpiCardTeal}>
          <div className="flex justify-between items-center text-xs">
            <span className={isClerk ? "text-teal-700 font-semibold" : "text-teal-400 font-semibold"}>Total Units to Order</span>
            <Package className="w-4 h-4 text-teal-600" />
          </div>
          <div className={theme.kpiValueTeal}>
            {totalReplenishUnits} units
          </div>
        </div>

        <div className={theme.kpiCardEmerald}>
          <div className="flex justify-between items-center text-xs">
            <span className={isClerk ? "text-emerald-700 font-semibold" : "text-emerald-400 font-semibold"}>Est. Replenishment Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className={theme.kpiValueEmerald}>
            Rs. {estimatedCost.toFixed(2)}
          </div>
          <div className={theme.kpiSubtext}>
            Based on current replenishment demand
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={`flex items-center gap-2 border-b ${theme.tabBorder} pb-3 flex-wrap`}>
        <button
          onClick={() => setFilterMode("recommended")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filterMode === "recommended"
              ? "bg-teal-600 text-white shadow-sm"
              : theme.tabInactive
          }`}
        >
          Urgent & Recommended Restocks
        </button>
        <button
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            filterMode === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : theme.tabInactive
          }`}
        >
          All Product Catalog ({items.length})
        </button>

        {manualEditsCount > 0 && (
          <button
            onClick={handleResetAll}
            className={theme.resetEditsBtn}
            title="Reset all manual quantity edits back to system suggestion"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset {manualEditsCount} manual {manualEditsCount === 1 ? "edit" : "edits"}</span>
          </button>
        )}
      </div>

      {/* Suggestions Table */}
      <div className={theme.tableCard}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={theme.thead}>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4 text-right">Available Stock</th>
                <th className="py-3.5 px-4 text-right">Reorder Level</th>
                <th className="py-3.5 px-4 text-right">Sales Velocity</th>
                <th className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Order Qty</span>
                    <Pencil className="w-3 h-3 text-amber-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Est. Cost</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={theme.tbodyDivide}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-teal-600 mb-2" />
                    Calculating reorder requirements...
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
                  const defaultQty = getDefaultSuggestedQty(item);
                  const currentQty = getEffectiveQty(item);
                  const isCustom = customQuantities[item.inventory_id] !== undefined && customQuantities[item.inventory_id] !== defaultQty;

                  return (
                    <tr key={item.inventory_id} className={theme.rowHover}>
                      <td className="py-3.5 px-4">
                        <div className={theme.prodName}>{item.product_name}</div>
                        <div className={theme.prodMeta}>{item.barcode} • {item.category_name || "General"}</div>
                      </td>
                      <td className={theme.supplierText}>{item.supplier_name || "—"}</td>
                      <td className={theme.stockQty}>
                        {item.quantity_on_hand}
                      </td>
                      <td className={theme.reorderLevel}>
                        {item.reorder_level}
                      </td>
                      <td className={theme.velocity}>
                        {Number(item.sales_velocity || 0).toFixed(2)}/day
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className={theme.qtyControlBox}>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.inventory_id, Math.max(0, currentQty - 5))}
                            className={theme.qtyBtn}
                            title="Decrease by 5 units"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={currentQty}
                            onChange={(e) => handleQtyChange(item.inventory_id, Math.max(0, parseInt(e.target.value) || 0))}
                            className={theme.qtyInput}
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(item.inventory_id, currentQty + 5)}
                            className={theme.qtyBtn}
                            title="Increase by 5 units"
                          >
                            +
                          </button>
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => handleResetQty(item.inventory_id)}
                              className={theme.qtyResetBtn}
                              title="Reset to system suggestion"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] font-mono mt-1">
                          {isCustom ? (
                            <span className="text-amber-600 font-semibold flex items-center justify-center gap-1">
                              <span>✏️ Manual:</span>
                              <span>+{currentQty}</span>
                              <span className="text-slate-400 line-through">({defaultQty})</span>
                            </span>
                          ) : (
                            <span className={isClerk ? "text-slate-500" : "text-slate-400"}>
                              Suggested: <span className="text-amber-600 font-bold">+{defaultQty} units</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className={theme.costTotal}>
                          Rs. {(currentQty * Number(item.cost_price || 0)).toFixed(2)}
                        </div>
                        <div className={theme.costPerUnit}>
                          @ Rs. {Number(item.cost_price || 0).toFixed(2)}/unit
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/purchases/new?productId=${item.product_id}&quantity=${currentQty}`}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
                          title={`Create Purchase Order for ${currentQty} units`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Order ({currentQty})</span>
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
