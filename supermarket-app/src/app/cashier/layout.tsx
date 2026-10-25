import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getRoleDefaultPath } from "@/lib/permissions";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Allow CASHIER, ADMIN, and MANAGER to access cashier desk
  const isAuthorized =
    session.role === "CASHIER" || session.role === "ADMIN" || session.role === "MANAGER";

  if (!isAuthorized) {
    redirect(getRoleDefaultPath(session.role));
  }

  return <>{children}</>;
}

