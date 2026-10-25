"use client";

import React from "react";
import { useApp } from "@/lib/context";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = "border-blue-200 bg-white text-slate-800";
        let icon = <Info className="w-5 h-5 text-blue-600 shrink-0" />;

        if (toast.type === "success") {
          borderClass = "border-emerald-200 bg-white text-slate-800 border-l-4 border-l-emerald-600";
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
        } else if (toast.type === "error") {
          borderClass = "border-rose-200 bg-white text-slate-800 border-l-4 border-l-rose-600";
          icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
        } else if (toast.type === "warning") {
          borderClass = "border-amber-200 bg-white text-slate-800 border-l-4 border-l-amber-600";
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
        } else {
          borderClass = "border-blue-200 bg-white text-slate-800 border-l-4 border-l-blue-600";
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${borderClass}`}
          >
            <div className="flex items-center gap-3">
              {icon}
              <p className="text-xs font-semibold leading-snug text-slate-800">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
