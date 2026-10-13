import Link from "next/link";

export default function StockAlertsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Stock Alerts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review products that have reached their reorder threshold.
        </p>
      </div>
      <Link
        href="/inventory"
        className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
      >
        Open inventory stock levels
      </Link>
    </section>
  );
}
