import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getRoleDefaultPath, canAccess } from "@/lib/permissions";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Cashiers must NOT access inventory & batch management
  if (session.role === "CASHIER" || !canAccess(session.role, "manage_inventory")) {
    redirect(getRoleDefaultPath(session.role));
  }

  return <>{children}</>;
}
