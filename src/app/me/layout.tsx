import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";
import { getSessionUser } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/me", label: "Home", icon: Home, exact: true },
];

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "member") {
    redirect(user.role === "super_admin" ? "/sa" : "/app");
  }

  return (
    <AppShell
      nav={nav}
      brandHref="/me"
      title="My membership"
      userSlot={
        <UserMenu
          name={user.name ?? ""}
          email={user.email}
          imageUrl={user.imageUrl}
          roleLabel="Member"
          clerkEnabled={isConfigured.clerk}
        />
      }
    >
      {children}
    </AppShell>
  );
}
