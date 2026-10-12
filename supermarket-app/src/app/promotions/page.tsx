"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { Promotion, Coupon } from "@/lib/types";
import {
  Tag,
  Plus,
  Percent,
  Calendar,
  Layers,
  Package,
  CheckCircle2,
  XCircle,
  Sparkles,
  X,
  Ticket,
} from "lucide-react";

export default function PromotionsPage() {
  const { showToast } = useApp();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: "",
    discount_percent: "10",
    start_date: "",
    end_date: "",
    target_type: "category",
    target_id: "",
  });

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    promo_id: "",
    expiry_date: "",
  });

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setNewPromo((prev) => ({ ...prev, start_date: today, end_date: twoWeeks }));
    setNewCoupon((prev) => ({ ...prev, expiry_date: twoWeeks }));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promotions");
      const data = await res.json();
      if (data.promotions) setPromotions(data.promotions);
      if (data.coupons) setCoupons(data.coupons);
    } catch (err) {
      console.error("Error fetching promotions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCategories(d));
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setProducts(d));
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPromo.name,
          discount_percent: Number(newPromo.discount_percent),
          start_date: newPromo.start_date,
          end_date: newPromo.end_date,
          category_id: newPromo.target_type === "category" ? newPromo.target_id || null : null,
          product_id: newPromo.target_type === "product" ? newPromo.target_id || null : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Campaign promotion launched!", "success");
        setPromoModalOpen(false);
        fetchData();
      } else {
        showToast(data.error || "Failed to create promo", "error");
      }
    } catch {
      showToast("Error creating promotion", "error");
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_coupon",
          code: newCoupon.code.toUpperCase().trim(),
          promo_id: Number(newCoupon.promo_id),
          expiry_date: newCoupon.expiry_date,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Coupon code ${newCoupon.code.toUpperCase()} issued!`, "success");
        setCouponModalOpen(false);
        fetchData();
      } else {
        showToast(data.error || "Failed to create coupon", "error");
      }
    } catch {
      showToast("Error issuing coupon", "error");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-purple-400" />
            <span>Promotions & Checkout Coupons</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure targeted promotional discounts for categories, individual products, or checkout coupons.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCouponModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all border border-slate-700"
          >
            <Ticket className="w-4 h-4 text-amber-400" />
            <span>Issue Coupon Code</span>
          </button>

          <button
            onClick={() => setPromoModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Promotion</span>
          </button>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-purple-400" />
            <span>Campaign Promotions (promotions & active_promotions_vw)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">{promotions.length} campaigns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3 px-4 font-semibold">Promotion Name</th>
                <th className="py-3 px-4 font-semibold text-center">Discount %</th>
                <th className="py-3 px-4 font-semibold">Target Scope</th>
                <th className="py-3 px-4 font-semibold">Start Date</th>
                <th className="py-3 px-4 font-semibold">End Date</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading campaigns...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No promotions found.
                  </td>
                </tr>
              ) : (
                promotions.map((pr) => (
                  <tr key={pr.promo_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{pr.name}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400 text-sm">
                      {Number(pr.discount_percent)}% OFF
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {pr.product_name ? (
                        <span className="flex items-center gap-1.5 text-blue-300">
                          <Package className="w-3.5 h-3.5" />
                          <span>Product: {pr.product_name}</span>
                        </span>
                      ) : pr.category_name ? (
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Category: {pr.category_name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Basket-wide</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(pr.start_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(pr.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          (pr as any).status === "ACTIVE"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                            : (pr as any).status === "SCHEDULED"
                            ? "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {(pr as any).status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Ticket className="w-4 h-4 text-amber-400" />
            <span>Checkout Coupons (coupons)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">{coupons.length} coupons</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3 px-4 font-semibold">Coupon Code</th>
                <th className="py-3 px-4 font-semibold">Linked Promotion</th>
                <th className="py-3 px-4 font-semibold text-center">Discount %</th>
                <th className="py-3 px-4 font-semibold">Customer Bound</th>
                <th className="py-3 px-4 font-semibold">Expiry Date</th>
                <th className="py-3 px-4 font-semibold text-center">Usage Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {coupons.map((cp) => (
                <tr key={cp.coupon_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm tracking-wider">
                    {cp.code}
                  </td>
                  <td className="py-3 px-4 text-slate-200">{cp.promo_name || "Special Offer"}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                    {Number(cp.discount_percent || 10)}%
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {cp.customer_name ? `${cp.customer_name}` : "Any customer"}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {new Date(cp.expiry_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        cp.is_used === 1
                          ? "bg-slate-800 text-slate-400"
                          : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                      }`}
                    >
                      {cp.is_used === 1 ? "ALREADY REDEEMED" : "AVAILABLE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Create Promo */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Create Promotional Campaign</span>
              </h3>
              <button
                onClick={() => setPromoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dairy Festival 15%"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Discount Percent (%)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={newPromo.discount_percent}
                  onChange={(e) => setNewPromo({ ...newPromo, discount_percent: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newPromo.start_date}
                    onChange={(e) => setNewPromo({ ...newPromo, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newPromo.end_date}
                    onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Target Scope</label>
                <select
                  value={newPromo.target_type}
                  onChange={(e) => setNewPromo({ ...newPromo, target_type: e.target.value, target_id: "" })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white mb-2"
                >
                  <option value="category">Category Wide</option>
                  <option value="product">Specific Product</option>
                </select>

                {newPromo.target_type === "category" ? (
                  <select
                    value={newPromo.target_id}
                    onChange={(e) => setNewPromo({ ...newPromo, target_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={newPromo.target_id}
                    onChange={(e) => setNewPromo({ ...newPromo, target_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} ({p.barcode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Launch Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Issue Coupon */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                <span>Issue Coupon Code</span>
              </h3>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Link to Promotion</label>
                <select
                  required
                  value={newCoupon.promo_id}
                  onChange={(e) => setNewCoupon({ ...newCoupon, promo_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="">Select Promotion</option>
                  {promotions.map((p) => (
                    <option key={p.promo_id} value={p.promo_id}>
                      {p.name} ({Number(p.discount_percent)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={newCoupon.expiry_date}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                >
                  Save & Issue Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
