"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/context";
import {
  Ticket,
  Plus,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  X,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Users,
  Copy,
  Layers,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

interface CouponRow {
  coupon_id: number;
  code: string;
  promo_id: number;
  promo_name: string;
  discount_percent: number;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_card_no?: string | null;
  expiry_date?: string | null;
  is_used: number;
  used_at?: string | null;
  status: "AVAILABLE" | "REDEEMED" | "EXPIRED";
  days_until_expiry?: number | null;
}

export default function MarketingCouponsPage() {
  const { showToast } = useApp();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [summary, setSummary] = useState<any>({
    total_coupons: 0,
    available_coupons: 0,
    redeemed_coupons: 0,
    expired_coupons: 0,
    customer_bound_coupons: 0,
    redemption_rate: 0,
  });
  const [promotions, setPromotions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [openSales, setOpenSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'all' | 'customer_bound' | 'redeemed' | 'proc_tester'
  const [activeTab, setActiveTab] = useState<"all" | "customer_bound" | "redeemed" | "proc_tester">("all");

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "REDEEMED" | "EXPIRED">("ALL");

  // Modal 1: Issue Single Coupon
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    promo_id: "",
    customer_id: "",
    expiry_date: "",
  });

  // Modal 2: Batch Generate Coupons
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchForm, setBatchForm] = useState({
    prefix: "FESTIVE",
    count: "5",
    promo_id: "",
    expiry_date: "",
  });

  // Procedure Tester Form (CALL proc_apply_coupon)
  const [testSaleId, setTestSaleId] = useState<string>("");
  const [testCouponCode, setTestCouponCode] = useState<string>("");
  const [testingProc, setTestingProc] = useState(false);
  const [procResult, setProcResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  useEffect(() => {
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setNewCoupon((prev) => ({ ...prev, expiry_date: twoWeeks }));
    setBatchForm((prev) => ({ ...prev, expiry_date: twoWeeks }));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (data.summary) setSummary(data.summary);
      if (Array.isArray(data.promotions)) setPromotions(data.promotions);
      if (Array.isArray(data.customers)) setCustomers(data.customers);
      if (Array.isArray(data.openSales)) setOpenSales(data.openSales);
    } catch (err) {
      console.error("Error loading coupon management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate a random code for single issue
  const generateRandomCode = (prefix = "SAVE") => {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewCoupon((prev) => ({ ...prev, code: `${prefix}${rand}` }));
  };

  // Submit Issue Single Coupon
  const handleIssueCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.promo_id) {
      showToast("Code and linked promotion are required.", "error");
      return;
    }

    setIssuing(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_coupon",
          code: newCoupon.code.toUpperCase().trim(),
          promo_id: Number(newCoupon.promo_id),
          customer_id: newCoupon.customer_id ? Number(newCoupon.customer_id) : null,
          expiry_date: newCoupon.expiry_date || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Coupon "${newCoupon.code.toUpperCase()}" issued successfully!`, "success");
        setIssueModalOpen(false);
        setNewCoupon({
          code: "",
          promo_id: "",
          customer_id: "",
          expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        });
        await loadData();
      } else {
        showToast(data.error || "Failed to issue coupon", "error");
      }
    } catch {
      showToast("Error creating coupon", "error");
    } finally {
      setIssuing(false);
    }
  };

  // Submit Batch Generate Coupons
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.promo_id) {
      showToast("Please choose a linked promotion", "error");
      return;
    }

    setBatchGenerating(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_generate",
          prefix: batchForm.prefix.toUpperCase().trim(),
          count: parseInt(batchForm.count, 10),
          promo_id: Number(batchForm.promo_id),
          expiry_date: batchForm.expiry_date || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Batch generated ${data.count} coupons!`, "success");
        setBatchModalOpen(false);
        await loadData();
      } else {
        showToast(data.error || "Failed to batch generate coupons", "error");
      }
    } catch {
      showToast("Error generating batch coupons", "error");
    } finally {
      setBatchGenerating(false);
    }
  };

  // Submit Apply Coupon via proc_apply_coupon procedure
  const handleApplyCouponProc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSaleId || !testCouponCode) {
      showToast("Sale ID and Coupon Code are required", "error");
      return;
    }

    setTestingProc(true);
    setProcResult(null);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_coupon",
          sale_id: Number(testSaleId),
          code: testCouponCode.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProcResult({ success: true, message: data.message });
        showToast(data.message, "success");
        await loadData();
      } else {
        setProcResult({ success: false, error: data.error });
        showToast(data.error || "Coupon could not be applied", "error");
      }
    } catch (err: any) {
      setProcResult({ success: false, error: "Network or procedure invocation error" });
      showToast("Error executing proc_apply_coupon procedure", "error");
    } finally {
      setTestingProc(false);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (coupon_id: number, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon code "${code}"?`)) return;
    try {
      const res = await fetch(`/api/coupons?coupon_id=${coupon_id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Coupon deleted successfully", "success");
        await loadData();
      } else {
        showToast(data.error || "Failed to delete coupon", "error");
      }
    } catch {
      showToast("Error deleting coupon", "error");
    }
  };

  // Cleanup Expired Coupons
  const handleCleanupExpired = async () => {
    if (!confirm("Delete all expired unused coupons from the database?")) return;
    try {
      const res = await fetch("/api/coupons?cleanup_expired=true", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Expired coupons cleaned up successfully!", "success");
        await loadData();
      } else {
        showToast(data.error || "Failed to cleanup expired coupons", "error");
      }
    } catch {
      showToast("Error during cleanup", "error");
    }
  };

  // Copy code to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied "${text}" to clipboard!`, "info");
  };

  // Filtered Coupons list
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchesSearch =
        searchTerm === "" ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.promo_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer_card_no?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchTerm, statusFilter]);

  // Customer-bound only
  const customerBoundCoupons = coupons.filter((c) => c.customer_id != null);

  // Redeemed only
  const redeemedCoupons = coupons.filter((c) => c.is_used === 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-amber-400" />
            <span>Coupon Management & Redemption Tracking</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {summary.expired_coupons > 0 && (
            <button
              onClick={handleCleanupExpired}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
              title="Delete expired unused coupons"
            >
              Cleanup Expired ({summary.expired_coupons})
            </button>
          )}

          <button
            onClick={() => setBatchModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-all border border-slate-700 hover:scale-[1.02] active:scale-[0.98]"
            title="Generate multiple coupons at once"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Batch Generate</span>
          </button>

          <button
            onClick={() => {
              generateRandomCode("SAVE");
              setIssueModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-amber-950/40 border border-amber-500/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Coupon</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold">Total Issued</span>
          <div className="text-2xl font-black text-white font-mono">{summary.total_coupons}</div>
          <span className="text-[10px] text-slate-500">In database</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-1">
          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available to Redeem
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{summary.available_coupons}</div>
          <span className="text-[10px] text-emerald-500 font-mono">Ready for checkout</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-900/40 shadow-xl space-y-1">
          <span className="text-amber-400 text-xs font-semibold">Already Redeemed</span>
          <div className="text-2xl font-black text-amber-400 font-mono">{summary.redeemed_coupons}</div>
          <span className="text-[10px] text-amber-500 font-mono">{summary.redemption_rate}% redemption rate</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-900/40 shadow-xl space-y-1">
          <span className="text-indigo-400 text-xs font-semibold flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Customer-Bound
          </span>
          <div className="text-2xl font-black text-indigo-400 font-mono">{summary.customer_bound_coupons}</div>
          <span className="text-[10px] text-indigo-500 font-mono">Exclusive to members</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
          <span className="text-slate-400 text-xs font-semibold">Expired</span>
          <div className="text-2xl font-black text-slate-400 font-mono">{summary.expired_coupons}</div>
          <span className="text-[10px] text-slate-500 font-mono">Past expiry date</span>
        </div>
      </div>

      {/* Tabs & Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/30">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "all"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>All Coupons ({coupons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("customer_bound")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "customer_bound"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer-Bound VIP ({customerBoundCoupons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("redeemed")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "redeemed"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Redemption History ({redeemedCoupons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("proc_tester")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === "proc_tester"
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Procedure Tester (proc_apply_coupon)</span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors self-end md:self-auto"
            title="Refresh Coupon List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: All Coupons Table */}
        {/* ========================================================================= */}
        {activeTab === "all" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search code, promo, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-500" /> Status:
                </span>
                {(["ALL", "AVAILABLE", "REDEEMED", "EXPIRED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${statusFilter === s
                        ? "bg-amber-500 text-slate-950 shadow-md"
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
                    <th className="py-3 px-4 font-mono">Coupon Code</th>
                    <th className="py-3 px-4">Linked Promotion</th>
                    <th className="py-3 px-4 text-center">Discount %</th>
                    <th className="py-3 px-4">Customer Scope</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading checkout coupon codes...
                      </td>
                    </tr>
                  ) : filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        No coupons found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((cp) => (
                      <tr key={cp.coupon_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400 text-sm tracking-wider">{cp.code}</span>
                            <button
                              onClick={() => copyToClipboard(cp.code)}
                              className="text-slate-500 hover:text-slate-300 p-1 rounded"
                              title="Copy coupon code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          <div>{cp.promo_name || "Special Campaign"}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Promo #{cp.promo_id}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400 text-sm">
                          {Number(cp.discount_percent || 10)}%
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          {cp.customer_name ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 text-[11px]">
                              <Users className="w-3 h-3" />
                              <span>
                                {cp.customer_name} ({cp.customer_card_no})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Universal (Any Customer)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          <div>{cp.expiry_date ? new Date(cp.expiry_date).toLocaleDateString() : "No Expiry"}</div>
                          {cp.status === "AVAILABLE" && cp.days_until_expiry != null && (
                            <span className="text-[10px] text-amber-400 font-sans block">
                              {cp.days_until_expiry >= 0
                                ? `${cp.days_until_expiry} days left`
                                : "Expired"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${cp.status === "AVAILABLE"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                                : cp.status === "REDEEMED"
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-rose-950 text-rose-300 border border-rose-800/50"
                              }`}
                          >
                            {cp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            {cp.status === "AVAILABLE" && (
                              <button
                                onClick={() => {
                                  setTestCouponCode(cp.code);
                                  setActiveTab("proc_tester");
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/20 transition-all"
                                title="Test apply with proc_apply_coupon"
                              >
                                Test Apply
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteCoupon(cp.coupon_id, cp.code)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Customer-Bound VIP Coupons */}
        {/* ========================================================================= */}
        {activeTab === "customer_bound" && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-950/20 border-b border-indigo-800/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-300 font-semibold">
                  Personalized Customer Coupons (customer_id IS NOT NULL)
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  — The stored procedure <code className="text-indigo-400 font-mono">proc_apply_coupon()</code> enforces
                  that only the designated customer can redeem this code.
                </span>
              </div>
              <span className="font-mono font-bold text-indigo-400">{customerBoundCoupons.length} vouchers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                    <th className="py-3 px-4 font-mono">Coupon Code</th>
                    <th className="py-3 px-4">Designated Customer</th>
                    <th className="py-3 px-4">Card No</th>
                    <th className="py-3 px-4">Campaign Offer</th>
                    <th className="py-3 px-4 text-center">Discount</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {customerBoundCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        No customer-bound coupons issued yet. When creating a coupon, select a customer from the dropdown.
                      </td>
                    </tr>
                  ) : (
                    customerBoundCoupons.map((cp) => (
                      <tr key={cp.coupon_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-amber-400 text-sm tracking-wider">{cp.code}</td>
                        <td className="py-3 px-4 font-sans font-medium text-white">{cp.customer_name}</td>
                        <td className="py-3 px-4 text-indigo-400 font-bold">{cp.customer_card_no}</td>
                        <td className="py-3 px-4 font-sans text-slate-300">{cp.promo_name}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400">
                          {Number(cp.discount_percent || 10)}% OFF
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {cp.expiry_date ? new Date(cp.expiry_date).toLocaleDateString() : "No Expiry"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${cp.status === "AVAILABLE"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                                : cp.status === "REDEEMED"
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-rose-950 text-rose-300 border border-rose-800/50"
                              }`}
                          >
                            {cp.status}
                          </span>
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
        {/* TAB 3: Redemption History */}
        {/* ========================================================================= */}
        {activeTab === "redeemed" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                  <th className="py-3 px-4 font-mono">Coupon Code</th>
                  <th className="py-3 px-4">Campaign Offer</th>
                  <th className="py-3 px-4 text-center">Discount Applied</th>
                  <th className="py-3 px-4">Redeemed By</th>
                  <th className="py-3 px-4">Redemption Timestamp (used_at)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {redeemedCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      No redeemed coupons recorded yet. Once checkout sales redeem coupons via proc_apply_coupon, they will appear here.
                    </td>
                  </tr>
                ) : (
                  redeemedCoupons.map((cp) => (
                    <tr key={cp.coupon_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-400">{cp.code}</td>
                      <td className="py-3 px-4 font-sans text-white">{cp.promo_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">
                        {Number(cp.discount_percent || 10)}%
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {cp.customer_name ? `${cp.customer_name} (${cp.customer_card_no})` : "General Customer"}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {cp.used_at ? new Date(cp.used_at).toLocaleString() : "Recently used"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400">
                          REDEEMED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: Procedure Tester (proc_apply_coupon) */}
        {/* ========================================================================= */}
        {activeTab === "proc_tester" && (
          <div className="p-6 space-y-6">
            <div className="max-w-2xl mx-auto">
              {/* Form Box */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm">Procedure: proc_apply_coupon(p_sale_id, p_code)</h3>
                    <p className="text-[11px] text-slate-400">
                      Executes transactional locks, verifies coupon and applies discount to an open sale
                    </p>
                  </div>
                </div>

                <form onSubmit={handleApplyCouponProc} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Select Open Sale or Enter Sale ID <span className="text-rose-400">*</span>
                    </label>
                    {openSales.length > 0 ? (
                      <select
                        value={testSaleId}
                        onChange={(e) => setTestSaleId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 mb-2"
                      >
                        <option value="">-- Choose an Open Sale --</option>
                        {openSales.map((s) => (
                          <option key={s.sale_id} value={s.sale_id}>
                            Sale #{s.sale_id} — {s.customer_name ? `${s.customer_name} (${s.card_no})` : "Walk-in"}{" "}
                            (Subtotal: Rs. {Number(s.subtotal).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <input
                      type="number"
                      placeholder="Or enter manual sale_id (e.g. 1)"
                      value={testSaleId}
                      onChange={(e) => setTestSaleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Coupon Code <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FESTIVE20"
                      value={testCouponCode}
                      onChange={(e) => setTestCouponCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-sm text-amber-300 font-bold focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testingProc}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 disabled:opacity-50"
                  >
                    {testingProc ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Execute CALL proc_apply_coupon()</span>
                  </button>
                </form>

                {procResult && (
                  <div
                    className={`p-4 rounded-xl text-xs space-y-1 animate-in fade-in ${procResult.success
                        ? "bg-emerald-950/30 border border-emerald-800/40 text-emerald-300"
                        : "bg-rose-950/30 border border-rose-800/40 text-rose-300"
                      }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {procResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{procResult.success ? "Procedure Executed Successfully" : "Stored Procedure Validation Error"}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{procResult.message || procResult.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Issue Single Coupon */}
      {/* ========================================================================= */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Issue Single Checkout Coupon</h3>
                  <p className="text-[11px] text-slate-400">Creates a voucher code linked to a campaign</p>
                </div>
              </div>
              <button
                onClick={() => setIssueModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueCoupon} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300 font-semibold">
                    Coupon Code <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => generateRandomCode("SAVE")}
                    className="text-[10px] text-amber-400 hover:underline font-semibold"
                  >
                    Random Code
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Link to Campaign Offer <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={newCoupon.promo_id}
                  onChange={(e) => setNewCoupon({ ...newCoupon, promo_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Campaign Promotion --</option>
                  {promotions.map((p) => (
                    <option key={p.promo_id} value={p.promo_id}>
                      {p.name} ({Number(p.discount_percent)}% OFF)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Assign to Customer (Optional VIP Binding)
                </label>
                <select
                  value={newCoupon.customer_id}
                  onChange={(e) => setNewCoupon({ ...newCoupon, customer_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Universal (Any customer can redeem)</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.card_no} - {c.full_name} ({c.tier})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500">
                  If selected, only this customer will be able to apply the coupon.
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={newCoupon.expiry_date}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {issuing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                  <span>{issuing ? "Issuing..." : "Save & Issue Coupon"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Batch Generate Coupons */}
      {/* ========================================================================= */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Batch Generate Coupon Codes</h3>
                  <p className="text-[11px] text-slate-400">Creates multiple unique codes in bulk</p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Code Prefix</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP"
                    value={batchForm.prefix}
                    onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Quantity (Max 20)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={batchForm.count}
                    onChange={(e) => setBatchForm({ ...batchForm, count: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Link to Campaign Offer <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={batchForm.promo_id}
                  onChange={(e) => setBatchForm({ ...batchForm, promo_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Campaign Promotion --</option>
                  {promotions.map((p) => (
                    <option key={p.promo_id} value={p.promo_id}>
                      {p.name} ({Number(p.discount_percent)}% OFF)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={batchForm.expiry_date}
                  onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchGenerating}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {batchGenerating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Layers className="w-3.5 h-3.5" />
                  )}
                  <span>{batchGenerating ? "Generating..." : "Generate Codes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
