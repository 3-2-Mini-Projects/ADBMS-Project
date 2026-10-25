"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { Product } from "@/lib/types";
import {
  Package,
  Search,
  Plus,
  History,
  Edit3,
  CheckCircle2,
  X,
  Sparkles,
  TrendingUp,
  Boxes,
  ShieldAlert,
  Power,
  RotateCcw,
} from "lucide-react";

export default function ProductsPage() {
  const { showToast, currentEmployee, currentBranch } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Price Update Modal State
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("Regular price update");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Price History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Branch Stock Breakdown Modal State
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<any | null>(null);
  const [branchStockData, setBranchStockData] = useState<any[]>([]);
  const [batchesData, setBatchesData] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Add Product Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newProd, setNewProd] = useState({
    barcode: "",
    name: "",
    brand: "",
    category_id: "",
    supplier_id: "",
    unit_price: "",
    cost_price: "",
    tax_rate: "0",
    reorder_level: "10",
  });
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Edit Product Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProd, setEditProd] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedCategory) params.append("categoryId", selectedCategory);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCategories(d));
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setSuppliers(d));
  }, [selectedCategory]);

  // Open Price Update
  const openPriceModal = (product: Product) => {
    setSelectedProduct(product);
    setNewPrice(String(product.unit_price));
    setPriceChangeReason("Regular seasonal price update");
    setPriceModalOpen(true);
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !newPrice) return;
    setUpdatingPrice(true);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct.product_id,
          unit_price: Number(newPrice),
          cost_price: Number(selectedProduct.cost_price),
          changed_by: currentEmployee?.employee_id || 1,
          reason: priceChangeReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.pendingApproval) {
          showToast(data.message, "info");
        } else {
          showToast(`Price updated for ${selectedProduct.name} to Rs. ${Number(newPrice).toFixed(2)}`, "success");
        }
        setPriceModalOpen(false);
        fetchProducts();
      } else {
        showToast(data.error || "Failed to update price", "error");
      }
    } catch {
      showToast("Error updating price", "error");
    } finally {
      setUpdatingPrice(false);
    }
  };

  // Open Price History
  const viewPriceHistory = async (product: Product) => {
    setSelectedProduct(product);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/catalog/price-approvals?productId=${product.product_id}`);
      const data = await res.json();
      if (Array.isArray(data)) setPriceHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open Branch Stock Breakdown
  const viewBranchStock = async (product: Product) => {
    setStockProduct(product);
    setStockModalOpen(true);
    setLoadingStock(true);
    try {
      const res = await fetch(`/api/products/${product.product_id}`);
      const data = await res.json();
      if (data && data.product) {
        setBranchStockData(data.branch_stocks || []);
        setBatchesData(data.batches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStock(false);
    }
  };

  // Open Edit Product
  const openEditModal = (product: Product) => {
    setEditProd({
      product_id: product.product_id,
      name: product.name,
      barcode: product.barcode,
      brand: product.brand || "",
      category_id: product.category_id || "",
      supplier_id: product.supplier_id || "",
      cost_price: product.cost_price,
      reorder_level: product.reorder_level || 10,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProd) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/products/${editProd.product_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProd),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Product master details updated successfully!", "success");
        setEditModalOpen(false);
        fetchProducts();
      } else {
        showToast(data.error || "Failed to update product", "error");
      }
    } catch {
      showToast("Error updating product details", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Soft Deactivate / Reactivate
  const handleToggleActive = async (product: Product) => {
    const nextStatus = product.is_active === 1 ? 0 : 1;
    const actionLabel = nextStatus === 1 ? "restore" : "deactivate";
    if (!confirm(`Are you sure you want to ${actionLabel} "${product.name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${product.product_id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Product ${nextStatus === 1 ? "restored to active" : "deactivated"}!`, "success");
        fetchProducts();
      } else {
        showToast(data.error || "Failed to update status", "error");
      }
    } catch {
      showToast("Error updating status", "error");
    }
  };

  // Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProduct(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProd),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("New product catalog record created and branch inventory provisioned!", "success");
        setAddModalOpen(false);
        setNewProd({
          barcode: "",
          name: "",
          brand: "",
          category_id: "",
          supplier_id: "",
          unit_price: "",
          cost_price: "",
          tax_rate: "0",
          reorder_level: "10",
        });
        fetchProducts();
      } else {
        showToast(data.error || "Failed to add product", "error");
      }
    } catch {
      showToast("Error creating product", "error");
    } finally {
      setCreatingProduct(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (statusFilter === "ACTIVE") return p.is_active === 1;
    if (statusFilter === "INACTIVE") return p.is_active === 0;
    return true;
  });

  // Calculate live variance for price modal
  const oldPriceVal = selectedProduct ? Number(selectedProduct.unit_price) : 0;
  const costPriceVal = selectedProduct ? Number(selectedProduct.cost_price) : 0;
  const newPriceVal = Number(newPrice) || 0;
  const priceVariancePct = oldPriceVal > 0 ? ((newPriceVal - oldPriceVal) / oldPriceVal) * 100 : 0;
  const requiresSupervisorApproval =
    selectedProduct &&
    (priceVariancePct < -15 || (newPriceVal > 0 && newPriceVal < costPriceVal));

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner with Catalog Manager Suite Links */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Catalog Manager Module
            </span>
            <span className="text-xs text-slate-400">table: products</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-indigo-600" />
            <span>Product Master Catalog</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain barcodes, pricing tiers, margins, vendor assignments, and supervisor price approval gates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/catalog"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            Catalog Dashboard
          </Link>
          <Link
            href="/catalog/price-history"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
          >
            Price Approvals
          </Link>
          <Link
            href="/catalog/slow-movers"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors shadow-xs"
          >
            Slow Movers Hub
          </Link>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
            placeholder="Search by barcode, product title, or brand..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full sm:w-36 px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Product Master Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Barcode</th>
                <th className="py-3.5 px-4 font-semibold">Product Name / Brand</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Supplier</th>
                <th className="py-3.5 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3.5 px-4 font-semibold text-right">Cost Price</th>
                <th className="py-3.5 px-4 font-semibold text-right">Gross Margin</th>
                <th className="py-3.5 px-4 font-semibold text-center">Tax %</th>
                <th className="py-3.5 px-4 font-semibold text-center">Reorder</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const unitPrice = Number(p.unit_price);
                  const costPrice = Number(p.cost_price);
                  const grossMargin = unitPrice - costPrice;
                  const marginPct = unitPrice > 0 ? (grossMargin / unitPrice) * 100 : 0;

                  return (
                    <tr key={p.product_id} className={`transition-colors hover:bg-slate-50/70 ${p.is_active === 0 ? "opacity-60 bg-slate-50/40" : ""}`}>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{p.barcode}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500">{p.brand || "Standard Brand"}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category_name || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{p.supplier_name || "—"}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        Rs. {unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        Rs. {costPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className={`font-mono font-bold ${grossMargin < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                          Rs. {grossMargin.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {marginPct.toFixed(1)}% margin
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{Number(p.tax_rate)}%</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{p.reorder_level}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          p.is_active === 1
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {p.is_active === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Price Update */}
                          <button
                            onClick={() => openPriceModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 shadow-xs transition-colors"
                            title="Update Price (ACID & Supervisor Gate)"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                          {/* Price History */}
                          <button
                            onClick={() => viewPriceHistory(p)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
                            title="Price History Audit Log"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {/* Branch Stock Breakdown */}
                          <button
                            onClick={() => viewBranchStock(p)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 shadow-xs transition-colors"
                            title="View Branch Inventory Breakdown"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
                            title="Edit Product Master Data"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {/* Toggle Active / Soft Delete */}
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`p-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors ${
                              p.is_active === 1
                                ? "bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 hover:border-rose-200"
                                : "bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 hover:border-emerald-200"
                            }`}
                            title={p.is_active === 1 ? "Deactivate Product" : "Restore Product"}
                          >
                            {p.is_active === 1 ? <Power className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Update Price with Supervisor Review Warning */}
      {priceModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Update Unit Price (ACID History)</span>
              </h3>
              <button
                onClick={() => setPriceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-900">{selectedProduct.name}</div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Current Unit Price: Rs. {Number(selectedProduct.unit_price).toFixed(2)}</span>
                <span>Cost Price: Rs. {Number(selectedProduct.cost_price).toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">New Selling Price (Rs.)</label>
                <input
                  type="number"
                  step="any"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 font-mono text-slate-900 text-base font-bold focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              {/* Dynamic Variance & Margin Preview */}
              {newPriceVal > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Proposed Variance:</span>
                    <span className={`font-mono font-bold ${priceVariancePct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {priceVariancePct > 0 ? `+${priceVariancePct.toFixed(1)}%` : `${priceVariancePct.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Projected Margin:</span>
                    <span className={`font-mono font-bold ${newPriceVal < costPriceVal ? "text-rose-600" : "text-emerald-600"}`}>
                      Rs. {(newPriceVal - costPriceVal).toFixed(2)} ({((newPriceVal - costPriceVal) / newPriceVal * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Supervisor Review Gate Trigger Warning */}
              {requiresSupervisorApproval && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Supervisor Approval Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This price reduction ({priceVariancePct.toFixed(1)}%) or below-cost price exceeds the policy threshold (&gt;15% drop). This revision will be submitted to the Supervisor Approval Queue for review before taking effect in stores.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Audit Reason / Justification</label>
                <input
                  type="text"
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPriceModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPrice}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {updatingPrice ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{requiresSupervisorApproval ? "Submit for Approval" : "Commit Price Change"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Branch Stock Breakdown */}
      {stockModalOpen && stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-cyan-600" />
                <span>Multi-Branch Stock: {stockProduct.name}</span>
              </h3>
              <button
                onClick={() => setStockModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {loadingStock ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading branch stock...</div>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Branch Inventory Levels</h4>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-2 font-medium">Branch</th>
                          <th className="pb-2 text-right font-medium">On Hand</th>
                          <th className="pb-2 text-right font-medium">Reorder</th>
                          <th className="pb-2 text-right font-medium">Holding Value</th>
                          <th className="pb-2 text-center font-medium">Health</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {branchStockData.map((b) => (
                          <tr key={b.branch_id} className="text-slate-700">
                            <td className="py-2.5 font-medium text-slate-900">{b.branch_name} ({b.branch_code})</td>
                            <td className="py-2.5 text-right font-mono font-bold text-slate-900">{b.quantity_on_hand}</td>
                            <td className="py-2.5 text-right font-mono text-slate-500">{b.reorder_level}</td>
                            <td className="py-2.5 text-right font-mono text-emerald-700">Rs. {Number(b.holding_value).toLocaleString()}</td>
                            <td className="py-2.5 text-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                b.stock_status === "OUT_OF_STOCK"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : b.stock_status === "LOW_STOCK"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}>
                                {b.stock_status === "OUT_OF_STOCK" ? "Depleted" : b.stock_status === "LOW_STOCK" ? "Low Stock" : "Normal"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {batchesData.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Batches &amp; Expiries</h4>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="pb-2 font-medium">Batch No</th>
                            <th className="pb-2 font-medium">Branch</th>
                            <th className="pb-2 text-right font-medium">Quantity</th>
                            <th className="pb-2 font-medium pl-3">Expiry Date</th>
                            <th className="pb-2 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {batchesData.map((batch) => (
                            <tr key={batch.batch_id} className="text-slate-700">
                              <td className="py-2 font-mono font-medium text-slate-900">{batch.batch_no}</td>
                              <td className="py-2 text-slate-500">{batch.branch_name}</td>
                              <td className="py-2 text-right font-mono font-bold text-slate-900">{batch.quantity}</td>
                              <td className="py-2 pl-3 font-mono text-slate-600">{new Date(batch.expiry_date).toLocaleDateString()}</td>
                              <td className="py-2 text-center">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                  batch.expiry_status === "EXPIRED"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : batch.expiry_status === "NEAR_EXPIRY"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}>
                                  {batch.expiry_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                onClick={() => setStockModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Product Master */}
      {editModalOpen && editProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>Edit Product: {editProd.name}</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-700 block mb-1">Product Title</label>
                  <input
                    type="text"
                    value={editProd.name}
                    onChange={(e) => setEditProd({ ...editProd, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={editProd.barcode}
                    onChange={(e) => setEditProd({ ...editProd, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={editProd.brand}
                    onChange={(e) => setEditProd({ ...editProd, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Category</label>
                  <select
                    value={editProd.category_id}
                    onChange={(e) => setEditProd({ ...editProd, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Supplier</label>
                  <select
                    value={editProd.supplier_id}
                    onChange={(e) => setEditProd({ ...editProd, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={editProd.cost_price}
                    onChange={(e) => setEditProd({ ...editProd, cost_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={editProd.reorder_level}
                    onChange={(e) => setEditProd({ ...editProd, reorder_level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  {savingEdit ? "Saving..." : "Save Product Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Price History Audit */}
      {historyModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Price History: {selectedProduct.name}</span>
              </h3>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading history audit...</div>
              ) : priceHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No previous price modifications recorded for this product.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Old Price</th>
                      <th className="pb-2 font-semibold">New Price</th>
                      <th className="pb-2 font-semibold">Changed By</th>
                      <th className="pb-2 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceHistory.map((h) => (
                      <tr key={h.history_id} className="text-slate-700">
                        <td className="py-2.5 font-mono text-[11px] text-slate-500">
                          {new Date(h.changed_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-mono text-slate-500">Rs. {Number(h.old_price).toFixed(2)}</td>
                        <td className="py-2.5 font-mono font-bold text-emerald-700">
                          Rs. {Number(h.new_price).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-slate-800">{h.changer_name || "Manager"}</td>
                        <td className="py-2.5 text-slate-500">{h.reason || "Price update"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Product */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Create New Catalog Product</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-700 block mb-1">Product Title</label>
                  <input
                    type="text"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    placeholder="e.g. Anchor Full Cream Milk Powder 400g"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Barcode / SKU</label>
                  <input
                    type="text"
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    placeholder="4790001001"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={newProd.brand}
                    onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                    placeholder="e.g. Anchor"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Category</label>
                  <select
                    value={newProd.category_id}
                    onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Primary Supplier</label>
                  <select
                    value={newProd.supplier_id}
                    onChange={(e) => setNewProd({ ...newProd, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={newProd.unit_price}
                    onChange={(e) => setNewProd({ ...newProd, unit_price: e.target.value })}
                    placeholder="350.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={newProd.cost_price}
                    onChange={(e) => setNewProd({ ...newProd, cost_price: e.target.value })}
                    placeholder="280.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={newProd.tax_rate}
                    onChange={(e) => setNewProd({ ...newProd, tax_rate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    value={newProd.reorder_level}
                    onChange={(e) => setNewProd({ ...newProd, reorder_level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="w-2/3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  {creatingProduct ? <Sparkles className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save &amp; Provision Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
