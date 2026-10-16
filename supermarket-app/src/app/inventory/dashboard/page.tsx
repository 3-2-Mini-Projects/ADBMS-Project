import { InventoryDashboardView } from "@/components/dashboard/InventoryDashboardView";

export const metadata = {
  title: "Inventory Dashboard | Supermarket ADBMS",
  description: "Real-time inventory health overview — stock levels, expiry tracking, category breakdowns, and branch comparisons.",
};

export default function InventoryDashboardPage() {
  return <InventoryDashboardView />;
}
