"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone =
    pathname === "/login" ||
    pathname.startsWith("/cashier") ||
    pathname.startsWith("/sales");

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100/70 text-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
