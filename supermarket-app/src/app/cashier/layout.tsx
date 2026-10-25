"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCashier } from "@/lib/cashierContext";

function CashierLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { cashier, isLoading } = useCashier();

  useEffect(() => {
    if (!isLoading && !cashier) {
      router.replace("/login");
    }
  }, [isLoading, cashier, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500 font-medium text-sm">
        <span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
        <span>Verifying cashier credentials...</span>
      </div>
    );
  }

  return <>{children}</>;
}

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="p-8 text-slate-400">Loading Cashier Desk...</div>}>
      <CashierLayoutContent>{children}</CashierLayoutContent>
    </React.Suspense>
  );
}
