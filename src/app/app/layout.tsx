import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";
import { TrialBanner } from "@/components/shared/trial-banner";
import { getGymContext, getSessionUser } from "@/lib/auth";
import { isConfigured } from "@/lib/env";
import { daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role === "super_admin") redirect("/sa");
  if (user.role === "member") redirect("/me");
  if (!user.gymId) redirect("/onboarding");

  const ctx = await getGymContext();
  if (!ctx) redirect("/onboarding");

  const trialDays =
    ctx.subscription?.status === "trialing" && ctx.subscription.trialEndsAt
      ? Math.max(0, daysUntil(ctx.subscription.trialEndsAt))
      : null;

  return (
    <AppShell
      nav={nav}
      brandHref="/app"
      title={ctx.gym.name}
      banner={trialDays !== null ? <TrialBanner daysLeft={trialDays} /> : undefined}
      userSlot={
        <UserMenu
          name={user.name ?? ""}
          email={user.email}
          imageUrl={user.imageUrl}
          roleLabel={ctx.gym.name}
          clerkEnabled={isConfigured.clerk}
        />
      }
    >
      {children}
    </AppShell>
  );
}
