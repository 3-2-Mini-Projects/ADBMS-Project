import Link from "next/link";

export default function NewPurchasePage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">New Purchase Order</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create a purchase order for a supplier and branch.
        </p>
      </div>
      <Link
        href="/purchases"
        className="inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-500"
      >
        Open purchase orders
      </Link>
    </section>
  );
}
