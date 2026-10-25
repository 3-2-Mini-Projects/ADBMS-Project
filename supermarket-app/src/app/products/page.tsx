"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { Product } from "@/lib/types";
import {
  Package,
  Search,
  Plus,
  History,
  Edit3,
  Barcode,
  Layers,
  Truck,
  CheckCircle2,
  X,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function ProductsPage() {
  const { showToast, currentEmployee } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Price Update Modal State
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("Market adjustment");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Price History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    // Load categories & suppliers for selects
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
          changed_by: currentEmployee?.employee_id || 1,
          reason: priceChangeReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Price updated for ${selectedProduct.name} to Rs. ${Number(newPrice).toFixed(2)}`, "success");
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

  // View Price History
  const viewPriceHistory = async (product: Product) => {
    setSelectedProduct(product);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/products/${product.product_id}/price-history`);
      const data = await res.json();
      if (Array.isArray(data)) setPriceHistory(data);
    } catch {
      showToast("Error fetching price history", "error");
    } finally {
      setLoadingHistory(false);
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
        showToast("New product catalog record created!", "success");
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-blue-600" />
            <span>Product Catalog</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain barcodes, pricing tiers, supplier mappings, and historical price audits.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by barcode, product title, or brand..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-56 px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3.5 px-4 font-semibold">Barcode</th>
                <th className="py-3.5 px-4 font-semibold">Product Name</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Supplier</th>
                <th className="py-3.5 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3.5 px-4 font-semibold text-right">Cost Price</th>
                <th className="py-3.5 px-4 font-semibold text-center">Tax %</th>
                <th className="py-3.5 px-4 font-semibold text-center">Reorder Lvl</th>
                <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.barcode}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.brand || "Standard"}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.category_name || "—"}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.supplier_name || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      Rs. {Number(p.unit_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      Rs. {Number(p.cost_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700 font-semibold">{Number(p.tax_rate)}%</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700 font-semibold">{p.reorder_level}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openPriceModal(p)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 transition-colors"
                          title="Update Price"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => viewPriceHistory(p)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
                          title="Price History Audit"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Update Price */}
      {priceModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Update Unit Price (ACID History)</span>
              </h3>
              <button
                onClick={() => setPriceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-900">{selectedProduct.name}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Current Unit Price: Rs. {Number(selectedProduct.unit_price).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">New Unit Price (Rs.)</label>
                <input
                  type="number"
                  step="any"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-slate-900 text-base font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPriceModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPrice}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {updatingPrice ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Commit Price Change</span>
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
                <History className="w-4 h-4 text-blue-600" />
                <span>Price History: {selectedProduct.name}</span>
              </h3>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="py-8 text-center text-slate-500 text-xs">Loading history audit...</div>
              ) : priceHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No previous price modifications recorded for this product.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Old Price</th>
                      <th className="py-2 px-3 font-semibold">New Price</th>
                      <th className="py-2 px-3 font-semibold">Changed By</th>
                      <th className="py-2 px-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {priceHistory.map((h) => (
                      <tr key={h.history_id} className="text-slate-700 hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">
                          {new Date(h.changed_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">Rs. {Number(h.old_price).toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          Rs. {Number(h.new_price).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-sans font-medium">{h.changer_name || "Manager"}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-sans">{h.reason || "Price update"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
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
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Create New Catalog Product</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Barcode</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4790015"
                    value={newProd.barcode}
                    onChange={(e) => setNewProd({ ...newProd, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basmati Rice 1kg"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Fortune"
                    value={newProd.brand}
                    onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    required
                    value={newProd.category_id}
                    onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Supplier</label>
                  <select
                    required
                    value={newProd.supplier_id}
                    onChange={(e) => setNewProd({ ...newProd, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="450.00"
                    value={newProd.unit_price}
                    onChange={(e) => setNewProd({ ...newProd, unit_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="380.00"
                    value={newProd.cost_price}
                    onChange={(e) => setNewProd({ ...newProd, cost_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={newProd.reorder_level}
                    onChange={(e) => setNewProd({ ...newProd, reorder_level: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {creatingProduct ? <Sparkles className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save to Product Catalog</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
