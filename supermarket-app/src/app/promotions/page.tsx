"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/context";
import { Promotion } from "@/lib/types";
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
  Calculator,
  Trash2,
  Power,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Store,
} from "lucide-react";

interface ActivePromoVwRow {
  promo_id: number;
  name: string;
  discount_percent: number;
  start_date: string;
  end_date: string;
  product_id?: number | null;
  product_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  is_active: number;
  status: string;
  days_left: number;
}

export default function PromotionsPage() {
  const { showToast } = useApp();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activePromotions, setActivePromotions] = useState<ActivePromoVwRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'all' | 'active_vw' | 'matrix' | 'sql_functions'
  const [activeTab, setActiveTab] = useState<"all" | "active_vw" | "matrix" | "sql_functions">("all");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SCHEDULED" | "EXPIRED">("ALL");

  // Create Promo Modal (CALL create_promotion)
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: "",
    discount_percent: "10",
    start_date: "",
    end_date: "",
    target_type: "category",
    target_id: "",
  });

  // Calculator Modal (SELECT get_discount(p_amount, promo_id))
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [calcPromoId, setCalcPromoId] = useState<number | "">("");
  const [calcAmount, setCalcAmount] = useState<string>("5000");
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculatingDiscount, setCalculatingDiscount] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setNewPromo((prev) => ({ ...prev, start_date: today, end_date: twoWeeks }));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promotions");
      const data = await res.json();
      if (data.promotions) setPromotions(data.promotions);
      if (data.activePromotions) setActivePromotions(data.activePromotions);
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

  // Handle Create Promotion (CALL create_promotion)
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPromo(true);
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPromo.name.trim(),
          discount_percent: Number(newPromo.discount_percent),
          start_date: newPromo.start_date,
          end_date: newPromo.end_date,
          category_id: newPromo.target_type === "category" ? newPromo.target_id || null : null,
          product_id: newPromo.target_type === "product" ? newPromo.target_id || null : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Campaign promotion launched via create_promotion()!", "success");
        setPromoModalOpen(false);
        setNewPromo({
          name: "",
          discount_percent: "10",
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          target_type: "category",
          target_id: "",
        });
        await fetchData();
      } else {
        showToast(data.error || "Failed to create promo", "error");
      }
    } catch {
      showToast("Error executing create_promotion procedure", "error");
    } finally {
      setCreatingPromo(false);
    }
  };

  // Toggle Promotion Active/Inactive
  const handleToggleActive = async (promo_id: number, current_active: number) => {
    const nextState = current_active === 1 ? 0 : 1;
    try {
      const res = await fetch("/api/promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_id, is_active: nextState }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Promotion ${nextState ? "activated" : "deactivated"}!`, "success");
        await fetchData();
      } else {
        showToast(data.error || "Failed to update status", "error");
      }
    } catch {
      showToast("Error updating promotion status", "error");
    }
  };

  // Delete Promotion
  const handleDeletePromo = async (promo_id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete promotion "${name}"?`)) return;
    try {
      const res = await fetch(`/api/promotions?promo_id=${promo_id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Promotion deleted successfully", "success");
        await fetchData();
      } else {
        showToast(data.error || "Failed to delete promotion", "error");
      }
    } catch {
      showToast("Error deleting promotion", "error");
    }
  };

  // Execute get_discount(p_amount, promo_id) calculation
  const handleCalculateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcPromoId || !calcAmount) {
      showToast("Please choose a promotion and enter an amount", "error");
      return;
    }

    setCalculatingDiscount(true);
    setCalcResult(null);
    try {
      const res = await fetch(`/api/promotions?calculate=discount&promo_id=${calcPromoId}&amount=${calcAmount}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCalcResult(data);
      } else {
        showToast(data.error || "Failed to calculate discount", "error");
      }
    } catch {
      showToast("Error calling get_discount() function", "error");
    } finally {
      setCalculatingDiscount(false);
    }
  };

  const openCalculator = (promo_id: number) => {
    setCalcPromoId(promo_id);
    setCalcResult(null);
    setCalcModalOpen(true);
  };

  // Filtered promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const matchesSearch =
        searchTerm === "" ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const status = (p as any).status || "ACTIVE";
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [promotions, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-purple-400" />
            <span>Campaign & Promotion Management</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setCalcResult(null);
              setCalcModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 border border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Execute get_discount() function calculation"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculate Discount </span>
          </button>

          <button
            onClick={() => setPromoModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-950/40 border border-purple-500/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Create promotion via stored procedure create_promotion()"
          >
            <Plus className="w-4 h-4" />
            <span>New Promotion</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/30">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "all"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >

              <span>All Promotions ({promotions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("active_vw")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "active_vw"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Promotions</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                {activePromotions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "matrix"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories of promotion</span>
            </button>

            <button
              onClick={() => setActiveTab("sql_functions")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "sql_functions"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>ADBMS SQL Functions (get_discount, etc.)</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors self-end md:self-auto"
            title="Refresh Promotions Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: All Promotions Table */}
        {/* ========================================================================= */}
        {activeTab === "all" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search promo name, category, or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-500" /> Status:
                </span>
                {(["ALL", "ACTIVE", "SCHEDULED", "EXPIRED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${statusFilter === s
                      ? "bg-purple-500 text-white shadow-md"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                    <th className="py-3 px-4">Promotion Name</th>
                    <th className="py-3 px-4 text-center">Discount %</th>
                    <th className="py-3 px-4">Target Scope</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                        Loading promotional campaigns...
                      </td>
                    </tr>
                  ) : filteredPromotions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        No promotions found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPromotions.map((pr) => {
                      const status = (pr as any).status || "ACTIVE";
                      const daysLeft = (pr as any).days_left ?? 0;

                      return (
                        <tr key={pr.promo_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-sans font-bold text-white">
                            <div>{pr.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: #{pr.promo_id}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-400 text-sm">
                            {Number(pr.discount_percent)}% OFF
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-sans">
                            {pr.product_name ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 text-[11px]">
                                <Package className="w-3 h-3" />
                                <span>Product: {pr.product_name}</span>
                              </span>
                            ) : pr.category_name ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 text-[11px]">
                                <Layers className="w-3 h-3" />
                                <span>Category: {pr.category_name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Store-wide (All items)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(pr.start_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            <div>{new Date(pr.end_date).toLocaleDateString()}</div>
                            {status === "ACTIVE" && (
                              <span className="text-[10px] text-emerald-400 font-sans block">
                                {daysLeft >= 0 ? `${daysLeft} days remaining` : "Expiring today"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                                : status === "SCHEDULED"
                                  ? "bg-blue-950 text-blue-300 border border-blue-800/50"
                                  : "bg-slate-800 text-slate-400"
                                }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              {/* Toggle active */}
                              <button
                                onClick={() => handleToggleActive(pr.promo_id, pr.is_active)}
                                className={`p-1.5 rounded-lg text-xs transition-colors ${pr.is_active === 1
                                  ? "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                                  }`}
                                title={pr.is_active === 1 ? "Deactivate Promotion" : "Activate Promotion"}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeletePromo(pr.promo_id, pr.name)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete Promotion"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Active Promotions View (active_promotions_vw) */}
        {/* ========================================================================= */}
        {activeTab === "active_vw" && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/20 border-b border-emerald-800/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">
                  Live View: <code className="font-mono text-white">active_promotions_vw</code>
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  — Automatically filters where <code className="text-emerald-400 font-mono">is_active = 1</code> and{" "}
                  <code className="text-emerald-400 font-mono">CURDATE() BETWEEN start_date AND end_date</code>.
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-400">{activePromotions.length} active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                    <th className="py-3 px-4 font-mono">Promo ID</th>
                    <th className="py-3 px-4">Promotion Name</th>
                    <th className="py-3 px-4 text-center">Discount %</th>
                    <th className="py-3 px-4">Product Target</th>
                    <th className="py-3 px-4">Category Target</th>
                    <th className="py-3 px-4">Valid Period</th>
                    <th className="py-3 px-4 text-center">Days Remaining</th>
                    <th className="py-3 px-4 text-right">Calculator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                        Querying active_promotions_vw...
                      </td>
                    </tr>
                  ) : activePromotions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                        No active promotions currently in effect today.
                      </td>
                    </tr>
                  ) : (
                    activePromotions.map((p) => (
                      <tr key={p.promo_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-amber-400 font-mono">#{p.promo_id}</td>
                        <td className="py-3 px-4 font-sans font-bold text-white">{p.name}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400 text-sm">
                          {Number(p.discount_percent)}% OFF
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans">
                          {p.product_name ? (
                            <span className="text-blue-300 flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {p.product_name}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans">
                          {p.category_name ? (
                            <span className="text-indigo-300 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {p.category_name}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                            {p.days_left >= 0 ? `${p.days_left} days left` : "Ends today"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openCalculator(p.promo_id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 transition-all font-sans"
                          >
                            Calculate Rs.
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Scope Matrix (Categories & Products) */}
        {/* ========================================================================= */}
        {activeTab === "matrix" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category-Wide Discounts */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-indigo-400 font-bold text-sm">
                  <Layers className="w-4 h-4" />
                  <span>Category-Wide Discount Campaigns</span>
                </div>
                <div className="space-y-2">
                  {promotions.filter((p) => p.category_id != null).length === 0 ? (
                    <p className="text-xs text-slate-500">No category-level campaigns active.</p>
                  ) : (
                    promotions
                      .filter((p) => p.category_id != null)
                      .map((p) => (
                        <div
                          key={p.promo_id}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{p.category_name}</span>
                            <span className="text-slate-400 text-[11px]">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold text-sm font-mono">
                              {Number(p.discount_percent)}% OFF
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Until {new Date(p.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Product-Specific Discounts */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-blue-400 font-bold text-sm">
                  <Package className="w-4 h-4" />
                  <span>Product-Specific Discount Campaigns</span>
                </div>
                <div className="space-y-2">
                  {promotions.filter((p) => p.product_id != null).length === 0 ? (
                    <p className="text-xs text-slate-500">No product-specific campaigns active.</p>
                  ) : (
                    promotions
                      .filter((p) => p.product_id != null)
                      .map((p) => (
                        <div
                          key={p.promo_id}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{p.product_name}</span>
                            <span className="text-slate-400 text-[11px]">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold text-sm font-mono">
                              {Number(p.discount_percent)}% OFF
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Until {new Date(p.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ADBMS Functions & Procedures Playground */}
        {/* ========================================================================= */}
        {activeTab === "sql_functions" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: get_discount() function tester */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm">Function: get_discount(p_amount, promo_id)</h3>
                    <p className="text-[11px] text-slate-400">Computes monetary discount based on active promotion</p>
                  </div>
                </div>

                <form onSubmit={handleCalculateDiscount} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Select Promotion</label>
                    <select
                      value={calcPromoId}
                      onChange={(e) => setCalcPromoId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      required
                    >
                      <option value="">-- Choose Campaign --</option>
                      {promotions.map((p) => (
                        <option key={p.promo_id} value={p.promo_id}>
                          {p.name} ({Number(p.discount_percent)}%) - {(p as any).status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Purchase Amount (Rs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={calculatingDiscount}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {calculatingDiscount ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Calculator className="w-3.5 h-3.5" />
                    )}
                    <span>Run get_discount() Query</span>
                  </button>
                </form>

                {calcResult && (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Order Amount:</span>
                      <span className="font-mono text-white">Rs. {Number(calcResult.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">Calculated Discount:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        - Rs. {Number(calcResult.calculated_discount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-800/40 pt-1.5">
                      <span className="text-white font-bold">Net Total:</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        Rs. {(Number(calcResult.amount) - Number(calcResult.calculated_discount)).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800">
                      Evaluated via {calcResult.method}
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: ADBMS Engine Trigger & Stored Procedure Documentation */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-purple-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Database Objects Enforcing Campaign Rules</span>
                </div>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <p>
                    All promotional policies are backed by stored objects defined in{" "}
                    <code className="text-purple-300 font-mono">marketingmanager.sql</code>:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-400">
                    <li>
                      <strong className="text-white font-mono">create_promotion</strong>: Stored procedure handling
                      insertion into <code className="font-mono">promotions</code> with parameters{" "}
                      <code className="font-mono">(name, discount, start, end, product_id, category_id)</code>.
                    </li>
                    <li>
                      <strong className="text-white font-mono">active_promotions_vw</strong>: Real-time SQL view
                      dynamically filtering active records where{" "}
                      <code className="font-mono text-emerald-400">
                        is_active = 1 AND CURDATE() BETWEEN start_date AND end_date
                      </code>
                      .
                    </li>
                    <li>
                      <strong className="text-white font-mono">before_promotions_insert</strong>: Trigger automatically
                      preventing invalid discounts (<code className="font-mono">&gt; 100% or &lt;= 0%</code>) or end date
                      preceding start date.
                    </li>
                    <li>
                      <strong className="text-white font-mono">evt_daily_expire_promotions</strong>: MySQL scheduled event
                      deactivating expired campaigns automatically every night.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Create Promotion (CALL create_promotion) */}
      {/* ========================================================================= */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">New Promotion (create_promotion)</h3>
                  <p className="text-[11px] text-slate-400">Executes stored procedure create_promotion()</p>
                </div>
              </div>
              <button
                onClick={() => setPromoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Campaign Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Dairy Special 15%"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Discount Percent (%) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={newPromo.discount_percent}
                  onChange={(e) => setNewPromo({ ...newPromo, discount_percent: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white font-bold focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-slate-500">
                  Validated by trigger <code className="font-mono text-purple-400">before_promotions_insert</code> (1 - 100%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newPromo.start_date}
                    onChange={(e) => setNewPromo({ ...newPromo, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newPromo.end_date}
                    onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Target Scope</label>
                <select
                  value={newPromo.target_type}
                  onChange={(e) => setNewPromo({ ...newPromo, target_type: e.target.value, target_id: "" })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white mb-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="category">Category-wide</option>
                  <option value="product">Specific Product</option>
                  <option value="storewide">Store-wide (All products)</option>
                </select>

                {newPromo.target_type === "category" ? (
                  <select
                    value={newPromo.target_id}
                    onChange={(e) => setNewPromo({ ...newPromo, target_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : newPromo.target_type === "product" ? (
                  <select
                    value={newPromo.target_id}
                    onChange={(e) => setNewPromo({ ...newPromo, target_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} ({p.barcode})
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPromo}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creatingPromo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{creatingPromo ? "Launching..." : "Launch Promotion"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Discount Calculator (get_discount SQL function) */}
      {/* ========================================================================= */}
      {calcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Discount Calculator</h3>
                  <p className="text-[11px] text-slate-400">Executes SQL function get_discount(amount, promo_id)</p>
                </div>
              </div>
              <button
                onClick={() => setCalcModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCalculateDiscount} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Promotion <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={calcPromoId}
                  onChange={(e) => setCalcPromoId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Campaign --</option>
                  {promotions.map((p) => (
                    <option key={p.promo_id} value={p.promo_id}>
                      {p.name} ({Number(p.discount_percent)}%) - {(p as any).status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Order Subtotal Amount (Rs.) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCalcModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={calculatingDiscount}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {calculatingDiscount ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Calculator className="w-3.5 h-3.5" />
                  )}
                  <span>Calculate Discount</span>
                </button>
              </div>
            </form>

            {calcResult && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Order Amount:</span>
                  <span className="font-mono text-white">Rs. {Number(calcResult.amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">Calculated Discount:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    - Rs. {Number(calcResult.calculated_discount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-emerald-800/40 pt-1.5">
                  <span className="text-white font-bold">Net Total:</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    Rs. {(Number(calcResult.amount) - Number(calcResult.calculated_discount)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
