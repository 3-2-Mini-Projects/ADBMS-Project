"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  Trash2,
  Sparkles,
  DollarSign,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export default function NewPurchasePage() {
  const router = useRouter();
  const { currentBranch, showToast, currentEmployee } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poItems, setPoItems] = useState<
    { product_id: string; quantity: number; unit_cost: number }[]
  >([{ product_id: "", quantity: 50, unit_cost: 200 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([suppliersData, productsData]) => {
        if (Array.isArray(suppliersData)) setSuppliers(suppliersData);
        if (Array.isArray(productsData)) setProducts(productsData);

        // Pre-fill if navigated from /inventory/reorder-suggestions with productId & quantity
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const pId = params.get("productId");
          const pQty = params.get("quantity");
          if (pId && Array.isArray(productsData)) {
            const found = productsData.find((p: any) => String(p.product_id) === String(pId));
            if (found) {
              if (found.supplier_id) {
                setSupplierId(String(found.supplier_id));
              }
              setPoItems([
                {
                  product_id: String(found.product_id),
                  quantity: pQty && Number(pQty) > 0 ? Number(pQty) : 50,
                  unit_cost: Number(found.cost_price || 0),
                },
              ]);
            }
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load initial data:", err);
      })
      .finally(() => {
        setLoadingInitial(false);
      });
  }, []);

  const handleAddItemRow = () => {
    setPoItems([...poItems, { product_id: "", quantity: 20, unit_cost: 150 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...poItems];
    if (field === "product_id") {
      updated[index].product_id = val;
      const foundProduct = products.find((p) => String(p.product_id) === String(val));
      if (foundProduct && foundProduct.cost_price) {
        updated[index].unit_cost = Number(foundProduct.cost_price);
      }
    } else if (field === "quantity") {
      updated[index].quantity = Number(val);
    } else if (field === "unit_cost") {
      updated[index].unit_cost = Number(val);
    }
    setPoItems(updated);
  };

  const totalOrderCost = poItems.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      showToast("Please select a supplier", "error");
      return;
    }
    if (!currentBranch) {
      showToast("Please select an active branch", "error");
      return;
    }

    const validItems = poItems.filter((it) => it.product_id && it.quantity > 0);
    if (validItems.length === 0) {
      showToast("Please add at least one product with quantity", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: Number(supplierId),
          branch_id: currentBranch.branch_id,
          expected_date: expectedDate || null,
          created_by: currentEmployee?.employee_id || 1,
          status: "SENT",
          items: validItems,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Purchase Order ${data.po_number} sent to supplier! Awaiting delivery.`, "success");
        router.push("/purchases");
      } else {
        showToast(data.error || "Failed to create purchase order", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const theme = {
    wrapper: isClerk
      ? "space-y-6 animate-in fade-in duration-300 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-6 animate-in fade-in duration-300 text-slate-100",
    title: isClerk
      ? "text-2xl font-black text-slate-900 flex items-center gap-2.5"
      : "text-2xl font-black text-white flex items-center gap-2.5",
    subtitle: isClerk ? "text-xs text-slate-500 mt-1" : "text-xs text-slate-400 mt-1",
    card: isClerk
      ? "bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
      : "glass-card rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6",
    label: isClerk ? "text-xs font-semibold text-slate-700 block mb-1.5" : "text-xs text-slate-300 block mb-1.5",
    input: isClerk
      ? "w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all"
      : "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 transition-colors",
    itemRow: isClerk
      ? "p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-3"
      : "p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center gap-3",
    tableHeader: isClerk ? "text-xs font-bold text-slate-800" : "text-xs font-bold text-slate-200",
    summaryBox: isClerk
      ? "p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4"
      : "p-4 rounded-xl bg-teal-950/30 border border-teal-800/50 flex flex-col sm:flex-row items-center justify-between gap-4",
    summaryText: isClerk ? "text-xs text-teal-900 font-medium" : "text-xs text-teal-300 font-medium",
    totalAmount: isClerk ? "text-xl font-bold font-mono text-teal-950" : "text-xl font-bold font-mono text-teal-300",
    cancelBtn: isClerk
      ? "px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
      : "px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors",
    deleteBtn: isClerk ? "text-slate-400 hover:text-rose-600 p-2" : "text-slate-500 hover:text-rose-400 p-2",
  };

  return (
    <div className={theme.wrapper}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/purchases"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                isClerk ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
              } transition-colors`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Purchase Orders</span>
            </Link>
          </div>
          <h1 className={theme.title}>
            <FileSpreadsheet className={`w-6 h-6 ${isClerk ? "text-teal-600" : "text-teal-400"}`} />
            <span>Create New Purchase Order</span>
          </h1>
          <p className={theme.subtitle}>
            Order stock from verified suppliers to replenish inventory for {currentBranch?.name || "your branch"}.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className={theme.card}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={theme.label}>Branch</label>
            <div className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              isClerk ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-slate-900 text-slate-200 border border-slate-800"
            }`}>
              <Building2 className="w-4 h-4 text-teal-500" />
              <span>{currentBranch?.name || "Branch not selected"}</span>
            </div>
          </div>

          <div>
            <label className={theme.label}>Supplier *</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={theme.input}
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
            <label className={theme.label}>Expected Delivery Date</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className={theme.input}
            />
          </div>
        </div>

        {/* PO Line Items */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className={theme.tableHeader}>Purchase Order Line Items</h3>
            <button
              type="button"
              onClick={handleAddItemRow}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {poItems.map((item, idx) => (
              <div key={idx} className={theme.itemRow}>
                <div className="flex-1 w-full sm:w-auto">
                  <label className="text-[11px] text-slate-400 mb-1 block">Product</label>
                  <select
                    required
                    value={item.product_id}
                    onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                    className={theme.input}
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} ({p.barcode || "No Barcode"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-28">
                  <label className="text-[11px] text-slate-400 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    className={`${theme.input} font-mono`}
                  />
                </div>

                <div className="w-full sm:w-32">
                  <label className="text-[11px] text-slate-400 mb-1 block">Unit Cost (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={item.unit_cost}
                    onChange={(e) => handleItemChange(idx, "unit_cost", e.target.value)}
                    className={`${theme.input} font-mono`}
                  />
                </div>

                <div className="w-full sm:w-32 text-right">
                  <label className="text-[11px] text-slate-400 mb-1 block">Line Total</label>
                  <div className={`py-2.5 font-mono font-bold text-xs ${
                    isClerk ? "text-slate-900" : "text-emerald-400"
                  }`}>
                    Rs. {(Number(item.quantity || 0) * Number(item.unit_cost || 0)).toFixed(2)}
                  </div>
                </div>

                {poItems.length > 1 && (
                  <div className="sm:pt-5">
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className={theme.deleteBtn}
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cost Summary & Actions */}
        <div className={theme.summaryBox}>
          <div>
            <div className={theme.summaryText}>Total Purchase Value</div>
            <div className="text-[11px] text-slate-500">
              {poItems.filter((i) => i.product_id).length} line items specified
            </div>
          </div>
          <div className="text-right">
            <div className={theme.totalAmount}>Rs. {totalOrderCost.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3">
          <Link href="/purchases" className={theme.cancelBtn}>
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || loadingInitial}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-teal-950/30"
          >
            {isSubmitting ? (
              <Sparkles className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Send Order to Supplier</span>
          </button>
        </div>
      </form>
    </div>
  );
}
