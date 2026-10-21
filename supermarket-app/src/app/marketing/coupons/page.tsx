"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/context";
import {
  Ticket,
  Plus,
  X,
  Search,
  RefreshCw,
  Copy,
  ChevronDown,
} from "lucide-react";

interface CouponRow {
  coupon_id: number;
  code: string;
  promo_id: number;
  promo_name: string;
  discount_percent: number;
  promo_start_date?: string | null;
  promo_end_date?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_card_no?: string | null;
  customer_phone?: string | null;
  customer_tier?: string | null;
  customer_points?: number | null;
  expiry_date?: string | null;
  is_used: number;
  used_at?: string | null;
  status: "AVAILABLE" | "REDEEMED" | "EXPIRED" | "INACTIVE";
  days_until_expiry?: number | null;
}

export default function MarketingCouponsPage() {
  const { showToast } = useApp();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "EXPIRED">("ALL");

  // Date helpers for YYYY-MM-DD
  const toDateStr = (val?: string | Date | null): string => {
    if (!val) return "";
    const s = String(val);
    if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (val?: string | Date | null) => {
    if (!val) return "—";
    const s = String(val);
    if (s.includes("T")) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    }
    const parts = s.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    }
    return s.slice(0, 10);
  };

  // Helper to determine active status based on Start Date and End Date (from coupons.expiry_date)
  const isCouponActive = (c: CouponRow): boolean => {
    // If redeemed, it's inactive
    if (c.is_used === 1) return false;

    const today = getTodayStr();

    // End Date is getting from the coupon table expiry_date
    const endDate = toDateStr(c.expiry_date || c.promo_end_date);

    // Rule: if the coupon end date is < current date its inactive
    if (endDate && endDate < today) {
      return false;
    }

    // Start Date comes from linked promotion (pr.start_date)
    const startDate = toDateStr(c.promo_start_date);

    // If start date is in the future (> current date), not yet active
    if (startDate && startDate > today) {
      return false;
    }

    // Rule: if start date and end date is between or start date same the current date its active
    if (startDate && endDate) {
      return startDate <= today && today <= endDate;
    }

    if (endDate) {
      return today <= endDate;
    }

    if (startDate) {
      return startDate <= today;
    }

    return true;
  };

  const getDaysLeft = (expiryDate?: string | Date | null) => {
    if (!expiryDate) return null;
    const expStr = toDateStr(expiryDate);
    if (!expStr) return null;
    const exp = new Date(expStr);
    const today = new Date(getTodayStr());
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Helper for 2 months expiry
  const getTwoMonthsFromNow = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().split("T")[0];
  };

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Modal 1: Issue / Create Coupon
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    coupon_name: "",
    promo_id: "",
    start_date: getTodayDate(),
    expiry_date: getTwoMonthsFromNow(),
  });

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (Array.isArray(data.promotions)) setPromotions(data.promotions);
    } catch (err) {
      console.error("Error loading coupon management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate a random code for coupon
  const generateRandomCode = (prefix = "CPN") => {
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewCoupon((prev) => ({ ...prev, code: `${prefix}-${rand}` }));
  };

  // Submit Create New Coupon
  const handleIssueCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      showToast("Coupon code is required.", "error");
      return;
    }
    if (!newCoupon.coupon_name.trim() && !newCoupon.promo_id) {
      showToast("Coupon name is required.", "error");
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
          coupon_name: newCoupon.coupon_name.trim() || undefined,
          promo_id: newCoupon.promo_id ? Number(newCoupon.promo_id) : undefined,
          start_date: newCoupon.start_date || getTodayDate(),
          expiry_date: newCoupon.expiry_date || getTwoMonthsFromNow(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Coupon "${newCoupon.code}" created successfully!`, "success");
        setIssueModalOpen(false);
        setNewCoupon({
          code: "",
          coupon_name: "",
          promo_id: "",
          start_date: getTodayDate(),
          expiry_date: getTwoMonthsFromNow(),
        });
        await loadData();
      } else {
        showToast(data.error || "Failed to create coupon", "error");
      }
    } catch {
      showToast("Error creating coupon", "error");
    } finally {
      setIssuing(false);
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

      let matchesStatus = true;
      const isActive = isCouponActive(c);
      const isExpired = !isActive;

      if (statusFilter === "AVAILABLE") {
        matchesStatus = isActive;
      } else if (statusFilter === "EXPIRED") {
        matchesStatus = isExpired;
      }

      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchTerm, statusFilter]);

  // Coupon statistics for ALL, AVAILABLE, EXPIRED cards
  const totalCount = coupons.length;
  const availableCount = useMemo(
    () => coupons.filter((c) => isCouponActive(c)).length,
    [coupons]
  );
  const expiredCount = useMemo(
    () => coupons.filter((c) => !isCouponActive(c)).length,
    [coupons]
  );
  const availablePct = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;
  const expiredPct = totalCount > 0 ? Math.round((expiredCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-amber-400" />
            <span> Coupon  Management</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">

          <button
            onClick={() => {
              const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
              setNewCoupon({
                code: `CPN-${rand}`,
                coupon_name: "",
                promo_id: "",
                start_date: getTodayDate(),
                expiry_date: getTwoMonthsFromNow(),
              });
              setIssueModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-amber-950/40 border border-amber-500/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Coupon</span>
          </button>



        </div>
      </div>





      {/* ========================================================================= */}
      {/* 3 CLICKABLE FILTER CARDS: ALL | AVAILABLE | EXPIRED */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            id: "ALL" as const,
            title: "ALL",
            count: totalCount,
            pct: 100,
            subtext: "All registered coupons",
            actionLabel: `View ${totalCount} coupons`,
            borderColor: "border-purple-900/50",
            hoverBorder: "hover:border-purple-500/80",
            activeClass: "border-purple-500 ring-2 ring-purple-500/30 bg-purple-950/20",
            headerColor: "text-purple-400",
            barColor: "bg-purple-500",
          },
          {
            id: "AVAILABLE" as const,
            title: "AVAILABLE",
            count: availableCount,
            pct: availablePct,
            subtext: `${availableCount} active & ready`,
            actionLabel: `View ${availableCount} coupons`,
            borderColor: "border-amber-900/50",
            hoverBorder: "hover:border-amber-500/80",
            activeClass: "border-yellow-400 ring-2 ring-yellow-400/30 bg-amber-950/20",
            headerColor: "text-yellow-400",
            barColor: "bg-yellow-400",
          },
          {
            id: "EXPIRED" as const,
            title: "EXPIRED",
            count: expiredCount,
            pct: expiredPct,
            subtext: `${expiredCount} past validity / used`,
            actionLabel: `View ${expiredCount} coupons`,
            borderColor: "border-slate-800",
            hoverBorder: "hover:border-slate-600",
            activeClass: "border-slate-400 ring-2 ring-slate-400/30 bg-slate-800/40",
            headerColor: "text-slate-300",
            barColor: "bg-slate-400",
          },
        ].map((card) => {
          const isSelected = statusFilter === card.id;
          return (
            <div
              key={card.id}
              onClick={() => setStatusFilter(isSelected && card.id !== "ALL" ? "ALL" : card.id)}
              className={`p-5 rounded-2xl bg-slate-900 border cursor-pointer transition-all space-y-3 shadow-xl ${isSelected
                  ? `${card.activeClass} shadow-lg`
                  : `${card.borderColor} ${card.hoverBorder}`
                }`}
            >
              {/* Header: Title + Percentage */}
              <div className="flex items-center justify-between">
                <span className={`font-bold font-mono text-xs tracking-wider uppercase flex items-center gap-1.5 ${card.headerColor}`}>
                  <span>{card.title}</span>
                  {isSelected && (
                    <span className="text-[10px] text-amber-400 font-sans font-semibold normal-case">
                      (Filter Active)
                    </span>
                  )}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {card.pct}%
                </span>
              </div>

              {/* Big Count + Subtitle */}
              <div>
                <div className="text-2xl font-black text-white font-mono">
                  {card.count} {card.count === 1 ? "coupon" : "coupons"}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {card.subtext}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${card.barColor}`}
                  style={{ width: `${Math.max(card.pct, card.count > 0 ? 5 : 0)}%` }}
                />
              </div>

              {/* Action Hint with Chevron */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                <span className="hover:text-slate-200 transition-colors">{card.actionLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSelected ? "rotate-180 text-white" : "text-slate-500"}`} />
              </div>
            </div>
          );
        })}
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

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold border border-slate-800/80 shrink-0"
              title="Refresh Coupon List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                  <th className="py-3 px-4 font-mono">Coupon Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 font-mono">Start Date</th>
                  <th className="py-3 px-4 font-mono">End Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Loading coupons...
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                      No coupons found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((cp) => {
                    const isActive = isCouponActive(cp);
                    const daysLeft = getDaysLeft(cp.expiry_date);
                    return (
                      <tr key={cp.coupon_id} className="hover:bg-slate-800/30 transition-colors">
                        {/* 1. Coupon Code */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-400 text-sm tracking-wider">{cp.code}</span>
                            <button
                              onClick={() => copyToClipboard(cp.code)}
                              className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
                              title="Copy code"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* 2. Name */}
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-semibold text-white text-xs">
                            {cp.promo_name || "Special Campaign"}
                          </div>
                        </td>

                        {/* 3. Start Date */}
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                          {formatDateDisplay(cp.promo_start_date)}
                        </td>

                        {/* 4. End Date (from coupons.expiry_date) */}
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                          {cp.expiry_date ? (
                            <div>
                              <div>{formatDateDisplay(cp.expiry_date)}</div>
                              {isActive && daysLeft !== null && (
                                <span className="text-[10px] text-amber-400 font-sans block">
                                  {daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* 5. Status (active inactive) */}
                        <td className="py-3.5 px-4 text-center font-sans">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 shadow-sm shadow-emerald-950/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              Inactive
                            </span>
                          )}
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
      {/* MODAL 1: Create New Coupon */}
      {/* ========================================================================= */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            {/* Modal Header: ONLY display Create New Coupon title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create New Coupon</h3>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueCoupon} className="space-y-4">
              {/* 1. Coupon Code (Auto-generated with Regenerate button) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-300 font-semibold">
                    Coupon Code <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => generateRandomCode("CPN")}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. CPN-89A1"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-amber-300 font-bold tracking-wider focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 2. Coupon Name */}
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Coupon Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter coupon name (e.g. Summer Special Offer)"
                  value={newCoupon.coupon_name}
                  onChange={(e) => setNewCoupon({ ...newCoupon, coupon_name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                />
              </div>

              {/* 3. Valid Dates: Start Date and End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Start Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newCoupon.start_date}
                    onChange={(e) => setNewCoupon({ ...newCoupon, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    End Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newCoupon.expiry_date}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
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
                  {issuing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{issuing ? "Creating Coupon..." : "Create Coupon"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
