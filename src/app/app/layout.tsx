import { redirect } from "next/navigation";
import {
  Boxes,
  CalendarCheck,
  CalendarDays,
  Dumbbell,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Receipt,
  Tags,
  UsersRound,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";
import { TrialBanner } from "@/components/shared/trial-banner";
import { SubscriptionPlans } from "@/components/billing/subscription-plans";
import { getGymContext, getSessionUser } from "@/lib/auth";
import { getPlatformPlans } from "@/lib/plans";
import { isConfigured } from "@/lib/env";
import { daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/members", label: "Members", icon: Users },
  { href: "/app/billing", label: "Billing", icon: Receipt },
  { href: "/app/enquiries", label: "Enquiries", icon: KanbanSquare },
  { href: "/app/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/app/classes", label: "Classes", icon: CalendarDays },
  { href: "/app/plans", label: "Plans", icon: Tags },
  { href: "/app/store", label: "Store", icon: Boxes },
  { href: "/app/staff", label: "Staff", icon: UsersRound },
  { href: "/app/payroll", label: "Payroll", icon: Wallet },
  { href: "/app/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/app/messages", label: "Messages", icon: Megaphone },
  { href: "/app/reports", label: "Reports", icon: LineChart },
  { href: "/app/retention", label: "Retention", icon: LineChart },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role === "super_admin") redirect("/sa");
  if (user.role === "member") redirect("/me");
  if (!user.gymId) redirect("/onboarding");

  const ctx = await getGymContext();
  if (!ctx) redirect("/onboarding");

  const status = ctx.subscription?.status;
  const trialEndsAt = ctx.subscription?.trialEndsAt ?? null;
  const trialDays = status === "trialing" && trialEndsAt ? daysUntil(trialEndsAt) : null;
  const trialExpired = status === "trialing" && trialEndsAt ? daysUntil(trialEndsAt) < 0 : false;

  const shellProps = {
    nav,
    brandHref: "/app",
    title: ctx.gym.name,
    userSlot: (
      <UserMenu
        name={user.name ?? ""}
        email={user.email}
        imageUrl={user.imageUrl}
        roleLabel={ctx.gym.name}
        clerkEnabled={isConfigured.clerk}
        settingsHref="/app/settings"
      />
    ),
  };

  if (trialExpired) {
    const plans = await getPlatformPlans();
    const currentKey = plans.find((p) => p.id === ctx.plan?.id)?.key;
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-4xl space-y-6 py-8">
          <div className="text-center">
            <h1 className="font-display text-3xl font-semibold">Your free trial has ended</h1>
            <p className="mt-2 text-muted-foreground">Choose a plan to keep running {ctx.gym.name}.</p>
          </div>
          <SubscriptionPlans
            plans={plans.map((p) => ({ key: p.key, name: p.name, pricePaise: p.pricePaise, memberCap: p.memberCap, description: p.description }))}
            currentPlanKey={currentKey}
            razorpayEnabled={isConfigured.razorpay}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell {...shellProps} banner={trialDays !== null ? <TrialBanner daysLeft={Math.max(0, trialDays)} /> : undefined}>
      {children}
    </AppShell>
  );
}
