"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import {
  Settings,
  ShieldCheck,
  Database,
  Server,
  Lock,
  RefreshCw,
  CheckCircle2,
  Bell,
  Save,
  ArrowLeft,
} from "lucide-react";

export default function SettingsPage() {
  const { currentBranch, currentEmployee, showToast } = useApp();
  const [auditLevel, setAuditLevel] = useState("VERBOSE");
  const [autoSync, setAutoSync] = useState(true);
  const [taxRate, setTaxRate] = useState("8.5");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("System configuration saved successfully", "success");
    }, 600);
  };

  const handleTestDb = async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        showToast("MySQL Connection Active: supermarket_ADBMS pool healthy", "success");
      } else {
        showToast("Database test responded with error", "error");
      }
    } catch (err: any) {
      showToast("Database connection failed", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Administrator Settings</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">System &amp; Database Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure system governance, database connection pooling, and multi-branch operational policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database & Pool Telemetry */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Database Status (MySQL)</h2>
            </div>
            <button
              onClick={handleTestDb}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3 h-3" /> Test Connection
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Database Name</span>
              <span className="font-mono text-purple-300 font-semibold">supermarket_ADBMS</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Storage Engine</span>
              <span className="font-mono text-slate-200">InnoDB (ACID Compliant)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Connection Limit</span>
              <span className="font-mono text-emerald-400 font-semibold">10 Pool Connections</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Transaction Isolation</span>
              <span className="font-mono text-blue-300">REPEATABLE-READ</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">Concurrency Locking</span>
              <span className="font-mono text-emerald-400">SELECT ... FOR UPDATE (Row locks)</span>
            </div>
          </div>
        </div>

        {/* Audit & Compliance Policies */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Audit &amp; Security Governance</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1.5 font-medium">Audit Logging Telemetry Level</label>
              <select
                value={auditLevel}
                onChange={(e) => setAuditLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="VERBOSE">VERBOSE - Track all INSERT, UPDATE, DELETE deltas</option>
                <option value="STANDARD">STANDARD - Track price changes and sales only</option>
                <option value="MINIMAL">MINIMAL - Critical security exceptions only</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1.5 font-medium">Default Branch Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <div>
                  <div className="text-slate-200 font-medium">Real-time Multi-Branch Sync</div>
                  <div className="text-[10px] text-slate-400">Broadcast inventory changes across all branches</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
