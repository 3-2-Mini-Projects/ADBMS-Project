"use client";

import React, { use } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

type PurchaseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default function PurchaseDetailsPage({
  params,
}: PurchaseDetailsPageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { currentEmployee } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

  const theme = {
    wrapper: isClerk
      ? "space-y-6 animate-in fade-in duration-300 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-6 animate-in fade-in duration-300 text-slate-100",
    title: isClerk ? "text-2xl font-black text-slate-900 flex items-center gap-2.5" : "text-2xl font-black text-white flex items-center gap-2.5",
    subtitle: isClerk ? "text-xs text-slate-500 mt-1" : "text-xs text-slate-400 mt-1",
    card: isClerk
      ? "bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
      : "glass-card rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4",
    backBtn: isClerk
      ? "inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 text-xs font-bold transition-colors"
      : "inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 text-xs font-bold transition-colors",
  };

  return (
    <div className={theme.wrapper}>
      <div>
        <h1 className={theme.title}>
          <FileSpreadsheet className={`w-6 h-6 ${isClerk ? "text-teal-600" : "text-teal-400"}`} />
          <span>Purchase Order #{id}</span>
        </h1>
        <p className={theme.subtitle}>
          View purchase-order items, supplier details, status, and receiving history.
        </p>
      </div>

      <div className={theme.card}>
        <p className={`text-xs ${isClerk ? "text-slate-600" : "text-slate-400"}`}>
          Purchase order summary and receiving details can also be managed directly from the primary purchasing view.
        </p>
        <div>
          <Link href="/purchases" className={theme.backBtn}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Purchase Orders</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
