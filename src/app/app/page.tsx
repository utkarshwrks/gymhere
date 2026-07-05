import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  IndianRupee,
  LayoutDashboard,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { getGymContext } from "@/lib/auth";
import { daysUntil, formatMoneyCompact } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getGymContext();
  if (!ctx) redirect("/onboarding");

  const trialDays =
    ctx.subscription?.status === "trialing" && ctx.subscription.trialEndsAt
      ? Math.max(0, daysUntil(ctx.subscription.trialEndsAt))
      : null;

  // Phase 1: no members yet — everything reads zero until Phase 2 wires data.
  const stats = [
    { label: "Total members", value: 0, icon: Users },
    { label: "Active members", value: 0, icon: UserCheck },
    { label: "MRR", value: 0, icon: IndianRupee, format: formatMoneyCompact },
    { label: "Pending dues", value: 0, icon: Wallet, format: formatMoneyCompact },
    { label: "Today's check-ins", value: 0, icon: TrendingUp, live: true },
    { label: "Expiring in 7 days", value: 0, icon: CalendarClock },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${ctx.gym.name}`}
        description="Here's your gym at a glance. Add members and plans to bring it to life."
      >
        {trialDays !== null && (
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            Trial · {trialDays} day{trialDays === 1 ? "" : "s"} left
          </Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            index={i}
            label={s.label}
            value={s.value}
            icon={s.icon}
            format={s.format}
            live={s.live}
          />
        ))}
      </div>

      <EmptyState
        icon={LayoutDashboard}
        title="Your dashboard is ready"
        description="Member growth, revenue charts, renewals and today's activity will appear here once you start adding members and plans in the next step."
      />
    </div>
  );
}
