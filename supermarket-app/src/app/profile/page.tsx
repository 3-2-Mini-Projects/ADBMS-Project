import Link from "next/link";

export default function ProfilePage() {
  return (
    <section className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Account</p>
      <h1 className="text-3xl font-black text-white">My Profile</h1>
      <p className="text-sm text-slate-400">Your staff profile is managed by the administrator.</p>
      <Link href="/dashboard" className="inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">
        Back to dashboard
      </Link>
    </section>
  );
}
