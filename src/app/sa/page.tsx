import type { Metadata } from "next";
import { Building2, IndianRupee, LineChart, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { gyms } from "@/lib/db/schema";
import { isConfigured } from "@/lib/env";
import { formatMoneyCompact } from "@/lib/format";

export const metadata: Metadata = { title: "Platform overview" };
export const dynamic = "force-dynamic";

async function gymCount(): Promise<number> {
  if (!isConfigured.db) return 0;
  try {
    const rows = await db.select().from(gyms);
    return rows.length;
  } catch {
    return 0;
  }
}

export default async function SuperAdminHome() {
  const total = await gymCount();

  const stats = [
    { label: "Total gyms", value: total, icon: Building2 },
    { label: "Trialing", value: 0, icon: Users },
    { label: "Active MRR", value: 0, icon: IndianRupee, format: formatMoneyCompact },
    { label: "Churn (30d)", value: 0, icon: LineChart },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="Tenants, revenue and API usage across GymHere."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} index={i} label={s.label} value={s.value} icon={s.icon} format={s.format} />
        ))}
      </div>
      <EmptyState
        icon={Building2}
        title="Tenant management arrives in Phase 4"
        description="Gym activation, suspension, impersonation, the SaaS tier editor and the trial funnel will live here."
      />
    </div>
  );
}
