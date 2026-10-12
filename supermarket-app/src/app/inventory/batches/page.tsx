import Link from "next/link";

export default function InventoryBatchesPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Inventory Batches</h1>
        <p className="mt-1 text-sm text-slate-400">
          Track received product batches and expiry dates.
        </p>
      </div>
      <Link
        href="/inventory"
        className="inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
      >
        Open inventory and batch tracking
      </Link>
    </section>
  );
}
