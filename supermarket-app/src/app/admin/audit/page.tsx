"use client";

import React, { useState, useEffect } from "react";
import { AuditLog, ErrorLog } from "@/lib/types";
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  User,
  ArrowRight,
} from "lucide-react";

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<"audit" | "error">("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tableFilter) params.append("table", tableFilter);
      if (actionFilter) params.append("action", actionFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.errorLogs) setErrorLogs(data.errorLogs);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tableFilter, actionFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>Audit Trail & Security Logs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ACID transaction mutation logs, price changes, stock adjustments, and operational database errors.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "audit" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Audit Log ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("error")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "error" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Error Log ({errorLogs.length})
          </button>
        </div>
      </div>

      {activeTab === "audit" ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
            >
              <option value="">All Tables</option>
              <option value="sales">sales</option>
              <option value="products">products</option>
              <option value="inventory">inventory</option>
              <option value="returns">returns</option>
              <option value="purchase_orders">purchase_orders</option>
              <option value="employees">employees</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
            >
              <option value="">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Audit Cards List */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <Sparkles className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-2" />
                Loading audit trails...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No audit entries found matching filter.
              </div>
            ) : (
              auditLogs.map((log) => {
                let parsedOld = log.old_value;
                let parsedNew = log.new_value;

                if (typeof parsedOld === "string") {
                  try {
                    parsedOld = JSON.parse(parsedOld);
                  } catch {}
                }
                if (typeof parsedNew === "string") {
                  try {
                    parsedNew = JSON.parse(parsedNew);
                  } catch {}
                }

                return (
                  <div
                    key={log.audit_id}
                    className="glass-card rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            log.action === "INSERT"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                              : log.action === "UPDATE"
                              ? "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                              : "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                          }`}
                        >
                          {log.action}
                        </span>

                        <span className="font-mono text-xs font-bold text-white">
                          Table: <span className="text-blue-400">{log.table_name}</span> (Record #{log.record_id})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono">{log.changed_by || "system"}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono">{new Date(log.changed_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* JSON Diff Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {parsedOld && (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px]">
                          <div className="text-[10px] text-rose-400 font-bold mb-1 uppercase tracking-wider">
                            Before (Old Value)
                          </div>
                          <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">
                            {typeof parsedOld === "object" ? JSON.stringify(parsedOld, null, 2) : String(parsedOld)}
                          </pre>
                        </div>
                      )}

                      {parsedNew && (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px]">
                          <div className="text-[10px] text-emerald-400 font-bold mb-1 uppercase tracking-wider">
                            After (New Value)
                          </div>
                          <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">
                            {typeof parsedNew === "object" ? JSON.stringify(parsedNew, null, 2) : String(parsedNew)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Error Log Tab */
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                  <th className="py-3 px-4 font-semibold">Error ID</th>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Message</th>
                  <th className="py-3 px-4 font-semibold">Occurred At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {errorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No operational error events logged. System healthy!
                    </td>
                  </tr>
                ) : (
                  errorLogs.map((err) => (
                    <tr key={err.error_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-rose-400">#{err.error_id}</td>
                      <td className="py-3 px-4 font-mono text-amber-400">{err.error_code || "SQL_ERR"}</td>
                      <td className="py-3 px-4 text-slate-200">{err.message}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(err.occurred_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
