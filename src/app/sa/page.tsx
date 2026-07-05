import type { Metadata } from "next";
import Link from "next/link";
import { Building2, IndianRupee, TrendingDown, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { platformStats, trialFunnel } from "@/lib/queries/platform";
import { formatMoneyCompact } from "@/lib/format";

export const metadata: Metadata = { title: "Platform overview" };
export const dynamic = "force-dynamic";

export default async function SuperAdminHome() {
  const [stats, funnel] = await Promise.all([platformStats(), trialFunnel()]);

  const cards = [
    { label: "Total gyms", value: stats.totalGyms, icon: Building2 },
    { label: "Trialing", value: stats.trialing, icon: Users },
    { label: "Active MRR", value: stats.mrrPaise, icon: IndianRupee, format: formatMoneyCompact },
    { label: "Churn (30d)", value: stats.churn30d, icon: TrendingDown },
  ];

  const funnelSteps = [
    { label: "Signed up", value: funnel.signups },
    { label: "Onboarded", value: funnel.onboarded },
    { label: "Activated", value: funnel.activated },
    { label: "Paid", value: funnel.paid },
  ];
  const max = Math.max(1, funnel.signups);

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Tenants, revenue and the trial funnel across GymHere.">
        <Button asChild><Link href="/sa/tenants">Manage gyms</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <StatCard key={c.label} index={i} label={c.label} value={c.value} icon={c.icon} format={c.format} />
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Trial funnel</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {funnelSteps.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-muted-foreground">{s.label}</span>
              <div className="h-7 flex-1 overflow-hidden rounded bg-muted">
                <div className="flex h-full items-center rounded bg-primary/80 px-2 text-xs font-medium text-primary-foreground" style={{ width: `${Math.max(6, (s.value / max) * 100)}%` }}>
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
