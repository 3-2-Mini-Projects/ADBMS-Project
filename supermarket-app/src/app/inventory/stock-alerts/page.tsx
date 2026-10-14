"use client";

import Link from "next/link";
import { useApp } from "@/lib/context";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function StockAlertsPage() {
  const { currentEmployee } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

  return (
    <section className={`space-y-6 animate-in fade-in duration-300 ${
      isClerk ? "bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800" : "text-white"
    }`}>
      <div>
        <h1 className={`text-2xl font-black flex items-center gap-2.5 ${isClerk ? "text-slate-900" : "text-white"}`}>
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <span>Stock Alerts</span>
        </h1>
        <p className={`mt-1 text-sm ${isClerk ? "text-slate-500 font-medium" : "text-slate-400"}`}>
          Review products that have reached their reorder threshold or are out of stock.
        </p>
      </div>

      <div className={`rounded-2xl p-6 max-w-xl ${
        isClerk
          ? "bg-white border border-slate-200/90 shadow-sm text-slate-800"
          : "glass-card border border-slate-800 text-white"
      }`}>
        <h2 className={`text-base font-bold mb-2 ${isClerk ? "text-slate-900" : "text-white"}`}>Immediate Attention Required</h2>
        <p className={`text-xs leading-relaxed mb-5 ${isClerk ? "text-slate-600" : "text-slate-400"}`}>
          Products below minimum thresholds are highlighted in the main inventory table. Filter by Low Stock or Out of Stock to adjust levels or trigger purchase reorders.
        </p>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <span>Open Inventory Stock Levels</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
