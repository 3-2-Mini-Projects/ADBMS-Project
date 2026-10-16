"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  RefreshCw,
  Boxes,
  Bell,
  ShieldAlert,
} from "lucide-react";

interface StockAlertItem {
  alert_id: number;
  alert_type: string;
  message: string;
  is_resolved: number;
  created_at: string;
  branch_id: number;
  branch_name: string;
  product_id: number;
  barcode: string;
  product_name: string;
  quantity_on_hand: number;
  reorder_level: number;
}

export default function StockAlertsPage() {
  const { currentEmployee, currentBranch, showToast } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const branchParam = currentBranch ? `&branchId=${currentBranch.branch_id}` : "";
      const res = await fetch(`/api/inventory/stock-alerts?status=${statusFilter}${branchParam}`);
      const data = await res.json();
      if (Array.isArray(data)) setAlerts(data);
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, currentBranch]);

  const handleResolveAlert = async (alertId: number) => {
    setResolvingId(alertId);
    try {
      const res = await fetch("/api/inventory/stock-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, is_resolved: 1 }),
      });
      if (res.ok) {
        showToast("Alert marked as resolved", "success");
        fetchAlerts();
      } else {
        showToast("Failed to resolve alert", "error");
      }
    } catch {
      showToast("Error updating alert", "error");
    } finally {
      setResolvingId(null);
    }
  };

  const activeCount = alerts.filter((a) => a.is_resolved === 0).length;
  const lowStockCount = alerts.filter((a) => a.alert_type.toUpperCase().includes("LOW") || a.alert_type.toUpperCase().includes("STOCK")).length;
  const expiryCount = alerts.filter((a) => a.alert_type.toUpperCase().includes("EXPIRY")).length;

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <span>Stock Alerts Management</span>
            </h1>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
              VIEW: vw_stock_alert_dashboard
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time low stock thresholds and expiration warnings monitored by MySQL event scheduler.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700/50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/inventory"
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>View All Inventory</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-slate-900/60 border border-slate-800 text-white">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Total Alerts Logged</span>
            <Bell className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-white">{alerts.length}</div>
        </div>

        <div className="rounded-2xl p-4 bg-slate-900/60 border border-amber-500/20 text-white">
          <div className="flex justify-between items-center text-amber-400 text-xs">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-amber-400">{lowStockCount}</div>
        </div>

        <div className="rounded-2xl p-4 bg-slate-900/60 border border-rose-500/20 text-white">
          <div className="flex justify-between items-center text-rose-400 text-xs">
            <span>Expiry Warnings</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-rose-400">{expiryCount}</div>
        </div>

        <div className="rounded-2xl p-4 bg-slate-900/60 border border-teal-500/20 text-white">
          <div className="flex justify-between items-center text-teal-400 text-xs">
            <span>Unresolved Active</span>
            <ShieldAlert className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-teal-400">{activeCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "active"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Active Unresolved ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter("resolved")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "resolved"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Resolved ({alerts.length - activeCount})
        </button>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4">Message</th>
                <th className="py-3.5 px-4 text-right">On Hand</th>
                <th className="py-3.5 px-4 text-right">Reorder Level</th>
                <th className="py-3.5 px-4 text-center">Date Logged</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-teal-400 mb-2" />
                    Querying vw_stock_alert_dashboard...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-2 opacity-60" />
                    No alerts found for current criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.alert_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          alert.alert_type.toUpperCase().includes("EXPIRY")
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {alert.alert_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{alert.product_name || "—"}</div>
                      <div className="text-[10px] font-mono text-slate-500">{alert.barcode || "—"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{alert.branch_name || "—"}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{alert.message}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {alert.quantity_on_hand ?? "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {alert.reorder_level ?? "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          alert.is_resolved === 1
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {alert.is_resolved === 1 ? "RESOLVED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {alert.is_resolved === 0 ? (
                        <button
                          onClick={() => handleResolveAlert(alert.alert_id)}
                          disabled={resolvingId === alert.alert_id}
                          className="px-2.5 py-1 rounded-lg bg-teal-600/80 hover:bg-teal-600 text-white text-[11px] font-semibold transition-all flex items-center gap-1 mx-auto"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Done</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
