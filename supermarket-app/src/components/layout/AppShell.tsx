"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = pathname === "/login";

  if (isStandalone) {
    return <>{children}</>;
  }

  const isPos = pathname === "/cashier/pos";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main
          className={`flex-1 ${
            isPos ? "overflow-hidden p-2 md:p-3 flex flex-col" : "overflow-y-auto p-6 md:p-8"
          } bg-slate-100/70 text-slate-900`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
