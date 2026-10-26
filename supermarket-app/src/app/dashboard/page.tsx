"use client";

import { redirect } from "next/navigation";
import { useApp } from "@/lib/context";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { AdminDashboardView } from "@/components/dashboard/AdminDashboardView";
import { InventoryDashboardView } from "@/components/dashboard/InventoryDashboardView";
import { MarketingDashboardVeiw } from "@/components/dashboard/MarketingDashboardVeiw";
import { CatalogDashboardView } from "@/components/dashboard/CatalogDashboardView";

export default function DashboardPage() {
  const { currentEmployee } = useApp();

  if (currentEmployee?.role === "CASHIER") {
    redirect("/cashier/dashboard");
  }

  if (currentEmployee?.role === "ADMIN") {
    return <AdminDashboardView />;
  }

  if (currentEmployee?.role === "CATALOG_MANAGER") {
    return <CatalogDashboardView />;
  }

  if (currentEmployee?.role === "STOCK_CLERK") {
    return <InventoryDashboardView />;
  }

  if (currentEmployee?.role === "MARKETING") {
    return <MarketingDashboardVeiw />;
  }

  return <DashboardView />;
}
