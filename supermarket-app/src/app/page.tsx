import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getRoleDefaultPath } from "@/lib/permissions";

export default async function Home() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  redirect(getRoleDefaultPath(session.role));
}
