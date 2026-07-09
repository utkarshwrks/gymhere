import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";
import { getSessionUser } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/sa", label: "Overview", icon: "LayoutDashboard", exact: true },
  { href: "/sa/tenants", label: "Gyms", icon: "Building2" },
  { href: "/sa/plans", label: "SaaS tiers", icon: "Tags" },
  { href: "/sa/integrations", label: "Integrations", icon: "Plug" },
  { href: "/sa/announcements", label: "Announcements", icon: "Megaphone" },
  { href: "/sa/admins", label: "Admins", icon: "ShieldCheck" },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "super_admin") {
    redirect(user.role === "member" ? "/me" : "/app");
  }

  return (
    <AppShell
      nav={nav}
      brandHref="/sa"
      title="Platform"
      userSlot={
        <UserMenu
          name={user.name ?? ""}
          email={user.email}
          imageUrl={user.imageUrl}
          roleLabel="Super admin"
          clerkEnabled={isConfigured.clerk}
        />
      }
    >
      {children}
    </AppShell>
  );
}
