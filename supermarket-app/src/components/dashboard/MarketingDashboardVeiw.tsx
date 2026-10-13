"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  Users,
  Award,
  Tag,
  Ticket,
  TrendingUp,
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
} from "lucide-react";

interface DashboardData {
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
}

export function MarketingDashboardVeiw() {
  const { currentBranch } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
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
  }, [currentBranch]);

  const summary = data?.summary;
  const tiers = data?.tierBreakdown ?? [];
  const promotions = data?.activePromotions ?? [];
  const recentLoyalty = data?.recentLoyaltyActivity ?? [];
  const tierHistory = data?.tierHistory ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Marketing Role Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
            Marketing & Loyalty Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Customer membership analytics, campaign discount monitoring, coupon redemptions, and real-time loyalty ledger transactions.
          </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Loyalty Members */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Loyalty Members</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono tracking-tight">
              {loading ? "..." : (summary?.total_customers ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400 font-medium">
              <span className="flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/40">
                <ArrowUpRight className="w-3 h-3" />
                +{summary?.new_customers_30d ?? 0} new this month
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Loyalty Points Balance */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Points in Circulation</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
              {loading ? "..." : (summary?.total_points_balance ?? 0).toLocaleString()}{" "}
              <span className="text-sm font-semibold text-amber-300">pts</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-mono">
              Avg {summary?.avg_points_per_customer ?? 0} pts per member
            </div>
          </div>
        </div>

        {/* KPI 3: Active Promotions */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Campaigns</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-purple-300 font-mono tracking-tight">
              {loading ? "..." : summary?.active_promotions ?? 0}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Out of {summary?.total_promotions ?? 0} total campaigns
            </div>
          </div>
        </div>

        {/* KPI 4: Coupon Redemption */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Coupon Redemption Rate</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
              {loading ? "..." : `${summary?.redemption_rate ?? 0}%`}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {summary?.redeemed_coupons ?? 0} redeemed / {summary?.total_coupons ?? 0} issued
            </div>
          </div>
        </div>
      </div>

      {/* Member Revenue Contribution Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Member Sales Impact</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            Loyalty Customers Drive {summary?.member_revenue_percent ?? 0}% of Total Revenue
          </h2>
          <p className="text-xs text-slate-400">
            Total discounts given to customers:{" "}
            <strong className="text-rose-400 font-mono">
              Rs. {Number(summary?.total_discounts_given ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-400">Member Avg Basket</div>
            <div className="text-base font-bold text-emerald-400 font-mono">
              Rs. {Number(summary?.avg_member_basket ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-right">
            <div className="text-xs text-slate-400">Regular Avg Basket</div>
            <div className="text-base font-bold text-slate-300 font-mono">
              Rs. {Number(summary?.avg_non_member_basket ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Membership Tier Breakdown Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Customer Tier Progression (customers & customer_tier_history)</span>
          </h3>
          <Link
            href="/marketing/loyalty"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>View Loyalty Program</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {["PLATINUM", "GOLD", "SILVER", "BRONZE"].map((tierName) => {
            const tierData = tiers.find((t) => t.tier === tierName);
            const count = tierData?.customer_count ?? 0;
            const points = tierData?.tier_points ?? 0;
            const total = summary?.total_customers || 1;
            const pct = Math.round((count / total) * 100);

            const badgeStyles =
              tierName === "PLATINUM"
                ? "border-purple-600/40 bg-purple-950/20 text-purple-300"
                : tierName === "GOLD"
                ? "border-amber-600/40 bg-amber-950/20 text-amber-300"
                : tierName === "SILVER"
                ? "border-slate-500/40 bg-slate-900/30 text-slate-300"
                : "border-orange-600/40 bg-orange-950/20 text-orange-300";

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
                className={`p-4 rounded-2xl border ${badgeStyles} flex flex-col justify-between space-y-3 backdrop-blur-sm shadow-lg`}
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual Grid: Active Campaigns & Recent Points Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Promotions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-400" />
              <span>Live Promotional Campaigns (promotions)</span>
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

        {/* Right: Recent Loyalty Points Ledger Activity */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>Recent Loyalty Points Activity (loyalty_transactions)</span>
            </h3>
            <Link
              href="/marketing/loyalty"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Full Ledger
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {recentLoyalty.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No points transactions recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5 font-mono">Card</th>
                    <th className="pb-2.5">Type</th>
                    <th className="pb-2.5 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentLoyalty.map((lt) => (
                    <tr key={lt.loyalty_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-white truncate max-w-[130px]">
                        {lt.customer_name}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-amber-400">{lt.card_no}</td>
                      <td className="py-3">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            lt.transaction_type === "EARNED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                              : "bg-rose-950 text-rose-300 border border-rose-800/40"
                          }`}
                        >
                          {lt.transaction_type}
                        </span>
                      </td>
                      <td
                        className={`py-3 text-right font-mono font-bold ${
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

      {/* Customer Tier History (Audit of tier changes) */}
      {tierHistory.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Recent Customer Tier Upgrades (customer_tier_history)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tierHistory.map((th) => (
              <div
                key={th.history_id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white">{th.customer_name}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {th.old_tier} → <span className="text-amber-400 font-bold">{th.new_tier}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{th.reason || "Points threshold met"}</div>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(th.changed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
