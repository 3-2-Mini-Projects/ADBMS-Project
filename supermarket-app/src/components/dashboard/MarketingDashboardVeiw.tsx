"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  Users,
  Award,
  Tag,
  Ticket,
  Sparkles,
  ArrowUpRight,
  Gift,
  Coins,
  Percent,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  Plus,
  RefreshCw,
  BarChart3,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  Search,
} from "lucide-react";

interface DashboardData {
  branch?: {
    branch_id: number;
    branch_code: string;
    name: string;
    city: string;
    region?: string;
  } | null;
  summary: {
    total_customers: number;
    total_points_balance: number;
    avg_points_per_customer: number;
    new_customers_30d: number;
    active_promotions: number;
    total_promotions: number;
    total_coupons: number;
    redeemed_coupons: number;
    available_coupons: number;
    redemption_rate: number;
    total_discounts_given: number;
    member_revenue: number;
    total_revenue: number;
    member_revenue_percent: number;
    member_transactions: number;
    avg_member_basket: number;
    avg_non_member_basket: number;
    points_currency_redeemed: number;
    points_redemption_count: number;
  };
  tierBreakdown: Array<{
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    customer_count: number;
    tier_points: number;
  }>;
  tierCustomers?: Array<{
    customer_id: number;
    card_no: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    tier: string;
    points_balance: number;
    join_date?: string;
  }>;
  activePromotions: Array<{
    promo_id: number;
    name: string;
    discount_percent: number | string;
    start_date: string;
    end_date: string;
    product_name?: string | null;
    category_name?: string | null;
    days_left: number;
  }>;
  recentLoyaltyActivity: Array<{
    loyalty_id: number;
    customer_id: number;
    customer_name: string;
    card_no: string;
    tier: string;
    sale_id?: number | null;
    points_change: number;
    transaction_type: "EARNED" | "REDEEMED" | "EXPIRED" | "ADJUSTED";
    created_at: string;
  }>;
  tierHistory: Array<{
    history_id: number;
    customer_name: string;
    card_no: string;
    old_tier: string;
    new_tier: string;
    reason: string;
    changed_at: string;
  }>;
  discountTrend: Array<{
    sale_date: string;
    total_discount: number;
    total_sales: number;
    transactions: number;
  }>;
  loyaltySummary?: {
    total_transactions: number;
    active_members: number;
    total_points_earned: number;
    total_points_redeemed: number;
  };
}

