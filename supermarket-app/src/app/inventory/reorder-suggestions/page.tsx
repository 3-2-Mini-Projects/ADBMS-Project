"use client";

import Link from "next/link";
import { useApp } from "@/lib/context";
import { Sparkles, ArrowRight } from "lucide-react";

export default function ReorderSuggestionsPage() {
  const { currentEmployee } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

  return (
    <section className={`space-y-6 animate-in fade-in duration-300 ${
      isClerk ? "bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800" : "text-white"
    }`}>
      <div>
        <h1 className={`text-2xl font-black flex items-center gap-2.5 ${isClerk ? "text-slate-900" : "text-white"}`}>
          <Sparkles className="w-6 h-6 text-teal-500" />
          <span>Reorder Suggestions</span>
        </h1>
        <p className={`mt-1 text-sm ${isClerk ? "text-slate-500 font-medium" : "text-slate-400"}`}>
          Use current stock levels and sales velocity to plan replenishment purchase orders.
        </p>
      </div>

      <div className={`rounded-2xl p-6 max-w-xl ${
        isClerk
          ? "bg-white border border-slate-200/90 shadow-sm text-slate-800"
          : "glass-card border border-slate-800 text-white"
      }`}>
        <h2 className={`text-base font-bold mb-2 ${isClerk ? "text-slate-900" : "text-white"}`}>Replenishment Workflow</h2>
        <p className={`text-xs leading-relaxed mb-5 ${isClerk ? "text-slate-600" : "text-slate-400"}`}>
          Quickly generate purchase orders for suppliers based on items at or below their reorder points.
        </p>
        <Link
          href="/purchases/new"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <span>Create a Purchase Order</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
