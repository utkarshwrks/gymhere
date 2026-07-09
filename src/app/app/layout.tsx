import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";
import { TrialBanner } from "@/components/shared/trial-banner";
import { ImpersonationBanner } from "@/components/shared/impersonation-banner";
import { SubscriptionPlans } from "@/components/billing/subscription-plans";
import { getGymContext, getSessionUser } from "@/lib/auth";
import { getPlatformPlans } from "@/lib/plans";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { isConfigured } from "@/lib/env";
import { daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: "LayoutDashboard", exact: true },
  { href: "/app/members", label: "Members", icon: "Users" },
  { href: "/app/billing", label: "Billing", icon: "Receipt" },
  { href: "/app/enquiries", label: "Enquiries", icon: "KanbanSquare" },
  { href: "/app/attendance", label: "Attendance", icon: "CalendarCheck" },
  { href: "/app/classes", label: "Classes", icon: "CalendarDays" },
  { href: "/app/plans", label: "Plans", icon: "Tags" },
  { href: "/app/store", label: "Store", icon: "Boxes" },
  { href: "/app/staff", label: "Staff", icon: "UsersRound" },
  { href: "/app/payroll", label: "Payroll", icon: "Wallet" },
  { href: "/app/workouts", label: "Workouts", icon: "Dumbbell" },
  { href: "/app/messages", label: "Messages", icon: "Megaphone" },
  { href: "/app/reviews", label: "Reviews", icon: "Star" },
  { href: "/app/reports", label: "Reports", icon: "LineChart" },
  { href: "/app/retention", label: "Retention", icon: "LineChart" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role === "member") redirect("/me");

  const ctx = await getGymContext();
  if (!ctx) {
    if (user.role === "super_admin") redirect("/sa");
    redirect("/onboarding");
  }

  const status = ctx.subscription?.status;
  const trialEndsAt = ctx.subscription?.trialEndsAt ?? null;
  const trialDays = status === "trialing" && trialEndsAt ? daysUntil(trialEndsAt) : null;
  const trialExpired = status === "trialing" && trialEndsAt ? daysUntil(trialEndsAt) < 0 : false;

  const announcement = await db.query.announcements.findFirst({
    where: eq(announcements.isActive, true),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  const banner = (
    <>
      {ctx.impersonating && <ImpersonationBanner gymName={ctx.gym.name} />}
      {announcement && (
        <div className="border-b bg-foreground/[0.04] px-4 py-2 text-sm md:px-6">
          <span className="font-medium">{announcement.title}</span>
          {announcement.body ? <span className="text-muted-foreground"> — {announcement.body}</span> : null}
        </div>
      )}
      {trialDays !== null && !trialExpired && <TrialBanner daysLeft={Math.max(0, trialDays)} />}
    </>
  );

  const shellProps = {
    nav,
    brandHref: "/app",
    title: ctx.gym.name,
    banner,
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

  // Suspended gyms are blocked (super admin can still view while impersonating).
  if (ctx.gym.status === "suspended" && !ctx.impersonating) {
    return (
      <AppShell {...shellProps}>
        <div className="mx-auto max-w-lg py-16 text-center">
          <h1 className="font-display text-2xl font-semibold">This gym is suspended</h1>
          <p className="mt-2 text-muted-foreground">
            Access to {ctx.gym.name} has been paused. Please contact GymHere support to reactivate your account.
          </p>
        </div>
      </AppShell>
    );
  }

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

  return <AppShell {...shellProps}>{children}</AppShell>;
}
