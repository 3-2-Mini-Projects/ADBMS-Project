import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getRoleDefaultPath } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Allow ADMIN, MANAGER, and HR to access administrative sections
  const isAuthorized =
    session.role === "ADMIN" || session.role === "MANAGER" || session.role === "HR";

  if (!isAuthorized) {
    redirect(getRoleDefaultPath(session.role));
  }

  return <>{children}</>;
}
