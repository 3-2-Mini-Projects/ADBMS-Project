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
  Phone,
  MessageSquare,
  Send,
  Award,
  Clock,
  ArrowRight,
  Eye,
  Check,
  Zap,
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
  customer_phone?: string | null;
  customer_tier?: string | null;
  customer_points?: number | null;
  expiry_date?: string | null;
  is_used: number;
  used_at?: string | null;
  max_products?: number;
  purchase_limit?: number;
  sms_phone?: string | null;
  sms_status?: string | null;
  sms_message?: string | null;
  created_at?: string | null;
  status: "AVAILABLE" | "REDEEMED" | "EXPIRED";
  days_until_expiry?: number | null;
}

interface TopCustomer {
  customer_id: number;
  card_no: string;
  full_name: string;
  phone: string;
  email?: string;
  city?: string;
  tier: string;
  points_balance: number;
  total_spent?: number;
  total_orders?: number;
  active_coupons?: number;
}

export default function MarketingCouponsPage() {
  const { showToast } = useApp();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [top10Customers, setTop10Customers] = useState<TopCustomer[]>([]);
  const [summary, setSummary] = useState<any>({
    total_coupons: 0,
    available_coupons: 0,
    redeemed_coupons: 0,
    expired_coupons: 0,
    customer_bound_coupons: 0,
    sms_sent_count: 0,
    redemption_rate: 0,
  });
  const [promotions, setPromotions] = useState<any[]>([]);
  const [openSales, setOpenSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "REDEEMED" | "EXPIRED" | "TOP10">("ALL");

  // Helper for 2 months expiry
  const getTwoMonthsFromNow = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().split("T")[0];
  };

  // Modal 1: Issue Single Coupon
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    promo_id: "",
    customer_id: "",
    phone: "",
    expiry_date: getTwoMonthsFromNow(),
    max_products: 5,
    purchase_limit: 3000,
    custom_sms: "",
  });

  // Modal 2: Batch Allocate to Top 10
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchPromoId, setBatchPromoId] = useState("");
  const [batchPrefix, setBatchPrefix] = useState("TOP10");

  // Modal 3: View SMS Sent Message
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [selectedSms, setSelectedSms] = useState<{
    code: string;
    phone: string;
    customer_name: string;
    message: string;
    status: string;
    expiry_date?: string;
  } | null>(null);
  const [resendingSms, setResendingSms] = useState(false);

  // Modal 4: Procedure Tester Form (CALL proc_apply_coupon)
  const [procModalOpen, setProcModalOpen] = useState(false);
  const [testSaleId, setTestSaleId] = useState<string>("");
  const [testCouponCode, setTestCouponCode] = useState<string>("");
  const [testingProc, setTestingProc] = useState(false);
  const [procResult, setProcResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (Array.isArray(data.top10Customers)) setTop10Customers(data.top10Customers);
      if (data.summary) setSummary(data.summary);
      if (Array.isArray(data.promotions)) setPromotions(data.promotions);
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
  const generateRandomCode = (prefix = "VIP10") => {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewCoupon((prev) => ({ ...prev, code: `${prefix}-${rand}` }));
  };

  // Open Issue Modal for a specific top customer
  const handleQuickIssue = (cust: TopCustomer) => {
    const cleanCard = (cust.card_no || "").replace(/[^A-Z0-9]/gi, "").slice(-4) || "VIP";
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewCoupon({
      code: `TOP10-${cleanCard}-${rand}`,
      promo_id: promotions.length > 0 ? String(promotions[0].promo_id) : "",
      customer_id: String(cust.customer_id),
      phone: cust.phone || "",
      expiry_date: getTwoMonthsFromNow(),
      max_products: 5,
      purchase_limit: 3000,
      custom_sms: "",
    });
    setIssueModalOpen(true);
  };

  // When customer changes in the Issue Modal, sync phone
  const handleCustomerSelectionChange = (custId: string) => {
    const found = top10Customers.find((c) => String(c.customer_id) === custId);
    setNewCoupon((prev) => ({
      ...prev,
      customer_id: custId,
      phone: found?.phone || prev.phone,
    }));
  };

  // Current selected customer details for single issue
  const selectedCustomerObj = useMemo(() => {
    return top10Customers.find((c) => String(c.customer_id) === String(newCoupon.customer_id));
  }, [top10Customers, newCoupon.customer_id]);

  // Live dynamic SMS preview
  const liveSmsPreview = useMemo(() => {
    if (newCoupon.custom_sms && newCoupon.custom_sms.trim()) {
      return newCoupon.custom_sms.trim();
    }
    const name = selectedCustomerObj ? selectedCustomerObj.full_name : "Valued VIP Customer";
    const code = newCoupon.code || "COUPON-CODE";
    const expiry = newCoupon.expiry_date || getTwoMonthsFromNow();
    return `Congratulations ${name}! You have won the exclusive coupon "${code}". You can purchase up to ${newCoupon.max_products} products with a limit of LKR ${Number(newCoupon.purchase_limit).toLocaleString()}. Valid for 2 months (expires ${expiry}). One-time use only!`;
  }, [newCoupon, selectedCustomerObj]);

  // Submit Issue Single Coupon
  const handleIssueCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.promo_id) {
      showToast("Coupon code and linked promotion are required.", "error");
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
          phone: newCoupon.phone.trim() || null,
          expiry_date: newCoupon.expiry_date || getTwoMonthsFromNow(),
          max_products: Number(newCoupon.max_products) || 5,
          purchase_limit: Number(newCoupon.purchase_limit) || 3000,
          custom_sms: newCoupon.custom_sms || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Coupon issued and SMS sent to ${newCoupon.phone || 'customer'}!`, "success");
        setIssueModalOpen(false);
        setNewCoupon({
          code: "",
          promo_id: "",
          customer_id: "",
          phone: "",
          expiry_date: getTwoMonthsFromNow(),
          max_products: 5,
          purchase_limit: 3000,
          custom_sms: "",
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

  // Submit Batch Allocate to all Top 10
  const handleBatchTop10 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchPromoId) {
      showToast("Please choose a campaign promotion offer", "error");
      return;
    }

    setBatchGenerating(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_top10",
          promo_id: Number(batchPromoId),
          prefix: batchPrefix.toUpperCase().trim() || "TOP10",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Allocated coupons to all Top 10 VIP customers!`, "success");
        setBatchModalOpen(false);
        await loadData();
      } else {
        showToast(data.error || "Failed to allocate batch coupons", "error");
      }
    } catch {
      showToast("Error allocating batch coupons", "error");
    } finally {
      setBatchGenerating(false);
    }
  };

  // Resend SMS for coupon
  const handleResendSms = async (coupon_id: number) => {
    setResendingSms(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend_sms",
          coupon_id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "SMS resent successfully!", "success");
        await loadData();
      } else {
        showToast(data.error || "Failed to resend SMS", "error");
      }
    } catch {
      showToast("Error resending SMS", "error");
    } finally {
      setResendingSms(false);
    }
  };

  // Submit Apply Coupon via procedure test
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
    } catch {
      setProcResult({ success: false, error: "Network or procedure invocation error" });
      showToast("Error executing coupon application", "error");
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
        c.customer_card_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sms_phone?.includes(searchTerm);

      let matchesStatus = true;
      if (statusFilter === "AVAILABLE") matchesStatus = c.status === "AVAILABLE";
      else if (statusFilter === "REDEEMED") matchesStatus = c.status === "REDEEMED";
      else if (statusFilter === "EXPIRED") matchesStatus = c.status === "EXPIRED";
      else if (statusFilter === "TOP10") matchesStatus = c.customer_id != null;

      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-amber-400" />
            <span>Top 10 VIP Coupon & SMS Management</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              if (promotions.length > 0) setBatchPromoId(String(promotions[0].promo_id));
              setBatchModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-emerald-200" />
            <span>Award All Top 10 VIPs</span>
          </button>

          <button
            onClick={() => {
              generateRandomCode("TOP10");
              if (top10Customers.length > 0) {
                setNewCoupon((prev) => ({
                  ...prev,
                  customer_id: String(top10Customers[0].customer_id),
                  phone: top10Customers[0].phone || "",
                  promo_id: promotions.length > 0 ? String(promotions[0].promo_id) : "",
                }));
              }
              setIssueModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-amber-950/40 border border-amber-500/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Single VIP Coupon</span>
          </button>


          <button
            onClick={handleCleanupExpired}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-800 transition-colors"
            title="Clean Expired Coupons"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>





      {/* ========================================================================= */}
      {/* COUPONS TABLE CONTAINER */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search code, customer, phone, promo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-500" /> Filter:
              </span>
              {(["ALL", "AVAILABLE", "REDEEMED", "EXPIRED", "TOP10"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${statusFilter === s
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                >
                  {s === "TOP10" ? "⭐ TOP 10 ONLY" : s}
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
                  <th className="py-3 px-4">Campaign Offer</th>
                  <th className="py-3 px-4">Top 10 VIP Recipient</th>
                  <th className="py-3 px-4">SMS Notification</th>
                  <th className="py-3 px-4">Usage Constraints</th>
                  <th className="py-3 px-4">Validity (2 Mo)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Loading coupons and SMS records...
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      No coupons found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((cp) => (
                    <tr key={cp.coupon_id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-400 text-sm tracking-wider">{cp.code}</span>
                          <button
                            onClick={() => copyToClipboard(cp.code)}
                            className="text-slate-500 hover:text-slate-300 p-1 rounded"
                            title="Copy code"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          1-TIME USE ONLY
                        </span>
                      </td>

                      {/* Promo */}
                      <td className="py-3 px-4 font-sans font-medium text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{cp.promo_name || "Special Campaign"}</span>
                          <span className="font-mono text-emerald-400 font-bold text-xs">
                            ({Number(cp.discount_percent || 10)}% OFF)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Promo ID #{cp.promo_id}</div>
                      </td>

                      {/* Customer Scope */}
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {cp.customer_name ? (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/40 text-[11px] font-medium">
                              <Award className="w-3 h-3 text-amber-400" />
                              <span>{cp.customer_name}</span>
                              <span className="font-mono text-[10px] text-amber-400/80">({cp.customer_card_no})</span>
                            </div>
                            {cp.sms_phone && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-emerald-400" />
                                <span>{cp.sms_phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Universal Coupon</span>
                        )}
                      </td>

                      {/* SMS Status */}
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSms({
                                code: cp.code,
                                phone: cp.sms_phone || cp.customer_phone || "Not set",
                                customer_name: cp.customer_name || "Valued Customer",
                                message:
                                  cp.sms_message ||
                                  `Congratulations ${cp.customer_name || 'Customer'}! You have won the coupon ${cp.code}. Valid for 2 months. You can purchase up to 5 products with a limit of LKR 3,000. One-time use only.`,
                                status: cp.sms_status || "SENT",
                                expiry_date: cp.expiry_date || undefined,
                              });
                              setSmsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/40 text-[11px] hover:bg-teal-900/60 transition-colors"
                            title="Click to view full SMS message"
                          >
                            <MessageSquare className="w-3 h-3 text-teal-400" />
                            <span>SMS Sent</span>
                            <Eye className="w-3 h-3 ml-0.5 opacity-70" />
                          </button>
                        </div>
                      </td>

                      {/* Usage Constraints */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-emerald-400 font-semibold flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-emerald-500" />
                          <span>Max {cp.max_products || 5} Products</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Limit: LKR {Number(cp.purchase_limit || 3000).toLocaleString()}
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        <div className="text-white font-medium">
                          {cp.expiry_date ? new Date(cp.expiry_date).toLocaleDateString() : "No Expiry"}
                        </div>
                        {cp.status === "AVAILABLE" && cp.days_until_expiry != null && (
                          <span className="text-[10px] text-amber-400 font-sans block">
                            {cp.days_until_expiry >= 0 ? `${cp.days_until_expiry} days left` : "Expired"}
                          </span>
                        )}
                        {cp.status === "REDEEMED" && cp.used_at && (
                          <span className="text-[10px] text-slate-500 font-sans block">
                            Used on {new Date(cp.used_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${cp.status === "AVAILABLE"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                            : cp.status === "REDEEMED"
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : "bg-rose-950 text-rose-300 border border-rose-800/50"
                            }`}
                        >
                          {cp.status === "REDEEMED" ? "REDEEMED (EXPIRED)" : cp.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          {cp.status === "AVAILABLE" && (
                            <button
                              onClick={() => {
                                setTestCouponCode(cp.code);
                                setProcModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Test Apply in Checkout"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Issue Single VIP Coupon (Restricted to Top 10) */}
      {/* ========================================================================= */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Issue Top 10 VIP Coupon &amp; Send SMS</h3>
                  <p className="text-[11px] text-slate-400">Valid for 2 Months • Max 5 Products • Limit LKR 3,000</p>
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
              {/* Select Customer from Top 10 */}
              <div>
                <label className="text-xs text-slate-300 font-semibold flex items-center justify-between mb-1">
                  <span>Top 10 VIP Recipient <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-amber-400 font-mono">Policy: Top 10 Only</span>
                </label>
                <select
                  required
                  value={newCoupon.customer_id}
                  onChange={(e) => handleCustomerSelectionChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose from Top 10 Loyalty VIPs --</option>
                  {top10Customers.map((c, idx) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      #{idx + 1} - {c.full_name} ({c.card_no}) • {c.points_balance} pts • {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Phone Number */}
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Customer Mobile Number (for SMS delivery) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0771234567"
                    value={newCoupon.phone}
                    onChange={(e) => setNewCoupon({ ...newCoupon, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Coupon Code & Campaign Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-300 font-semibold">
                      Coupon Code <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => generateRandomCode("TOP10")}
                      className="text-[10px] text-amber-400 hover:underline font-semibold"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TOP10-C0004-98A1"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Campaign Offer <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={newCoupon.promo_id}
                    onChange={(e) => setNewCoupon({ ...newCoupon, promo_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Campaign --</option>
                    {promotions.map((p) => (
                      <option key={p.promo_id} value={p.promo_id}>
                        {p.name} ({Number(p.discount_percent)}% OFF)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validity Period & Constraints */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Validity (2 Months)
                  </label>
                  <input
                    type="date"
                    required
                    value={newCoupon.expiry_date}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-amber-400 mt-0.5 block">2 Months Default</span>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Max Products Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={newCoupon.max_products}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_products: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Max 5 Products</span>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Purchase Limit (Rs.)
                  </label>
                  <input
                    type="number"
                    min="500"
                    max="20000"
                    step="500"
                    required
                    value={newCoupon.purchase_limit}
                    onChange={(e) => setNewCoupon({ ...newCoupon, purchase_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Limit: LKR 3,000</span>
                </div>
              </div>

              {/* LIVE SMS SMARTPHONE PREVIEW BOX */}
              <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-teal-300 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                    <span>Outgoing SMS Message Preview</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    To: {newCoupon.phone || "Customer Phone"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed">
                  {liveSmsPreview}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Strict 1-Time Use: Expired immediately upon checkout</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> SMS Gateway Ready
                  </span>
                </div>
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
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-950/40"
                >
                  {issuing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{issuing ? "Issuing & Sending SMS..." : "Issue & Send SMS to VIP"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Batch Allocate to All Top 10 Customers */}
      {/* ========================================================================= */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Award All Top 10 Customers Simultaneously</h3>
                  <p className="text-[11px] text-slate-400">Generates 10 unique 2-month coupons and sends SMS</p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchTop10} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Select Campaign Promotion Offer <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={batchPromoId}
                  onChange={(e) => setBatchPromoId(e.target.value)}
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
                <label className="text-xs text-slate-300 font-semibold block mb-1">Coupon Code Prefix</label>
                <input
                  type="text"
                  required
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Recipients List Preview */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                  <span>Recipients (Top 10 Leaderboard)</span>
                  <span className="text-emerald-400 font-mono">{top10Customers.length} VIPs</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {top10Customers.slice(0, 10).map((c, i) => (
                    <div key={c.customer_id} className="flex items-center justify-between py-1 border-b border-slate-900 text-slate-400">
                      <span className="text-white">
                        #{i + 1} {c.full_name} ({c.card_no})
                      </span>
                      <span className="text-emerald-400">{c.phone || "No phone"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="font-bold">Allocated Voucher Rules:</div>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-amber-200/80">
                  <li>Valid for exactly 2 Months from today.</li>
                  <li>Limited to a maximum of 5 products.</li>
                  <li>Purchase limit capped at LKR 3,000.</li>
                  <li>One-time use only (expires automatically upon checkout).</li>
                  <li>SMS notification dispatched to each customer mobile number.</li>
                </ul>
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
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-950/40"
                >
                  {batchGenerating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>{batchGenerating ? "Allocating & Sending SMS..." : "Confirm & Send 10 SMS"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: View Full SMS Sent Message Details */}
      {/* ========================================================================= */}
      {smsModalOpen && selectedSms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Dispatched SMS Notification</h3>
                  <p className="text-[11px] text-slate-400">Delivered to customer&apos;s phone</p>
                </div>
              </div>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Recipient</span>
                  <span className="font-bold text-white">{selectedSms.customer_name}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Phone Number</span>
                  <span className="font-mono font-bold text-emerald-400">{selectedSms.phone}</span>
                </div>
              </div>

              {/* Message Box */}
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block mb-1">Message Content:</span>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/30 text-xs text-slate-200 font-sans leading-relaxed relative">
                  &ldquo;{selectedSms.message}&rdquo;
                  <div className="mt-2 text-[10px] text-teal-400 font-mono flex items-center gap-1 justify-end">
                    <CheckCircle2 className="w-3 h-3" /> Status: DELIVERED
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div>• Coupon: <span className="font-mono text-amber-400 font-bold">{selectedSms.code}</span></div>
                <div>• Validity: Valid for 2 Months</div>
                <div>• Limits: Max 5 products, purchase limit LKR 3,000</div>
                <div>• Rule: Expired immediately upon 1-time redemption</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSmsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Procedure Tester (proc_apply_coupon) */}
      {/* ========================================================================= */}
      {procModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Checkout Redemption Tester (proc_apply_coupon)</h3>
                  <p className="text-[11px] text-slate-400">Simulates cashier applying coupon to an OPEN sale</p>
                </div>
              </div>
              <button
                onClick={() => setProcModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyCouponProc} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Target OPEN Sale <span className="text-rose-400">*</span>
                </label>
                {openSales.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    No OPEN sales found currently in database. You can start a sale in POS or specify a Sale ID.
                    <input
                      type="number"
                      placeholder="Enter Sale ID manually (e.g. 1)"
                      value={testSaleId}
                      onChange={(e) => setTestSaleId(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                ) : (
                  <select
                    required
                    value={testSaleId}
                    onChange={(e) => setTestSaleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose an Open Sale --</option>
                    {openSales.map((s) => (
                      <option key={s.sale_id} value={s.sale_id}>
                        Sale #{s.sale_id} • {s.customer_name || "Guest"} • Subtotal: Rs. {Number(s.subtotal).toFixed(2)} ({s.items_count || 1} items)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Coupon Code to Redeem <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TOP10-C0004-921A"
                  value={testCouponCode}
                  onChange={(e) => setTestCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Procedure execution response */}
              {procResult && (
                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${procResult.success
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                    }`}
                >
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    {procResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{procResult.success ? "Redemption Successful!" : "Procedure Rejected"}</span>
                  </div>
                  <div>{procResult.message || procResult.error}</div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProcModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testingProc}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {testingProc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{testingProc ? "Validating & Applying..." : "Apply & Expire Coupon"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