export function MarketingDashboardVeiw() {
  const { currentBranch, currentEmployee } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const targetBranchId = currentBranch?.branch_id || currentEmployee?.branch_id;
      const params = new URLSearchParams();
      if (targetBranchId) params.append("branchId", String(targetBranchId));
      const res = await fetch(`/api/marketing/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error loading marketing dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentBranch?.branch_id, currentEmployee?.branch_id]);

  const summary = data?.summary;
  const tiers = data?.tierBreakdown ?? [];
  const tierCustomers = data?.tierCustomers ?? [];
  const promotions = data?.activePromotions ?? [];
  const recentLoyalty = data?.recentLoyaltyActivity ?? [];
  const tierHistory = data?.tierHistory ?? [];
  const discountTrend = data?.discountTrend ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Marketing & Loyalty Dashboard
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/marketing/promotions"
            className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-950/40 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Promotion</span>
          </Link>

          <Link
            href="/marketing/coupons"
            className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-950/40 flex items-center gap-1.5 transition-all"
          >
            <Ticket className="w-4 h-4" />
            <span>Issue Coupon</span>
          </Link>

          <Link
            href="/marketing/customers"
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-950/40 flex items-center gap-1.5 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Register Customer</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Total Loyalty Members */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Loyalty Members</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {loading ? "..." : (summary?.total_customers ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400 font-medium">
              <span className="flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/40">
                <ArrowUpRight className="w-3 h-3" />
                +{summary?.new_customers_30d ?? 0} new
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Discounts Granted */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Discounts Given</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
              {loading ? "..." : `Rs. ${Number(summary?.total_discounts_given ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Promos & Vouchers
            </div>
          </div>
        </div>

        {/* KPI 3: Loyalty Member Sales Share */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Member Sales Total</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-300 font-mono tracking-tight">
              {loading ? "..." : `Rs. ${Number(summary?.member_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
            </div>
            <div className="mt-2 text-[11px] text-emerald-400 font-medium">
              {summary?.member_revenue_percent ?? 0}% of revenue
            </div>
          </div>
        </div>

        {/* KPI 4: Loyalty Points Balance */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Point balance</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
              {loading ? "..." : (summary?.total_points_balance ?? 0).toLocaleString()}{" "}
              <span className="text-xs font-semibold text-amber-300">pts</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-mono">
              Avg {summary?.avg_points_per_customer ?? 0} pts/mbr
            </div>
          </div>
        </div>

        {/* KPI 5: Active Promotions */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Promotions</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-300 font-mono tracking-tight">
              {loading ? "..." : summary?.active_promotions ?? 0}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Out of {summary?.total_promotions ?? 0} total
            </div>
          </div>
        </div>

        {/* KPI 6: Coupon Redemption */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Coupon Success</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {loading ? "..." : `${summary?.redemption_rate ?? 0}%`}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {summary?.redeemed_coupons ?? 0} of {summary?.total_coupons ?? 0} redeemed
            </div>
          </div>
        </div>
      </div>


      {/* Membership Tier Breakdown Cards */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Customer Tier Progression (customers & customer_tier_history)</span>
            </h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick dropdown select */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Select Tier:</span>
              <select
                value={selectedTier || ""}
                onChange={(e) => {
                  setSelectedTier(e.target.value || null);
                  setCustomerSearch("");
                }}
                className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">-- None --</option>
                <option value="PLATINUM" className="bg-slate-900 text-purple-300">Platinum Tier</option>
                <option value="GOLD" className="bg-slate-900 text-amber-300">Gold Tier</option>
                <option value="SILVER" className="bg-slate-900 text-slate-300">Silver Tier</option>
                <option value="BRONZE" className="bg-slate-900 text-orange-300">Bronze Tier</option>
              </select>
            </div>

            <Link
              href="/marketing/loyalty"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>View Loyalty Program</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {["PLATINUM", "GOLD", "SILVER", "BRONZE"].map((tierName) => {
            const tierData = tiers.find((t) => t.tier === tierName);
            const count = tierData?.customer_count ?? 0;
            const points = tierData?.tier_points ?? 0;
            const total = summary?.total_customers || 1;
            const pct = Math.round((count / total) * 100);
            const isSelected = selectedTier === tierName;

            const badgeStyles =
              tierName === "PLATINUM"
                ? isSelected
                  ? "border-purple-500 bg-purple-950/40 text-purple-300 ring-2 ring-purple-500/80 shadow-purple-950/40"
                  : "border-purple-600/40 bg-purple-950/20 text-purple-300 hover:border-purple-500/70"
                : tierName === "GOLD"
                  ? isSelected
                    ? "border-amber-500 bg-amber-950/40 text-amber-300 ring-2 ring-amber-500/80 shadow-amber-950/40"
                    : "border-amber-600/40 bg-amber-950/20 text-amber-300 hover:border-amber-500/70"
                  : tierName === "SILVER"
                    ? isSelected
                      ? "border-slate-400 bg-slate-900/50 text-slate-300 ring-2 ring-slate-400/80 shadow-slate-900/50"
                      : "border-slate-500/40 bg-slate-900/30 text-slate-300 hover:border-slate-400/70"
                    : isSelected
                      ? "border-orange-500 bg-orange-950/40 text-orange-300 ring-2 ring-orange-500/80 shadow-orange-950/40"
                      : "border-orange-600/40 bg-orange-950/20 text-orange-300 hover:border-orange-500/70";

            const barColor =
              tierName === "PLATINUM"
                ? "bg-purple-500"
                : tierName === "GOLD"
                  ? "bg-amber-500"
                  : tierName === "SILVER"
                    ? "bg-slate-400"
                    : "bg-orange-500";

            return (
              <div
                key={tierName}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedTier(isSelected ? null : tierName);
                  setCustomerSearch("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedTier(isSelected ? null : tierName);
                    setCustomerSearch("");
                  }
                }}
                className={`p-4 rounded-2xl border ${badgeStyles} flex flex-col justify-between space-y-3 backdrop-blur-sm shadow-lg cursor-pointer transition-all duration-200 select-none group`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black tracking-wider uppercase">{tierName}</span>
                  <span className="text-xs font-mono font-bold">{pct}%</span>
                </div>

                <div>
                  <div className="text-2xl font-black text-white font-mono">{count} members</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {points.toLocaleString()} pts held
                  </div>
                </div>

                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                </div>

                {/* Dropdown trigger row */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                  <span>
                    {isSelected ? "Hide details" : `View ${count} customer${count === 1 ? "" : "s"}`}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isSelected ? "rotate-180 text-white" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dropdown Section for Selected Tier */}
        {selectedTier && (() => {
          const selectedTierData = tiers.find((t) => t.tier === selectedTier);
          const filteredTierCustomers = tierCustomers.filter((c) => {
            if (c.tier?.toUpperCase() !== selectedTier?.toUpperCase()) return false;
            if (!customerSearch.trim()) return true;
            const q = customerSearch.toLowerCase();
            return (
              c.full_name?.toLowerCase().includes(q) ||
              c.card_no?.toLowerCase().includes(q) ||
              (c.phone && c.phone.toLowerCase().includes(q))
            );
          });
          const selectedTierHistory = tierHistory.filter(
            (th) =>
              th.new_tier?.toUpperCase() === selectedTier?.toUpperCase() ||
              th.old_tier?.toUpperCase() === selectedTier?.toUpperCase()
          );

          return (
            <div
              className={`rounded-2xl border p-5 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-200 space-y-4 ${selectedTier === "PLATINUM"
                  ? "bg-slate-950/95 border-purple-500/50 shadow-purple-950/30"
                  : selectedTier === "GOLD"
                    ? "bg-slate-950/95 border-amber-500/50 shadow-amber-950/30"
                    : selectedTier === "SILVER"
                      ? "bg-slate-950/95 border-slate-500/50 shadow-slate-900/50"
                      : "bg-slate-950/95 border-orange-500/50 shadow-orange-950/30"
                }`}
            >
              {/* Header with stats and close button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${selectedTier === "PLATINUM"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : selectedTier === "GOLD"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : selectedTier === "SILVER"
                            ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                            : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white tracking-tight">
                        {selectedTier} Tier Members & Progression
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Tier Dropdown Details
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 flex-wrap">
                      <span>
                        <strong className="text-white font-mono">{filteredTierCustomers.length}</strong> active members
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-white font-mono">
                          {(selectedTierData?.tier_points ?? 0).toLocaleString()}
                        </strong>{" "}
                        pts held
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-white font-mono">{selectedTierHistory.length}</strong> upgrade events
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTier(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-all"
                    title="Close dropdown"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Content: Customers Table and Tier History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                {/* Left Column: Customers List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <h5 className="text-xs font-bold text-white">
                        Active {selectedTier} Customers ({filteredTierCustomers.length})
                      </h5>
                    </div>
                    <Link
                      href="/marketing/customers"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>Customer directory</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Filter Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder={`Filter ${selectedTier} members by name, card, or phone...`}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
                    />
                    {customerSearch && (
                      <button
                        onClick={() => setCustomerSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {filteredTierCustomers.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-1.5">
                      <p className="text-xs text-slate-400">
                        No customers found in <strong className="text-white">{selectedTier}</strong> tier.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Customers upgrade automatically as they accumulate loyalty points through purchases.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {filteredTierCustomers.map((cust) => (
                        <div
                          key={cust.customer_id}
                          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{cust.full_name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/20 font-bold">
                                {cust.card_no}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>{cust.phone || "No phone"}</span>
                              {cust.city && <span>• {cust.city}</span>}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-400">
                              {Number(cust.points_balance || 0).toLocaleString()} pts
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {cust.join_date ? `Joined ${new Date(cust.join_date).toLocaleDateString()}` : "Active"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Customer Tier Upgrades (customer_tier_history) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h5 className="text-xs font-bold text-white">
                        Tier Upgrades History (customer_tier_history)
                      </h5>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {selectedTierHistory.length} record{selectedTierHistory.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {selectedTierHistory.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-1.5">
                      <p className="text-xs text-slate-400">
                        No tier upgrade events recorded for <strong className="text-white">{selectedTier}</strong> tier.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tier transitions are recorded here when members cross loyalty point thresholds.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selectedTierHistory.map((th) => (
                        <div
                          key={th.history_id}
                          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{th.customer_name}</span>
                              <span className="font-mono text-[10px] text-slate-400">({th.card_no})</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                              <span>{th.old_tier}</span>
                              <span className="text-slate-600">→</span>
                              <span className="text-amber-400 font-bold">{th.new_tier}</span>
                              <span className="text-slate-500 text-[10px]">({th.reason || "Points threshold met"})</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                            {new Date(th.changed_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Dual Grid: Active Campaigns & Recent Points Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Promotions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-400" />
              <span>Live Promotional Campaigns</span>
            </h3>
            <Link
              href="/marketing/promotions"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              All Promos
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {promotions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No active campaigns at the moment.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2.5">Promotion</th>
                    <th className="pb-2.5 text-center">Discount</th>
                    <th className="pb-2.5">Scope</th>
                    <th className="pb-2.5 text-right">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {promotions.map((p) => (
                    <tr key={p.promo_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-white truncate max-w-[140px] font-sans">
                        {p.name}
                      </td>
                      <td className="py-3 text-center font-bold text-emerald-400">
                        {Number(p.discount_percent)}% OFF
                      </td>
                      <td className="py-3 text-slate-300 text-[11px] font-sans">
                        {p.product_name ? (
                          <span className="text-blue-300 truncate max-w-[120px] block">{p.product_name}</span>
                        ) : p.category_name ? (
                          <span className="text-indigo-300">{p.category_name}</span>
                        ) : (
                          <span className="text-slate-400">Basket-wide</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          {p.days_left >= 0 ? `${p.days_left}d left` : "Ending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Loyalty Points Activity Summary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>Loyalty Points Activity Summary</span>
            </h3>
            <Link
              href="/marketing/loyalty"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Full Ledger
            </Link>
          </div>

          {/* Main Details Summary-Wise Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/50 border-b border-slate-800/80 font-mono text-center">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Points Earned</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                +{data?.loyaltySummary?.total_points_earned ?? 0} pts
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Points Redeemed</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">
                -{data?.loyaltySummary?.total_points_redeemed ?? 0} pts
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Transactions</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                {data?.loyaltySummary?.total_transactions ?? 0}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Active Members</div>
              <div className="text-sm font-bold text-blue-400 mt-0.5">
                {data?.loyaltySummary?.active_members ?? 0}
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {recentLoyalty.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No points transactions recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold font-sans">
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5">Card</th>
                    <th className="pb-2.5 text-center">Type</th>
                    <th className="pb-2.5 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {recentLoyalty.slice(0, 5).map((lt) => (
                    <tr key={lt.loyalty_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-medium text-white truncate max-w-[130px] font-sans">
                        {lt.customer_name}
                      </td>
                      <td className="py-2.5 text-[11px] text-amber-400">{lt.card_no}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                            lt.transaction_type === "EARNED" || lt.points_change > 0
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                              : "bg-rose-950 text-rose-300 border border-rose-800/40"
                          }`}
                        >
                          {lt.transaction_type || "EARNED"}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          lt.points_change > 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {lt.points_change > 0 ? `+${lt.points_change}` : lt.points_change} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
