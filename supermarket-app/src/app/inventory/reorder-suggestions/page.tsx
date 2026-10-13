import Link from "next/link";

export default function ReorderSuggestionsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Reorder Suggestions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Use current stock levels to plan the next supplier order.
        </p>
      </div>
      <Link
        href="/purchases/new"
        className="inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-500"
      >
        Create a purchase order
      </Link>
    </section>
  );
}
