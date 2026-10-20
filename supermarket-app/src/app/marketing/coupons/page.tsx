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


      {/* Coupons Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
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
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-1.5 ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Refresh Coupon List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
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
