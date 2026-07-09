import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Cake } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, type FormatKey } from "@/components/shared/stat-card";
import type { IconName } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthChart, RevenueChart } from "@/components/dashboard/charts";
import { requireGym } from "@/lib/auth";
import { getDashboard } from "@/lib/queries/dashboard";
import { daysUntil, formatDate, fromNow } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireGym();
  const d = await getDashboard(ctx.gym.id);

  const trialDays =
    ctx.subscription?.status === "trialing" && ctx.subscription.trialEndsAt
      ? Math.max(0, daysUntil(ctx.subscription.trialEndsAt))
      : null;

  const stats: { label: string; value: number; icon: IconName; format?: FormatKey; live?: boolean }[] = [
    { label: "Total members", value: d.totalMembers, icon: "Users" },
    { label: "Active members", value: d.activeMembers, icon: "UserCheck" },
    { label: "MRR", value: d.mrrPaise, icon: "IndianRupee", format: "money" },
    { label: "Pending dues", value: d.pendingDuesPaise, icon: "Wallet", format: "money" },
    { label: "Today's check-ins", value: d.todayCheckins, icon: "TrendingUp", live: true },
    { label: "Expiring in 7 days", value: d.expiringSoon, icon: "CalendarClock" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${ctx.gym.name}`} description="Your gym at a glance.">
        {trialDays !== null && (
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> Trial · {trialDays} day{trialDays === 1 ? "" : "s"} left
          </Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s, i) => (
          <StatCard key={s.label} index={i} label={s.label} value={s.value} icon={s.icon} format={s.format} live={s.live} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Member growth</CardTitle></CardHeader>
          <CardContent><GrowthChart data={d.growth} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue (6 months)</CardTitle></CardHeader>
          <CardContent><RevenueChart data={d.revenue} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Upcoming renewals</CardTitle></CardHeader>
          <CardContent>
            {d.renewals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No renewals in the next 7 days.</p>
            ) : (
              <ul className="divide-y">
                {d.renewals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/app/members/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                    <span className="text-muted-foreground">{formatDate(r.endDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2"><Cake className="size-4 text-primary" /><CardTitle>Birthdays today</CardTitle></CardHeader>
          <CardContent>
            {d.birthdays.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No birthdays today.</p>
            ) : (
              <ul className="divide-y">
                {d.birthdays.map((b) => (
                  <li key={b.id} className="py-2.5 text-sm">
                    <Link href={`/app/members/${b.id}`} className="font-medium hover:underline">{b.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2"><Activity className="size-4 text-primary" /><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {d.activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {d.activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                    <span>{a.summary}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fromNow(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
