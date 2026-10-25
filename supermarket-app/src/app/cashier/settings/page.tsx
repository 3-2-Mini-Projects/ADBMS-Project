"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CashierSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cashier/profile");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div className="card" style={{ padding: 24, textAlign: "center", maxWidth: 360 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Redirecting to Cashier Profile...
        </p>
      </div>
    </div>
  );
}
