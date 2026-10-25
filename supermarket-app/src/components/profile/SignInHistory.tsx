"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  KeyRound,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Calendar,
  History,
  Filter,
} from "lucide-react";

export interface SignInLog {
  audit_id: number;
  event: string;
  action: string;
  timestamp: string;
  email: string | null;
  role: string | null;
  details?: Record<string, unknown>;
}

interface SignInHistoryProps {
  className?: string;
  maxHeight?: number | string;
  compact?: boolean;
}

export function SignInHistory({
  className = "",
  maxHeight = 360,
  compact = false,
}: SignInHistoryProps) {
  const [logs, setLogs] = useState<SignInLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");

  const fetchSignInLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load sign-in history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignInLogs();
  }, []);

  const formatEvent = (event: string) => {
    switch (event) {
      case "LOGIN_SUCCESS":
        return {
          label: "Signed In Successfully",
          badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
          dotColor: "bg-emerald-500",
          icon: LogIn,
        };
      case "LOGOUT":
        return {
          label: "Signed Out",
          badgeClass: "text-slate-700 bg-slate-100 border-slate-200",
          dotColor: "bg-slate-400",
          icon: LogOut,
        };
      case "PASSWORD_CHANGED":
        return {
          label: "Password Updated",
          badgeClass: "text-purple-700 bg-purple-50 border-purple-200",
          dotColor: "bg-purple-500",
          icon: KeyRound,
        };
      case "LOGIN_FAILURE":
        return {
          label: "Sign-in Failed",
          badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
          dotColor: "bg-rose-500",
          icon: AlertCircle,
        };
      default:
        return {
          label: event.replace(/_/g, " "),
          badgeClass: "text-blue-700 bg-blue-50 border-blue-200",
          dotColor: "bg-blue-500",
          icon: Clock,
        };
    }
  };

  const timeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "ALL") return true;
    return log.event === filter;
  });

  return (
    <div className={`rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs ${className}`}>
      {/* Component Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sign-in &amp; Session History</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chronological log of logins, sign-outs, and credential activity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSignInLogs}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs if not compact */}
      {!compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { label: "All Events", value: "ALL" },
            { label: "Sign-ins", value: "LOGIN_SUCCESS" },
            { label: "Sign-outs", value: "LOGOUT" },
            { label: "Password Updates", value: "PASSWORD_CHANGED" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                filter === tab.value
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Logs Scroll Container */}
      <div
        className="space-y-2.5 overflow-y-auto pr-1"
        style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
      >
        {loading && logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading authentication history...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            No activity records matching filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const evt = formatEvent(log.event);
            const Icon = evt.icon;
            const date = new Date(log.timestamp);

            return (
              <div
                key={log.audit_id}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border shrink-0 ${evt.badgeClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <span>{evt.label}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${evt.dotColor}`} />
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {date.toLocaleDateString()} at{" "}
                      {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 block">
                    {timeAgo(log.timestamp)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID #{log.audit_id}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Active Web Session
        </span>
        <span className="font-mono text-slate-400">
          Showing {filteredLogs.length} of {logs.length} logged events
        </span>
      </div>
    </div>
  );
}
