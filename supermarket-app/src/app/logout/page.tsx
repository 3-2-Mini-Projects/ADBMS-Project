import Link from "next/link";

export default function LogoutPage() {
  return (
    <section className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Account</p>
      <h1 className="text-3xl font-black text-white">Logout</h1>
      <p className="text-sm text-slate-400">Use the staff-role selector in the header to change the active staff view.</p>
      <Link href="/dashboard" className="inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">
        Return to dashboard
      </Link>
    </section>
  );
}
