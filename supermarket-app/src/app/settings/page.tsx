"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";

export default function SettingsRedirectPage() {
  const router = useRouter();
  const { currentEmployee } = useApp();

  useEffect(() => {
    if (!currentEmployee) return;

    if (currentEmployee.role === "ADMIN") {
      router.replace("/admin/settings");
    } else if (currentEmployee.role === "CASHIER") {
      router.replace("/cashier/profile");
    } else {
      router.replace("/profile");
    }
  }, [currentEmployee, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-sm">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Redirecting to your account profile...</p>
      </div>
    </div>
  );
}
