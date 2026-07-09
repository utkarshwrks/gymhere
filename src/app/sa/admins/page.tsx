import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { superAdminList } from "@/lib/queries/platform";
import { AdminsView } from "@/components/super-admin/admins-view";

export const metadata: Metadata = { title: "Super admins" };
export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") redirect("/sign-in");
  const admins = await superAdminList();
  return <AdminsView admins={admins} currentUserId={user.id} />;
}
