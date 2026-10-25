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
  Power,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  Store,
  Pencil,
  Trash2,
  Database,
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

  // Filters, Search & Stored Procedure Modes
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SCHEDULED" | "EXPIRED">("ALL");
  const [filterMode, setFilterMode] = useState<"ALL" | "ACTIVE" | "DEACTIVE">("ALL");
  const [activeProcedureName, setActiveProcedureName] = useState<string | null>(null);
  const [allPromotionsCache, setAllPromotionsCache] = useState<Promotion[]>([]);

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

  // Edit Promo Modal (Scheduled Edit or Active End Date Extension)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [updatingPromo, setUpdatingPromo] = useState(false);
  const [editPromo, setEditPromo] = useState<{
    promo_id: number;
    name: string;
    start_date: string;
    end_date: string;
    discount_percent: string | number;
    status: string;
  }>({
    promo_id: 0,
    name: "",
    start_date: "",
    end_date: "",
    discount_percent: "10",
    status: "SCHEDULED",
  });

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
      if (data.promotions) {
        setPromotions(data.promotions);
        setAllPromotionsCache(data.promotions);
      }
      if (data.activePromotions) setActivePromotions(data.activePromotions);
      setActiveProcedureName(null);
      setFilterMode("ALL");
      setStatusFilter("ALL");
    } catch (err) {
      console.error("Error fetching promotions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFilter = async (mode: "ALL" | "ACTIVE" | "DEACTIVE") => {
    setFilterMode(mode);
    setLoading(true);
    try {
      if (mode === "ACTIVE") {
        setStatusFilter("ACTIVE");
        const res = await fetch("/api/promotions?view=active_proc");
        const data = await res.json();
        if (data.promotions) {
          setPromotions(data.promotions);
          setActiveProcedureName("CALL get_active_promotions()");
        }
      } else if (mode === "DEACTIVE") {
        setStatusFilter("ALL");
        const res = await fetch("/api/promotions?view=deactive_proc");
        const data = await res.json();
        if (data.promotions) {
          setPromotions(data.promotions);
          setActiveProcedureName("CALL get_deactive_promotions()");
        }
      } else {
        setStatusFilter("ALL");
        const res = await fetch("/api/promotions");
        const data = await res.json();
        if (data.promotions) {
          setPromotions(data.promotions);
          setAllPromotionsCache(data.promotions);
          setActiveProcedureName(null);
        }
      }
    } catch (err) {
      console.error("Error executing procedure for promotions:", err);
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



  // Open Edit Modal for Scheduled or Active Promotion
  const handleOpenEditModal = (pr: Promotion) => {
    const formatDateForInput = (val: any) => {
      if (!val) return "";
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        return val.slice(0, 10);
      }
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        }
      } catch {}
      return "";
    };

    const status = (pr as any).status || "ACTIVE";

    setEditPromo({
      promo_id: pr.promo_id,
      name: pr.name,
      start_date: formatDateForInput(pr.start_date),
      end_date: formatDateForInput(pr.end_date),
      discount_percent: pr.discount_percent,
      status,
    });
    setEditModalOpen(true);
  };

  // Deactivate an Active Promotion (immediately sets is_active = 0, moving it to EXPIRED)
  const handleDeactivatePromo = async (promo_id: number, name: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate promotion "${name}"? This will immediately end the campaign.`
      )
    ) {
      return;
    }
    setUpdatingPromo(true);
    try {
      const res = await fetch("/api/promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_id, is_active: 0 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Promotion "${name}" deactivated successfully!`, "success");
        if (editModalOpen) setEditModalOpen(false);
        await fetchData();
      } else {
        showToast(data.error || "Failed to deactivate promotion", "error");
      }
    } catch {
      showToast("Error deactivating promotion", "error");
    } finally {
      setUpdatingPromo(false);
    }
  };

  // Update Promotion (Scheduled Edit or Active End Date Extension) in Backend Table
  const handleUpdatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPromo.end_date) {
      showToast("End date is required", "error");
      return;
    }
    if (editPromo.end_date < editPromo.start_date) {
      showToast("End date cannot precede start date", "error");
      return;
    }

    setUpdatingPromo(true);
    try {
      const payload: any = {
        promo_id: editPromo.promo_id,
        end_date: editPromo.end_date,
      };

      if (editPromo.status === "SCHEDULED") {
        if (!editPromo.name.trim()) {
          showToast("Promotion name cannot be empty", "error");
          setUpdatingPromo(false);
          return;
        }
        payload.name = editPromo.name.trim();
        payload.start_date = editPromo.start_date;
        payload.discount_percent = editPromo.discount_percent;
      }

      const res = await fetch("/api/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          editPromo.status === "ACTIVE"
            ? `Promotion #${editPromo.promo_id} end date extended successfully!`
            : `Promotion #${editPromo.promo_id} updated successfully!`,
          "success"
        );
        setEditModalOpen(false);
        await fetchData();
      } else {
        showToast(data.error || "Failed to update promotion", "error");
      }
    } catch {
      showToast("Error updating promotion", "error");
    } finally {
      setUpdatingPromo(false);
    }
  };

  // Delete Expired Promotion from Backend Promotion Table
  const [deletingPromoId, setDeletingPromoId] = useState<number | null>(null);

  const handleDeletePromo = async (promo_id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete expired promotion "${name}" (#${promo_id}) from the database?`)) {
      return;
    }
    setDeletingPromoId(promo_id);
    try {
      const res = await fetch(`/api/promotions?promo_id=${promo_id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Expired promotion "${name}" deleted from backend table!`, "success");
        await fetchData();
      } else {
        showToast(data.error || "Failed to delete promotion", "error");
      }
    } catch {
      showToast("Error deleting promotion from database", "error");
    } finally {
      setDeletingPromoId(null);
    }
  };

  // Compute status counts for the top 4 status cards
  const statusCounts = useMemo(() => {
    const list = allPromotionsCache.length > 0 ? allPromotionsCache : promotions;
    let all = list.length;
    let active = 0;
    let scheduled = 0;
    let expired = 0;

    list.forEach((p) => {
      const s = p.status || "ACTIVE";
      if (s === "ACTIVE") active++;
      else if (s === "SCHEDULED") scheduled++;
      else if (s === "EXPIRED" || s === "DEACTIVATED") expired++;
    });

    return { all, active, scheduled, expired };
  }, [allPromotionsCache, promotions]);

  // Filtered promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const matchesSearch =
        searchTerm === "" ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category_name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // When in ACTIVE or DEACTIVE procedure mode, the list is already scoped from the procedure
      if (filterMode === "ACTIVE" || filterMode === "DEACTIVE") {
        return true;
      }

      const status = p.status || "ACTIVE";
      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter ||
        (statusFilter === "EXPIRED" && status === "DEACTIVATED");

      return matchesStatus;
    });
  }, [promotions, searchTerm, filterMode, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-purple-600" />
            <span>Campaign & Promotion Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, schedule, and track customer promotional discount campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setPromoModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Create promotion via stored procedure create_promotion()"
          >
            <Plus className="w-4 h-4" />
            <span>New Promotion</span>
          </button>
        </div>
      </div>

      {/* 4 Status Filter Cards (ALL, ACTIVE, SCHEDULED, EXPIRED) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ALL */}
        <div
          onClick={() => handleSelectFilter("ALL")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectFilter("ALL"); }}
          className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] select-none ${
            filterMode === "ALL" && statusFilter === "ALL"
              ? "bg-purple-50/70 border-purple-500 ring-2 ring-purple-100"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Promotions</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                filterMode === "ALL" && statusFilter === "ALL"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {loading ? "..." : statusCounts.all}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-500">
                All registered campaigns
              </span>
              {filterMode === "ALL" && statusFilter === "ALL" && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                  Active Filter
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: ACTIVE (CALL get_active_promotions) */}
        <div
          onClick={() => handleSelectFilter("ACTIVE")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectFilter("ACTIVE"); }}
          className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] select-none ${
            filterMode === "ACTIVE"
              ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-100"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Active promotions</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                filterMode === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-700 font-mono tracking-tight">
              {loading ? "..." : statusCounts.active}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-500">
                Out of {statusCounts.all} total campaigns
              </span>
              {filterMode === "ACTIVE" && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active (Procedure)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: SCHEDULED */}
        <div
          onClick={() => {
            if (filterMode !== "ALL") {
              setFilterMode("ALL");
              setActiveProcedureName(null);
            }
            setStatusFilter("SCHEDULED");
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setStatusFilter("SCHEDULED"); }}
          className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] select-none ${
            filterMode === "ALL" && statusFilter === "SCHEDULED"
              ? "bg-sky-50/70 border-sky-500 ring-2 ring-sky-100"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Scheduled Promotions</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                filterMode === "ALL" && statusFilter === "SCHEDULED"
                  ? "bg-sky-100 text-sky-700"
                  : "bg-sky-50 text-sky-600"
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-sky-700 font-mono tracking-tight">
              {loading ? "..." : statusCounts.scheduled}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-500">
                Upcoming campaign launches
              </span>
              {filterMode === "ALL" && statusFilter === "SCHEDULED" && (
                <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                  Active Filter
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: EXPIRED */}
        <div
          onClick={() => {
            if (filterMode !== "ALL") {
              setFilterMode("ALL");
              setActiveProcedureName(null);
            }
            setStatusFilter("EXPIRED");
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setStatusFilter("EXPIRED"); }}
          className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] select-none ${
            filterMode === "ALL" && statusFilter === "EXPIRED"
              ? "bg-rose-50/70 border-rose-500 ring-2 ring-rose-100"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Expired Promotions</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                filterMode === "ALL" && statusFilter === "EXPIRED"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-700 font-mono tracking-tight">
              {loading ? "..." : statusCounts.expired}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-500">
                Past or concluded campaigns
              </span>
              {filterMode === "ALL" && statusFilter === "EXPIRED" && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                  Active Filter
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Promotions Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="space-y-4">
          {/* Search & Actions Bar with Active/Deactive Procedure Selector */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search promo name, category, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Option to select Active and Deactive procedures */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectFilter(filterMode === "ACTIVE" ? "ALL" : "ACTIVE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filterMode === "ACTIVE"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-emerald-700 hover:bg-white"
                  }`}
                  title="Execute CALL get_active_promotions()"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFilter(filterMode === "DEACTIVE" ? "ALL" : "DEACTIVE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filterMode === "DEACTIVE"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-rose-700 hover:bg-white"
                  }`}
                  title="Execute CALL get_deactive_promotions()"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Deactive</span>
                </button>
              </div>

              <button
                onClick={() => handleSelectFilter(filterMode)}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-all text-xs flex items-center gap-1.5 font-medium"
                title="Refresh Promotions Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Procedure Active Indicator Banner */}
          {activeProcedureName && (
            <div className="px-4 py-2 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between text-xs text-purple-900 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-mono text-purple-700 font-bold">{activeProcedureName}</span>
                <span className="text-[11px] text-purple-600">
                  {filterMode === "ACTIVE"
                    ? "— Displaying active campaigns returned by stored procedure"
                    : "— Displaying deactivated, scheduled, and expired campaigns returned by stored procedure"}
                </span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-purple-100 border border-purple-200 text-purple-800 font-semibold">
                {filteredPromotions.length} campaign{filteredPromotions.length === 1 ? "" : "s"}
              </span>
            </div>
          )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Promotion Name</th>
                    <th className="py-3 px-4 text-center">Discount %</th>
                    <th className="py-3 px-4">Target Scope</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
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
                        <tr key={pr.promo_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-sans font-bold text-slate-900">
                            <div>{pr.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: #{pr.promo_id}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700 text-sm">
                            {Number(pr.discount_percent)}% OFF
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-sans">
                            {pr.product_name ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                                <Package className="w-3 h-3" />
                                <span>Product: {pr.product_name}</span>
                              </span>
                            ) : pr.category_name ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                                <Layers className="w-3 h-3" />
                                <span>Category: {pr.category_name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Store-wide (All items)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[11px]">
                            {new Date(pr.start_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[11px]">
                            <div>{new Date(pr.end_date).toLocaleDateString()}</div>
                            {status === "ACTIVE" && (
                              <span className="text-[10px] text-emerald-700 font-sans block font-semibold">
                                {daysLeft >= 0 ? `${daysLeft} days remaining` : "Expiring today"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : status === "SCHEDULED"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : status === "DEACTIVATED"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              {/* If Scheduled: Edit All Details */}
                              {status === "SCHEDULED" && (
                                <button
                                  onClick={() => handleOpenEditModal(pr)}
                                  className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 transition-colors"
                                  title="Edit Scheduled Promotion (Name, Start Date, End Date)"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* If Active: Extend End Date & Deactivate */}
                              {status === "ACTIVE" && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(pr)}
                                    className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                                    title="Extend End Date / Edit Campaign"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeactivatePromo(pr.promo_id, pr.name)}
                                    className="p-1.5 rounded-lg text-amber-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Deactivate Promotion (End campaign immediately)"
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* If Expired or Deactivated: Delete option to update backend promotion table */}
                              {(status === "EXPIRED" || status === "DEACTIVATED") && (
                                <button
                                  onClick={() => handleDeletePromo(pr.promo_id, pr.name)}
                                  disabled={deletingPromoId === pr.promo_id}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                  title="Delete promotion from database"
                                >
                                  {deletingPromoId === pr.promo_id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Other */}
                              {status !== "SCHEDULED" && status !== "ACTIVE" && status !== "EXPIRED" && status !== "DEACTIVATED" && (
                                <span className="text-slate-600 text-[11px] font-mono px-1.5">—</span>
                              )}
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
        </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Create Promotion (CALL create_promotion) */}
      {/* ========================================================================= */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">New Promotion (create_promotion)</h3>
                  <p className="text-[11px] text-slate-500">Executes stored procedure create_promotion()</p>
                </div>
              </div>
              <button
                onClick={() => setPromoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Campaign Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Dairy Special 15%"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Discount Percent (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={newPromo.discount_percent}
                  onChange={(e) => setNewPromo({ ...newPromo, discount_percent: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 font-bold shadow-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                />
                <span className="text-[10px] text-slate-500">
                  Validated by trigger <code className="font-mono text-purple-600">before_promotions_insert</code> (1 - 100%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newPromo.start_date}
                    onChange={(e) => setNewPromo({ ...newPromo, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newPromo.end_date}
                    onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Scope</label>
                <select
                  value={newPromo.target_type}
                  onChange={(e) => setNewPromo({ ...newPromo, target_type: e.target.value, target_id: "" })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 mb-2 shadow-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="category">Category-wide</option>
                  <option value="product">Specific Product</option>
                  <option value="storewide">Store-wide (All products)</option>
                </select>

                {newPromo.target_type === "category" ? (
                  <select
                    value={newPromo.target_id}
                    onChange={(e) => setNewPromo({ ...newPromo, target_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
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
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
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

              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPromo}
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
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
      {/* MODAL 2: Edit Promotion (Scheduled Edit or Active End Date Extension) */}
      {/* ========================================================================= */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    editPromo.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-sky-50 text-sky-700 border border-sky-200"
                  }`}
                >
                  {editPromo.status === "ACTIVE" ? (
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Pencil className="w-5 h-5 text-sky-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editPromo.status === "ACTIVE"
                      ? "Extend Active Promotion"
                      : "Edit Scheduled Promotion"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Campaign ID: #{editPromo.promo_id} • Status:{" "}
                    <span
                      className={
                        editPromo.status === "ACTIVE"
                          ? "text-emerald-700 font-bold"
                          : "text-sky-700 font-bold"
                      }
                    >
                      {editPromo.status}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePromo} className="space-y-4">
              {editPromo.status === "ACTIVE" ? (
                /* Active Promotion: Read-only Campaign Info, only End Date is editable */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Campaign Details</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Promotion
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{editPromo.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Started: {editPromo.start_date ? new Date(editPromo.start_date).toLocaleDateString() : "—"}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Extend End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={editPromo.end_date}
                      onChange={(e) =>
                        setEditPromo((prev) => ({ ...prev, end_date: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-xs focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Choose a future date to prolong this running campaign.
                    </span>
                  </div>
                </div>
              ) : (
                /* Scheduled Promotion: Name, Start Date, and End Date are editable */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Campaign Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Summer Kickoff Sale"
                      value={editPromo.name}
                      onChange={(e) =>
                        setEditPromo((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Start Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={editPromo.start_date}
                        onChange={(e) =>
                          setEditPromo((prev) => ({ ...prev, start_date: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-xs focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        End Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={editPromo.start_date}
                        value={editPromo.end_date}
                        onChange={(e) =>
                          setEditPromo((prev) => ({ ...prev, end_date: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-xs focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editPromo.status === "ACTIVE" ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Extending Active Campaign</span>
                    Select a new end date to extend this running campaign. The new end date will be updated immediately in the promotion table.
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-800 flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Scheduled Promotion Update</span>
                    Modifications apply directly to the promotions table in the database before the campaign goes live.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {editPromo.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeactivatePromo(editPromo.promo_id, editPromo.name)
                    }
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Deactivate campaign immediately"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Deactivate</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {editPromo.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => setEditModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={updatingPromo}
                    className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg ${
                      editPromo.status === "ACTIVE"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/40"
                        : "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-950/40"
                    }`}
                  >
                    {updatingPromo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {editPromo.status === "ACTIVE"
                            ? "Extend End Date"
                            : "Update Promotion"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
