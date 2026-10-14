"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useApp } from "@/lib/context";
import {
  Award,
  Coins,
  History,
  Users,
  RefreshCw,
  Plus,
  Minus,
  Search,
  Filter,
  Trophy,
  ShieldCheck,
  Eye,
  CheckCircle2,
  X,
  CreditCard,
  Phone,
  Sparkles,
} from "lucide-react";

interface CustomerSummaryRow {
  customer_id: number;
  card_no: string;
  full_name: string;
  phone: string;
  email: string;
  tier: string;
  points_balance: number;
  total_points_earned: number;
  total_points_redeemed: number;
  total_spent: number;
  total_orders: number;
}

interface TopCustomerRow {
  customer_id: number;
  card_no: string;
  full_name: string;
  tier: string;
  total_spent: number;
  total_orders: number;
  points_balance: number;
}

interface CustomerEtlRow {
  customer_id: number;
  card_no: string;
  full_name: string;
  masked_phone: string;
  email: string;
  tier: string;
  points_balance: number;
  join_date: string;
}

export default function LoyaltyManagementPage() {
  const { showToast } = useApp();
  const [data, setData] = useState<any>(null);
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummaryRow[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomerRow[]>([]);
  const [customerEtl, setCustomerEtl] = useState<CustomerEtlRow[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Active View Tab: 'summary' (customer_summary_vw) | 'ledger' (loyalty_transactions) | 'top' (top_customers_vw) | 'etl' (customer_etl_vw)
  const [activeTab, setActiveTab] = useState<"summary" | "ledger" | "top" | "etl">("summary");

  // Filtering & Search
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

  // Form states for Award / Redeem
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [pointsInput, setPointsInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, summaryRes, topRes, etlRes, custRes] = await Promise.all([
        fetch("/api/marketing/dashboard").then((r) => r.json()),
        fetch("/api/marketing/actions?view=customer_summary").then((r) => r.json()),
        fetch("/api/marketing/actions?view=top_customers").then((r) => r.json()),
        fetch("/api/marketing/actions?view=customer_etl").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
      ]);

      if (dashRes && !dashRes.error) setData(dashRes);
      if (Array.isArray(summaryRes)) setCustomerSummaries(summaryRes);
      if (Array.isArray(topRes)) setTopCustomers(topRes);
      if (Array.isArray(etlRes)) setCustomerEtl(etlRes);
      if (Array.isArray(custRes)) setCustomersList(custRes);
    } catch (err) {
      console.error("Error loading loyalty management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate Tiers procedure handler
  const handleRecalculateTiers = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/marketing/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate_tiers" }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message || "Customer tiers recalculated successfully via recalculate_tiers()!", "success");
        await loadData();
      } else {
        showToast(result.error || "Failed to recalculate tiers", "error");
      }
    } catch {
      showToast("Error executing recalculate_tiers procedure", "error");
    } finally {
      setRecalculating(false);
    }
  };

  // Open Award Modal (with optional pre-selected customer)
  const openAwardModal = (customerId?: number) => {
    setSelectedCustomerId(customerId ?? (customersList.length > 0 ? customersList[0].customer_id : ""));
    setPointsInput("");
    setNoteInput("");
    setAwardModalOpen(true);
  };

  // Open Redeem Modal (with optional pre-selected customer)
  const openRedeemModal = (customerId?: number) => {
    setSelectedCustomerId(customerId ?? (customersList.length > 0 ? customersList[0].customer_id : ""));
    setPointsInput("");
    setRedeemModalOpen(true);
  };

  // Submit Award Points (add_ltpoints)
  const handleAwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsInput, 10);
    if (!selectedCustomerId || !pts || pts <= 0) {
      showToast("Please select a customer and enter a valid points amount.", "error");
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch("/api/marketing/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_points",
          customer_id: selectedCustomerId,
          points: pts,
          note: noteInput.trim() || "Points awarded by Marketing Manager",
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message || `Awarded ${pts} points successfully via add_ltpoints()!`, "success");
        setAwardModalOpen(false);
        await loadData();
      } else {
        showToast(result.error || "Failed to award points", "error");
      }
    } catch (err: any) {
      showToast("Error submitting add_ltpoints procedure", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Redeem Points (redeem_points)
  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsInput, 10);
    if (!selectedCustomerId || !pts || pts <= 0) {
      showToast("Please select a customer and enter a valid points amount.", "error");
      return;
    }

    const targetCustomer = customersList.find((c) => c.customer_id === Number(selectedCustomerId));
    if (targetCustomer && targetCustomer.points_balance < pts) {
      showToast(`Customer only has ${targetCustomer.points_balance} points available!`, "error");
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch("/api/marketing/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "redeem_points",
          customer_id: selectedCustomerId,
          points: pts,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message || `Redeemed ${pts} points successfully via redeem_points()!`, "success");
        setRedeemModalOpen(false);
        await loadData();
      } else {
        showToast(result.error || "Failed to redeem points", "error");
      }
    } catch (err: any) {
      showToast("Error submitting redeem_points procedure", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const tierBreakdown = data?.tierBreakdown || [];
  const recentLoyalty = data?.recentLoyaltyActivity || [];

  // Filtered Customer Summaries
  const filteredSummaries = useMemo(() => {
    return customerSummaries.filter((c) => {
      const matchesTier = selectedTierFilter === "ALL" || c.tier?.toUpperCase() === selectedTierFilter;
      const matchesSearch =
        searchTerm === "" ||
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.card_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTier && matchesSearch;
    });
  }, [customerSummaries, selectedTierFilter, searchTerm]);

  // Selected customer for modal display
  const activeSelectedCust = customersList.find((c) => c.customer_id === Number(selectedCustomerId));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-400" />
            <span>Loyalty Program & Points Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Membership tier policies, point earn/burn rules, tier thresholds, and transactional ledger tracking.
          </p>
        </div>

        {/* Action Buttons: Award, Redeem, Recalculate */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => openAwardModal()}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 border border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Award points to customer via add_ltpoints stored procedure"
          >
            <Plus className="w-4 h-4" />
            <span>Award Points (add_ltpoints)</span>
          </button>

          <button
            onClick={() => openRedeemModal()}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-950/40 border border-rose-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Redeem points for customer via redeem_points stored procedure"
          >
            <Minus className="w-4 h-4" />
            <span>Redeem Points (redeem_points)</span>
          </button>

          <button
            onClick={handleRecalculateTiers}
            disabled={recalculating}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-amber-950/40 border border-amber-500/30 transition-all disabled:opacity-50"
            title="Executes stored procedure recalculate_tiers()"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
            <span>{recalculating ? "Recalculating..." : "Recalculate Tiers (recalculate_tiers)"}</span>
          </button>
        </div>
      </div>

      {/* Tier Cards with Clickable Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "BRONZE", minPts: "0 pts", earnRate: "1 pt / Rs. 100", borderHover: "hover:border-amber-700/60", activeColor: "border-amber-600 ring-2 ring-amber-500/30" },
          { name: "SILVER", minPts: "500 pts", earnRate: "1.2 pts / Rs. 100", borderHover: "hover:border-slate-500/60", activeColor: "border-slate-400 ring-2 ring-slate-400/30" },
          { name: "GOLD", minPts: "1,500 pts", earnRate: "1.5 pts / Rs. 100", borderHover: "hover:border-yellow-500/60", activeColor: "border-yellow-400 ring-2 ring-yellow-400/30" },
          { name: "PLATINUM", minPts: "3,000 pts", earnRate: "2.0 pts / Rs. 100", borderHover: "hover:border-purple-500/60", activeColor: "border-purple-400 ring-2 ring-purple-400/30" },
        ].map((t) => {
          const stats = tierBreakdown.find((tb: any) => tb.tier === t.name);
          const count = stats?.customer_count ?? 0;
          const isSelected = selectedTierFilter === t.name;

          return (
            <div
              key={t.name}
              onClick={() => {
                setSelectedTierFilter(isSelected ? "ALL" : t.name);
                setActiveTab("summary");
              }}
              className={`p-5 rounded-2xl bg-slate-900 border cursor-pointer transition-all space-y-3 shadow-xl ${
                isSelected ? `${t.activeColor} bg-slate-800/80` : `border-slate-800 ${t.borderHover}`
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-sm text-white flex items-center gap-1.5">
                  <span>{t.name}</span>
                  {isSelected && (
                    <span className="text-[10px] text-amber-400 font-sans font-semibold">(Filter Active)</span>
                  )}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {t.minPts}
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-white font-mono">{count} members</div>
                <div className="text-xs text-slate-400 mt-1">Earn: {t.earnRate}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Card with Navigation Tabs for ADBMS Views & Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/30">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "summary"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer Summary (customer_summary_vw)</span>
            </button>

            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "ledger"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Transaction Ledger (loyalty_transactions)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {recentLoyalty.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("top")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "top"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Top Customers (top_customers_vw)</span>
            </button>

            <button
              onClick={() => setActiveTab("etl")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "etl"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ETL Masked View (customer_etl_vw)</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors self-end md:self-auto"
            title="Refresh View Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: Customer Points & Spends Summary (customer_summary_vw) */}
        {/* ========================================================================= */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, card no, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-500" /> Tier:
                </span>
                {["ALL", "BRONZE", "SILVER", "GOLD", "PLATINUM"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTierFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      selectedTierFilter === t
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                    <th className="py-3 px-4 font-mono">Card No</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4 text-right">Points Balance</th>
                    <th className="py-3 px-4 text-right">Points Earned</th>
                    <th className="py-3 px-4 text-right">Points Redeemed</th>
                    <th className="py-3 px-4 text-right">Total Spent</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                        Querying customer_summary_vw...
                      </td>
                    </tr>
                  ) : filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                        No customers found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map((c) => (
                      <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-amber-400 font-bold">{c.card_no}</td>
                        <td className="py-3 px-4 font-sans font-medium text-white">
                          <div>{c.full_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{c.phone || c.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              c.tier === "PLATINUM"
                                ? "bg-purple-950 text-purple-300 border border-purple-800/40"
                                : c.tier === "GOLD"
                                ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                                : c.tier === "SILVER"
                                ? "bg-slate-800 text-slate-200 border border-slate-700"
                                : "bg-orange-950 text-orange-300 border border-orange-800/40"
                            }`}
                          >
                            {c.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-300">
                          {Number(c.points_balance || 0).toLocaleString()} pts
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">
                          +{Number(c.total_points_earned || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-400">
                          -{Number(c.total_points_redeemed || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 font-sans">
                          Rs. {Number(c.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 font-sans">{c.total_orders || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              onClick={() => openAwardModal(c.customer_id)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 transition-all"
                              title="Award points via add_ltpoints"
                            >
                              + Award
                            </button>
                            <button
                              onClick={() => openRedeemModal(c.customer_id)}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/20 transition-all"
                              title="Redeem points via redeem_points"
                            >
                              − Redeem
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
        {/* TAB 2: Points Transactions Ledger (loyalty_transactions) */}
        {/* ========================================================================= */}
        {activeTab === "ledger" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 font-mono">Card No</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4 text-right">Points Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Loading loyalty_transactions ledger...
                    </td>
                  </tr>
                ) : recentLoyalty.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      No points transactions recorded yet. Use the <strong>&quot;Award Points&quot;</strong> or{" "}
                      <strong>&quot;Redeem Points&quot;</strong> buttons above to record live transactions.
                    </td>
                  </tr>
                ) : (
                  recentLoyalty.map((lt: any) => (
                    <tr key={lt.loyalty_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(lt.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-white">{lt.customer_name}</td>
                      <td className="py-3 px-4 text-amber-400 font-bold">{lt.card_no}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                          {lt.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                            lt.transaction_type === "EARNED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                              : "bg-rose-950 text-rose-300 border border-rose-800/40"
                          }`}
                        >
                          {lt.transaction_type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          lt.points_change > 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {lt.points_change > 0 ? `+${lt.points_change}` : lt.points_change} pts
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Top Customers Leaderboard (top_customers_vw) */}
        {/* ========================================================================= */}
        {activeTab === "top" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4 font-mono">Card No</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4 text-right">Total Spent (Sales)</th>
                  <th className="py-3 px-4 text-center">Completed Orders</th>
                  <th className="py-3 px-4 text-right">Points Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Querying top_customers_vw...
                    </td>
                  </tr>
                ) : topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      No top customers found.
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((c, index) => (
                    <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-center">
                        {index === 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                            🥇
                          </span>
                        ) : index === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                            🥈
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold">#{index + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-bold">{c.card_no}</td>
                      <td className="py-3 px-4 font-sans font-medium text-white">{c.full_name}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-sans font-bold">
                        Rs. {Number(c.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-sans">{c.total_orders || 0}</td>
                      <td className="py-3 px-4 text-right text-amber-300 font-bold">
                        {Number(c.points_balance || 0).toLocaleString()} pts
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openAwardModal(c.customer_id)}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 transition-all font-sans"
                        >
                          + Award Points
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: Customer ETL Masked Privacy View (customer_etl_vw) */}
        {/* ========================================================================= */}
        {activeTab === "etl" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                  <th className="py-3 px-4 font-mono">Card No</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 font-mono">Masked Phone (concat left/right)</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4 text-right">Points Balance</th>
                  <th className="py-3 px-4">Join Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Querying customer_etl_vw...
                    </td>
                  </tr>
                ) : customerEtl.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                      No records in customer_etl_vw.
                    </td>
                  </tr>
                ) : (
                  customerEtl.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-amber-400 font-bold">{c.card_no}</td>
                      <td className="py-3 px-4 font-sans font-medium text-white">{c.full_name}</td>
                      <td className="py-3 px-4 text-slate-300 font-bold">
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
                          {c.masked_phone}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans">{c.email || "—"}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-300">
                        {Number(c.points_balance || 0).toLocaleString()} pts
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {c.join_date ? new Date(c.join_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Award Loyalty Points (CALL add_ltpoints) */}
      {/* ========================================================================= */}
      {awardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Award Points (add_ltpoints)</h3>
                  <p className="text-xs text-slate-400">Executes stored procedure add_ltpoints()</p>
                </div>
              </div>
              <button
                onClick={() => setAwardModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAwardSubmit} className="space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Customer <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.card_no} - {c.full_name} ({c.tier}, {c.points_balance} pts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Summary Card */}
              {activeSelectedCust && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{activeSelectedCust.full_name}</span>
                    <span className="text-slate-400 text-[11px] block">{activeSelectedCust.card_no}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-300 mr-2">
                      {activeSelectedCust.tier}
                    </span>
                    <span className="font-mono font-bold text-amber-400">{activeSelectedCust.points_balance} pts</span>
                  </div>
                </div>
              )}

              {/* Points Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Points to Award <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 100"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Note / Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Note / Campaign Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Bonus points for loyalty anniversary"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAwardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{submittingAction ? "Awarding..." : "Award Points"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Redeem Loyalty Points (CALL redeem_points) */}
      {/* ========================================================================= */}
      {redeemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Minus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Redeem Points (redeem_points)</h3>
                  <p className="text-xs text-slate-400">Executes stored procedure redeem_points()</p>
                </div>
              </div>
              <button
                onClick={() => setRedeemModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRedeemSubmit} className="space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Customer <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.card_no} - {c.full_name} ({c.tier}, {c.points_balance} pts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Summary Card */}
              {activeSelectedCust && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{activeSelectedCust.full_name}</span>
                    <span className="text-slate-400 text-[11px] block">{activeSelectedCust.card_no}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Available Points</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {activeSelectedCust.points_balance} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Points to Redeem */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Points to Redeem <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={activeSelectedCust ? activeSelectedCust.points_balance : undefined}
                  step="1"
                  placeholder="e.g. 50"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-rose-500"
                  required
                />
                {activeSelectedCust && parseInt(pointsInput, 10) > activeSelectedCust.points_balance && (
                  <p className="text-[11px] text-rose-400 mt-1">
                    Entered points exceed available balance of {activeSelectedCust.points_balance} pts!
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRedeemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingAction ||
                    (activeSelectedCust ? parseInt(pointsInput, 10) > activeSelectedCust.points_balance : false)
                  }
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 border border-rose-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submittingAction ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  <span>{submittingAction ? "Redeeming..." : "Redeem Points"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
