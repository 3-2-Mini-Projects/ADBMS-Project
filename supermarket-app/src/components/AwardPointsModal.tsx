"use client";

import React, { useState, useEffect } from "react";
import { Customer } from "@/lib/types";
import {
  Coins,
  Sparkles,
  X,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Gift,
  ShieldAlert,
} from "lucide-react";

interface AwardPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess: (result: any) => void;
}

export default function AwardPointsModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: AwardPointsModalProps) {
  const [type, setType] = useState<"EARN" | "REDEEM" | "ADJUST" | "EXPIRE">("EARN");
  const [points, setPoints] = useState<number | string>(100);
  const [note, setNote] = useState("Promotional loyalty reward bonus");
  const [saleId, setSaleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setType("EARN");
      setPoints(100);
      setNote("Promotional loyalty reward bonus");
      setSaleId("");
      setErrorMsg("");
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const currentBal = Number(customer.points_balance || 0);
  const numPoints = Math.abs(Number(points) || 0);

  let effectiveChange = 0;
  if (type === "EARN") effectiveChange = numPoints;
  else if (type === "REDEEM" || type === "EXPIRE") effectiveChange = -numPoints;
  else if (type === "ADJUST") effectiveChange = Number(points) || 0;

  const projectedBalance = currentBal + effectiveChange;
  const isNegative = projectedBalance < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!numPoints || numPoints <= 0) {
      setErrorMsg("Please enter a valid points amount greater than 0");
      return;
    }

    if (isNegative) {
      setErrorMsg(
        `Action would result in negative points balance (${projectedBalance} pts). Customer only has ${currentBal} pts available.`
      );
      return;
    }

    if (!note.trim()) {
      setErrorMsg("Please provide an audit note or reason for this loyalty transaction");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/customers/${customer.customer_id}/loyalty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          points: type === "ADJUST" ? Number(points) : numPoints,
          note: note.trim(),
          sale_id: saleId.trim() ? Number(saleId.trim()) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to process loyalty transaction");
        return;
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Network error processing transaction");
    } finally {
      setLoading(false);
    }
  };

  const quickPresets = [
    { label: "+50 pts", val: 50 },
    { label: "+100 pts", val: 100 },
    { label: "+250 pts", val: 250 },
    { label: "+500 pts", val: 500 },
    { label: "+1000 pts", val: 1000 },
  ];

  const noteSuggestions = [
    "Promotional loyalty reward bonus",
    "Customer appreciation goodwill bonus",
    "Store anniversary celebration points",
    "Special event manual credit",
    "Transaction point reconciliation",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Award / Process Loyalty Points</span>
              </h3>
              <p className="text-xs text-slate-400">
                Grant or adjust loyalty points for member with full transaction audit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Badge Banner */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <span>{customer.full_name}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                {customer.card_no}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Phone: <span className="font-mono text-slate-300">{customer.phone}</span> • Tier:{" "}
              <span className="font-bold text-amber-300">{customer.tier}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Current Points
            </div>
            <div className="text-base font-black font-mono text-emerald-400">
              {currentBal} pts
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Transaction Type Tabs */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType("EARN");
                  setNote("Promotional loyalty reward bonus");
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 ${
                  type === "EARN"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>EARN (+pts)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("REDEEM");
                  setNote("Store point redemption / discount");
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 ${
                  type === "REDEEM"
                    ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-950/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>REDEEM (-pts)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("ADJUST");
                  setNote("Manual balance correction");
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 ${
                  type === "ADJUST"
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-950/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ADJUST (±pts)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("EXPIRE");
                  setNote("Annual loyalty point expiration");
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 ${
                  type === "EXPIRE"
                    ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-950/50"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>EXPIRE (-pts)</span>
              </button>
            </div>
          </div>

          {/* Points Input & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                Points Amount {type === "ADJUST" ? "(Use minus - for deduction)" : ""}
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                Rate: 1 pt ≈ Rs. 1.00
              </span>
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={type === "ADJUST" ? -currentBal : 1}
                required
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white font-bold focus:border-emerald-500"
                placeholder="100"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {quickPresets.map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setPoints(preset.val)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason / Note */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Audit Note / Reason <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Promotional loyalty reward bonus"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-emerald-500"
            />
            {/* Note suggestion tags */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {noteSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNote(s)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Sale ID */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Associated Sale ID (Optional)
            </label>
            <input
              type="number"
              placeholder="e.g. 104"
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white placeholder-slate-600 focus:border-emerald-500"
            />
          </div>

          {/* Interactive Calculation Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Current Balance:</span>
              <span className="font-mono text-white font-semibold">{currentBal} pts</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Points Adjustment:</span>
              <span
                className={`font-mono font-bold ${
                  effectiveChange > 0
                    ? "text-emerald-400"
                    : effectiveChange < 0
                    ? "text-rose-400"
                    : "text-slate-400"
                }`}
              >
                {effectiveChange > 0 ? `+${effectiveChange}` : effectiveChange} pts
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold">
              <span className="text-slate-200">Resulting Balance:</span>
              <span
                className={`font-mono text-sm ${
                  isNegative ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {projectedBalance} pts
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isNegative}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Coins className="w-4 h-4" />
              <span>{loading ? "Processing..." : `Confirm ${type} Transaction`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
