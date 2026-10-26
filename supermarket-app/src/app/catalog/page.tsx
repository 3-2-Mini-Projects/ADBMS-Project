import { CatalogDashboardView } from "@/components/dashboard/CatalogDashboardView";

export const metadata = {
  title: "Catalog Dashboard | Supermarket ADBMS",
  description: "Product catalog management, pricing revisions, supervisor approval gate, and slow-moving inventory tracking.",
};

export default function CatalogDashboardPage() {
  return <CatalogDashboardView />;
}
