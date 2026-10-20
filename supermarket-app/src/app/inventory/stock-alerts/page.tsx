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

  const theme = {
    wrapper: isClerk
      ? "space-y-6 animate-in fade-in duration-300 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-6 animate-in fade-in duration-300 text-slate-100",
    title: isClerk
      ? "text-2xl font-black text-slate-900 flex items-center gap-2.5"
      : "text-2xl font-black text-white flex items-center gap-2.5",
    subtitle: isClerk ? "mt-1 text-sm text-slate-500 font-medium" : "mt-1 text-sm text-slate-400",
    badgeView: isClerk
      ? "text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold"
      : "text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold",
    refreshBtn: isClerk
      ? "px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-sm transition-all"
      : "px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700/50 transition-all",
    kpiCard: isClerk
      ? "rounded-2xl p-4 bg-white border border-slate-200 shadow-sm"
      : "rounded-2xl p-4 bg-slate-900/60 border border-slate-800 text-white",
    kpiCardAmber: isClerk
      ? "rounded-2xl p-4 bg-white border border-amber-200 shadow-sm"
      : "rounded-2xl p-4 bg-slate-900/60 border border-amber-500/20 text-white",
    kpiCardRose: isClerk
      ? "rounded-2xl p-4 bg-white border border-rose-200 shadow-sm"
      : "rounded-2xl p-4 bg-slate-900/60 border border-rose-500/20 text-white",
    kpiCardTeal: isClerk
      ? "rounded-2xl p-4 bg-white border border-teal-200 shadow-sm"
      : "rounded-2xl p-4 bg-slate-900/60 border border-teal-500/20 text-white",
    kpiLabel: isClerk ? "text-slate-500 text-xs font-semibold" : "text-slate-400 text-xs",
    kpiValue: isClerk ? "text-2xl font-black mt-2 font-mono text-slate-900" : "text-2xl font-black mt-2 font-mono text-white",
    kpiValueAmber: isClerk ? "text-2xl font-black mt-2 font-mono text-amber-700" : "text-2xl font-black mt-2 font-mono text-amber-400",
    kpiValueRose: isClerk ? "text-2xl font-black mt-2 font-mono text-rose-700" : "text-2xl font-black mt-2 font-mono text-rose-400",
    kpiValueTeal: isClerk ? "text-2xl font-black mt-2 font-mono text-teal-700" : "text-2xl font-black mt-2 font-mono text-teal-400",
    tabBorder: isClerk ? "border-slate-200" : "border-slate-800",
    tabInactive: isClerk
      ? "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
      : "text-slate-400 hover:text-white",
    tableCard: isClerk
      ? "bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
      : "bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm",
    thead: isClerk
      ? "border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold"
      : "border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold",
    tbodyDivide: isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/60",
    rowHover: isClerk ? "hover:bg-slate-50 transition-colors" : "hover:bg-slate-800/30 transition-colors",
    badgeTypeExpiry: isClerk
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-rose-500/15 text-rose-400 border border-rose-500/20",
    badgeTypeLow: isClerk
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    prodName: isClerk ? "font-semibold text-slate-900" : "font-semibold text-white",
    barcode: isClerk ? "text-[10px] font-mono text-slate-500" : "text-[10px] font-mono text-slate-500",
    branchText: isClerk ? "py-3.5 px-4 text-slate-600" : "py-3.5 px-4 text-slate-400",
    messageText: isClerk ? "py-3.5 px-4 text-slate-800 font-medium" : "py-3.5 px-4 text-slate-300 font-medium",
    onHand: isClerk ? "py-3.5 px-4 text-right font-mono font-bold text-slate-900" : "py-3.5 px-4 text-right font-mono font-bold text-white",
    reorderLevel: isClerk ? "py-3.5 px-4 text-right font-mono text-slate-600" : "py-3.5 px-4 text-right font-mono text-slate-400",
    dateText: isClerk ? "py-3.5 px-4 text-center font-mono text-slate-600 text-[11px]" : "py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]",
    badgeStatusResolved: isClerk
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    badgeStatusActive: isClerk
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  };

  return (
    <section className={theme.wrapper}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={theme.title}>
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <span>Stock Alerts Management</span>
            </h1>
            <span className={theme.badgeView}>
              VIEW: vw_stock_alert_dashboard
            </span>
          </div>
          <p className={theme.subtitle}>
            Real-time low stock thresholds and expiration warnings monitored by MySQL event scheduler.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            className={theme.refreshBtn}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
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
        <div className={theme.kpiCard}>
          <div className="flex justify-between items-center text-xs">
            <span className={theme.kpiLabel}>Total Alerts Logged</span>
            <Bell className="w-4 h-4 text-blue-500" />
          </div>
          <div className={theme.kpiValue}>{alerts.length}</div>
        </div>

        <div className={theme.kpiCardAmber}>
          <div className="flex justify-between items-center text-xs">
            <span className={isClerk ? "text-amber-700 font-semibold" : "text-amber-400 font-semibold"}>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className={theme.kpiValueAmber}>{lowStockCount}</div>
        </div>

        <div className={theme.kpiCardRose}>
          <div className="flex justify-between items-center text-xs">
            <span className={isClerk ? "text-rose-700 font-semibold" : "text-rose-400 font-semibold"}>Expiry Warnings</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className={theme.kpiValueRose}>{expiryCount}</div>
        </div>

        <div className={theme.kpiCardTeal}>
          <div className="flex justify-between items-center text-xs">
            <span className={isClerk ? "text-teal-700 font-semibold" : "text-teal-400 font-semibold"}>Unresolved Active</span>
            <ShieldAlert className="w-4 h-4 text-teal-600" />
          </div>
          <div className={theme.kpiValueTeal}>{activeCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={`flex items-center gap-2 border-b ${theme.tabBorder} pb-3`}>
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : theme.tabInactive
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "active"
              ? "bg-amber-600 text-white shadow-sm"
              : theme.tabInactive
          }`}
        >
          Active Unresolved ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter("resolved")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "resolved"
              ? "bg-emerald-600 text-white shadow-sm"
              : theme.tabInactive
          }`}
        >
          Resolved ({alerts.length - activeCount})
        </button>
      </div>

      {/* Alerts Table */}
      <div className={theme.tableCard}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={theme.thead}>
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
            <tbody className={theme.tbodyDivide}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-teal-600 mb-2" />
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
                  <tr key={alert.alert_id} className={theme.rowHover}>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          alert.alert_type.toUpperCase().includes("EXPIRY")
                            ? theme.badgeTypeExpiry
                            : theme.badgeTypeLow
                        }`}
                      >
                        {alert.alert_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className={theme.prodName}>{alert.product_name || "—"}</div>
                      <div className={theme.barcode}>{alert.barcode || "—"}</div>
                    </td>
                    <td className={theme.branchText}>{alert.branch_name || "—"}</td>
                    <td className={theme.messageText}>{alert.message}</td>
                    <td className={theme.onHand}>
                      {alert.quantity_on_hand ?? "—"}
                    </td>
                    <td className={theme.reorderLevel}>
                      {alert.reorder_level ?? "—"}
                    </td>
                    <td className={theme.dateText}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          alert.is_resolved === 1
                            ? theme.badgeStatusResolved
                            : theme.badgeStatusActive
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
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold transition-all flex items-center gap-1 mx-auto shadow-sm"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Resolve</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Done</span>
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
