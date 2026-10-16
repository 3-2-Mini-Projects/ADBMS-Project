"use client";

import { useApp } from "@/lib/context";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { AdminDashboardView } from "@/components/dashboard/AdminDashboardView";
import { InventoryDashboardView } from "@/components/dashboard/InventoryDashboardView";

export default function DashboardPage() {
  const { currentEmployee } = useApp();

  if (currentEmployee?.role === "ADMIN") {
    return <AdminDashboardView />;
  }

  if (currentEmployee?.role === "STOCK_CLERK") {
    return <InventoryDashboardView />;
  }

  return <DashboardView />;
}
