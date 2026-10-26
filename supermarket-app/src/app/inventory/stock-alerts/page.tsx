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
  ShoppingCart,
  PackagePlus,
  Radar,
  Store,
  ChevronDown,
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
  const { currentEmployee, currentBranch, branches, showToast } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";
  const assignedBranchId = currentEmployee?.branch_id;
  const assignedBranch = branches.find((b) => b.branch_id === assignedBranchId);
  const assignedBranchName = assignedBranch?.name || currentEmployee?.branch_name || "Colombo Main";

  // Default to Clerk's assigned branch, or current active branch, or ALL
  const defaultBranchId = isClerk && assignedBranchId
    ? String(assignedBranchId)
    : currentBranch?.branch_id
    ? String(currentBranch.branch_id)
    : "ALL";

  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranchId);
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("active");
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Sync default branch when employee or context loads
  useEffect(() => {
    if (isClerk && currentEmployee?.branch_id) {
      setSelectedBranchId(String(currentEmployee.branch_id));
    } else if (currentBranch?.branch_id && selectedBranchId === "ALL") {
      setSelectedBranchId(String(currentBranch.branch_id));
    }
  }, [isClerk, currentEmployee, currentBranch]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const branchParam = selectedBranchId && selectedBranchId !== "ALL" ? `&branchId=${selectedBranchId}` : "";
      // Fetch all alerts so counts remain consistent, filter locally
      const res = await fetch(`/api/inventory/stock-alerts?status=all${branchParam}`);
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
  }, [selectedBranchId]);

  const handleScanNow = async () => {
    setScanning(true);
    try {
      const scanBranchId = selectedBranchId && selectedBranchId !== "ALL" ? Number(selectedBranchId) : undefined;
      const res = await fetch("/api/inventory/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: scanBranchId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Stock alert scan complete! ${data.active_count ?? 0} active alerts detected.`, "success");
        fetchAlerts();
      } else {
        showToast(data.error || "Failed to scan alerts", "error");
      }
    } catch {
      showToast("Network error executing alert scan", "error");
    } finally {
      setScanning(false);
    }
  };

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
        // Update local state immediately for snappy UX
        setAlerts((prev) =>
          prev.map((a) => (a.alert_id === alertId ? { ...a, is_resolved: 1 } : a))
        );
      } else {
        showToast("Failed to resolve alert", "error");
      }
    } catch {
      showToast("Error updating alert", "error");
    } finally {
      setResolvingId(null);
    }
  };

  // Static counts calculated across ALL alerts
  const totalCount = alerts.length;
  const activeCount = alerts.filter((a) => a.is_resolved === 0).length;
  const resolvedCount = alerts.filter((a) => a.is_resolved === 1).length;
  const lowStockCount = alerts.filter(
    (a) => a.is_resolved === 0 && (a.alert_type.toUpperCase().includes("LOW") || a.alert_type.toUpperCase().includes("OUT"))
  ).length;
  const expiryCount = alerts.filter(
    (a) => a.is_resolved === 0 && a.alert_type.toUpperCase().includes("EXPIRY")
  ).length;

  // Filtered rows for current active tab
  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter === "active") return a.is_resolved === 0;
    if (statusFilter === "resolved") return a.is_resolved === 1;
    return true;
  });

  const theme = {
    wrapper: "space-y-6 animate-in fade-in duration-300 text-slate-800",
    title: "text-2xl font-black text-slate-900 flex items-center gap-2.5",
    subtitle: "mt-1 text-sm text-slate-500 font-medium",
    badgeView: "text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold",
    scanBtn: "px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all",
    refreshBtn: "px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all",
    kpiCard: "rounded-2xl p-4 bg-white border border-slate-200 shadow-xs",
    kpiCardAmber: "rounded-2xl p-4 bg-white border border-amber-200 shadow-xs",
    kpiCardRose: "rounded-2xl p-4 bg-white border border-rose-200 shadow-xs",
    kpiCardTeal: "rounded-2xl p-4 bg-white border border-teal-200 shadow-xs",
    kpiLabel: "text-slate-500 text-xs font-semibold",
    kpiValue: "text-2xl font-black mt-2 font-mono text-slate-900",
    kpiValueAmber: "text-2xl font-black mt-2 font-mono text-amber-700",
    kpiValueRose: "text-2xl font-black mt-2 font-mono text-rose-700",
    kpiValueTeal: "text-2xl font-black mt-2 font-mono text-teal-700",
    tabBorder: "border-slate-200",
    tabInactive: "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs",
    tableCard: "bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs",
    thead: "border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider",
    tbodyDivide: "divide-y divide-slate-100",
    rowHover: "hover:bg-slate-50 transition-colors",
    badgeTypeExpiry: "bg-rose-50 text-rose-700 border border-rose-200",
    badgeTypeLow: "bg-amber-50 text-amber-700 border border-amber-200",
    badgeTypeOut: "bg-rose-100 text-rose-800 border border-rose-300 font-black",
    prodName: "font-semibold text-slate-900",
    barcode: "text-[10px] font-mono text-slate-500",
    branchText: "py-3.5 px-4 text-slate-600 font-medium",
    messageText: "py-3.5 px-4 text-slate-800 font-medium",
    onHand: "py-3.5 px-4 text-right font-mono font-bold text-slate-900",
    reorderLevel: "py-3.5 px-4 text-right font-mono text-slate-600",
    dateText: "py-3.5 px-4 text-center font-mono text-slate-600 text-[11px]",
    badgeStatusResolved: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold",
    badgeStatusActive: "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse font-bold",
    select: isClerk
      ? "px-3 py-1.5 pl-8 pr-8 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none cursor-pointer shadow-sm"
      : "px-3 py-1.5 pl-8 pr-8 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none cursor-pointer",
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
            {isClerk && assignedBranchId && (
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Branch #{assignedBranchId} ({assignedBranchName})
              </span>
            )}
          </div>
          <p className={theme.subtitle}>
            Real-time low stock thresholds and expiration warnings monitored live across supermarket inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanNow}
            disabled={scanning}
            className={theme.scanBtn}
            title="Scan inventory and batches for new alerts right now"
          >
            <Radar className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning..." : "Scan for Alerts"}</span>
          </button>

          <button
            onClick={fetchAlerts}
            className={theme.refreshBtn}
            title="Refresh alert list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/inventory"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Boxes className="w-3.5 h-3.5 text-slate-300" />
            <span>Inventory</span>
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
          <div className={theme.kpiValue}>{totalCount}</div>
        </div>

        <div className={theme.kpiCardAmber}>
          <div className="flex justify-between items-center text-xs">
            <span className={isClerk ? "text-amber-700 font-semibold" : "text-amber-400 font-semibold"}>Low / Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className={theme.kpiValueAmber}>{lowStockCount}</div>
        </div>

        <div className={theme.kpiCardRose}>
          <div className="flex justify-between items-center text-xs">
            <span className={isClerk ? "text-rose-700 font-semibold" : "text-rose-400 font-semibold"}>Expiry Warnings (30d)</span>
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

      {/* Controls Bar: Filter Tabs + Branch Selector */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${theme.tabBorder} pb-3`}>
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
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
            Resolved ({resolvedCount})
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : theme.tabInactive
            }`}
          >
            All Alerts ({totalCount})
          </button>
        </div>

        {/* Branch Filter Dropdown */}
        <div className="relative shrink-0 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
            Branch:
          </span>
          <div className="relative">
            <Store className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              id="alerts-branch-filter"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className={theme.select}
              title="Filter stock alerts by supermarket branch"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={String(b.branch_id)}>
                  {b.name} {isClerk && b.branch_id === currentEmployee?.branch_id ? "(Assigned Branch)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
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
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={theme.tbodyDivide}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-teal-600 mb-2" />
                    Checking live inventory alerts...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-2 opacity-60" />
                    No alerts in this view.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isExp = alert.alert_type.toUpperCase().includes("EXPIRY");
                  const isOut = alert.alert_type.toUpperCase().includes("OUT");
                  return (
                    <tr key={alert.alert_id} className={theme.rowHover}>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
                            isExp
                              ? theme.badgeTypeExpiry
                              : isOut
                              ? theme.badgeTypeOut
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
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            alert.is_resolved === 1
                              ? theme.badgeStatusResolved
                              : theme.badgeStatusActive
                          }`}
                        >
                          {alert.is_resolved === 1 ? "RESOLVED" : "ACTIVE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isExp ? (
                            <Link
                              href={`/inventory/batches?search=${alert.barcode || alert.product_name}`}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-semibold transition-all flex items-center gap-1"
                              title="Inspect batches for this product"
                            >
                              <PackagePlus className="w-3 h-3" />
                              <span>Batches</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/purchases/new?productId=${alert.product_id}`}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-semibold transition-all flex items-center gap-1"
                              title="Create purchase order to replenish stock"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Reorder</span>
                            </Link>
                          )}

                          {alert.is_resolved === 0 ? (
                            <button
                              onClick={() => handleResolveAlert(alert.alert_id)}
                              disabled={resolvingId === alert.alert_id}
                              className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-semibold transition-all flex items-center gap-1 shadow-sm"
                              title="Mark this alert as resolved"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono px-1">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
