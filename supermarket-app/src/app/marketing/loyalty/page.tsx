"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import {
  Award,
  Star,
  Coins,
  TrendingUp,
  ShieldCheck,
  History,
  Users,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function LoyaltyManagementPage() {
  const { currentBranch, showToast } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch(`/api/marketing/dashboard`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Error loading loyalty data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

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
        showToast(result.message || "Customer tiers recalculated successfully!", "success");
        loadData();
      } else {
        showToast(result.error || "Failed to recalculate tiers", "error");
      }
    } catch {
      showToast("Error executing recalculate_tiers procedure", "error");
    } finally {
      setRecalculating(false);
    }
  };

  const tierBreakdown = data?.tierBreakdown || [];
  const recentLoyalty = data?.recentLoyaltyActivity || [];
  const tierHistory = data?.tierHistory || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-400" />
            <span>Loyalty Program & Points Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Membership tier policies, point earn/burn rules, tier thresholds, and transactional ledger tracking.
          </p>
        </div>

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

      {/* Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "BRONZE", minPts: "0 pts", earnRate: "1 pt / Rs. 100", color: "orange" },
          { name: "SILVER", minPts: "500 pts", earnRate: "1.2 pts / Rs. 100", color: "slate" },
          { name: "GOLD", minPts: "1,500 pts", earnRate: "1.5 pts / Rs. 100", color: "amber" },
          { name: "PLATINUM", minPts: "3,000 pts", earnRate: "2.0 pts / Rs. 100", color: "purple" },
        ].map((t) => {
          const stats = tierBreakdown.find((tb: any) => tb.tier === t.name);
          const count = stats?.customer_count ?? 0;
          return (
            <div
              key={t.name}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-sm text-white">{t.name}</span>
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

      {/* Points Transactions Ledger */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <span>Recent Points Ledger Transactions (loyalty_transactions)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">{recentLoyalty.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 font-mono">Card No</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Points Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    Loading loyalty ledger...
                  </td>
                </tr>
              ) : recentLoyalty.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    No points transactions recorded yet.
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
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
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
      </div>
    </div>
  );
}
