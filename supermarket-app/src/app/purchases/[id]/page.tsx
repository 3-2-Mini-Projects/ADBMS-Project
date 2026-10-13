import Link from "next/link";

type PurchaseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PurchaseDetailsPage({
  params,
}: PurchaseDetailsPageProps) {
  const { id } = await params;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Purchase Order {id}</h1>
        <p className="mt-1 text-sm text-slate-400">
          View purchase-order items, supplier details, status, and receiving history.
        </p>
      </div>
      <Link
        href="/purchases"
        className="inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-500"
      >
        Back to purchase orders
      </Link>
    </section>
  );
}
