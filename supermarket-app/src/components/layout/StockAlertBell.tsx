"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  Bell,
  BellRing,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Volume2,
  VolumeX,
  Package,
  Sparkles,
  X,
} from "lucide-react";

interface StockAlertItem {
  alert_id: number;
  alert_type: string;
  message: string;
  is_resolved: number;
  created_at: string;
  branch_id: number;
  branch_name?: string;
  product_id: number;
  barcode?: string;
  product_name?: string;
  quantity_on_hand?: number;
  reorder_level?: number;
}

export function StockAlertBell() {
  const { currentBranch, currentEmployee, showToast } = useApp();
  const isCashier = currentEmployee?.role === "CASHIER";
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Set of alert IDs already notified to prevent spamming toasts
  const notifiedIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synthesize a pleasant chime using the Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext blocked before user interaction, ignore safely
    }
  };

  // Fetch active alerts
  const fetchAlerts = async (isManual = false) => {
    if (!currentBranch) return;
    try {
      if (isManual) setIsScanning(true);
      const res = await fetch(
        `/api/inventory/stock-alerts?branchId=${currentBranch.branch_id}&status=active`
      );
      if (!res.ok) return;
      const data: StockAlertItem[] = await res.json();

      if (Array.isArray(data)) {
        setAlerts(data);

        // Check for new alerts that have not been notified in this session
        if (isFirstLoadRef.current) {
          // On first page load, memorize existing IDs without blasting toasts
          data.forEach((a) => notifiedIdsRef.current.add(a.alert_id));
          isFirstLoadRef.current = false;
        } else {
          // Detect brand new alerts
          const newAlerts = data.filter((a) => !notifiedIdsRef.current.has(a.alert_id));
          if (newAlerts.length > 0) {
            playChime();
            newAlerts.forEach((a) => {
              notifiedIdsRef.current.add(a.alert_id);
              const isLowStock = a.alert_type.toUpperCase().includes("LOW") || a.alert_type.toUpperCase().includes("STOCK");
              showToast(
                `⚡ Real-Time Alert: ${a.product_name || "Stock Item"} (${isLowStock ? "Low Stock" : "Expiry Warning"})`,
                isLowStock ? "warning" : "error"
              );
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to poll stock alerts:", err);
    } finally {
      if (isManual) setIsScanning(false);
    }
  };

  // Run on-demand scan using POST endpoint
  const handleScanNow = async () => {
    if (!currentBranch || isScanning) return;
    setIsScanning(true);
    try {
      const res = await fetch("/api/inventory/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: currentBranch.branch_id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Database audit completed. Stock alerts refreshed.", "info");
      }
      await fetchAlerts(false);
    } catch {
      showToast("Failed to run stock alert scan", "error");
    } finally {
      setIsScanning(false);
    }
  };

  // Mark an individual alert as resolved
  const handleResolveAlert = async (alertId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResolvingId(alertId);
    try {
      const res = await fetch("/api/inventory/stock-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId, is_resolved: 1 }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
        showToast("Stock alert marked as resolved", "success");
      }
    } catch {
      showToast("Failed to resolve alert", "error");
    } finally {
      setResolvingId(null);
    }
  };

  // Polling effect: Poll every 20 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 20000);

    return () => clearInterval(interval);
  }, [currentBranch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activeCount = alerts.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Stock Alerts"
        className={`relative p-2 rounded-lg border transition-all flex items-center justify-center ${
          activeCount > 0
            ? "bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20"
            : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700/80 hover:text-white"
        }`}
        title={`${activeCount} active stock alert${activeCount === 1 ? "" : "s"}`}
      >
        {activeCount > 0 ? (
          <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4 text-slate-400" />
        )}

        {/* Unread Count Badge */}
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 border border-slate-900 text-white text-[10px] font-bold flex items-center justify-center shadow-lg animate-bounce">
            {activeCount > 99 ? "99+" : activeCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-3.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  Stock Health Alerts
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      activeCount > 0
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {activeCount} active
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  Real-time inventory thresholds & expiry notifications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) playChime();
                }}
                className={`p-1.5 rounded-md hover:bg-slate-700 transition-colors ${
                  soundEnabled ? "text-blue-400" : "text-slate-500"
                }`}
                title={soundEnabled ? "Chime Enabled" : "Chime Muted"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Scan / Refresh Button */}
              <button
                onClick={handleScanNow}
                disabled={isScanning}
                className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                title="Scan database for new alerts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-amber-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Alert List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
            {alerts.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-200">All Stock Healthy</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                  No low-stock items or expiring batches detected for {currentBranch?.name || "this branch"}.
                </p>
              </div>
            ) : (
              alerts.slice(0, 6).map((alert) => {
                const isLowStock =
                  alert.alert_type.toUpperCase().includes("LOW") ||
                  alert.alert_type.toUpperCase().includes("STOCK");
                return (
                  <div
                    key={alert.alert_id}
                    className="p-3 hover:bg-slate-800/60 transition-colors group flex items-start gap-2.5"
                  >
                    <div
                      className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                        isLowStock
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isLowStock ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {alert.product_name || `Product #${alert.product_id}`}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                            isLowStock
                              ? "bg-amber-900/40 text-amber-300 border border-amber-700/40"
                              : "bg-rose-900/40 text-rose-300 border border-rose-700/40"
                          }`}
                        >
                          {isLowStock ? "LOW STOCK" : "EXPIRY"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {alert.message}
                      </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px]">
                      <span className="text-slate-500">
                        {new Date(alert.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <button
                        onClick={(e) => handleResolveAlert(alert.alert_id, e)}
                        disabled={resolvingId === alert.alert_id}
                        className="text-blue-400 hover:text-blue-300 font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{resolvingId === alert.alert_id ? "Resolving..." : "Resolve"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>

          {/* Footer Navigation */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
            <Link
              href={isCashier ? "/cashier/products" : "/inventory/stock-alerts"}
              onClick={() => setIsOpen(false)}
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 text-[11px]"
            >
              <span>{isCashier ? "View Branch Stock" : "View All Alerts"}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            {!isCashier && (
              <Link
                href="/inventory/reorder-suggestions"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
              >
                <Package className="w-3 h-3" />
                <span>Reorder Suggestions</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
