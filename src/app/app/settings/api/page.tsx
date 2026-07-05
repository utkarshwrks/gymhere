import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { and, desc, eq, gte } from "drizzle-orm";
import { startOfMonth } from "date-fns";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, apiUsageLogs } from "@/lib/db/schema";
import { ensureApiPlans } from "@/lib/actions/api-keys";
import { can } from "@/lib/features";
import { PageHeader } from "@/components/shared/page-header";
import { ApiKeysView } from "@/components/api/api-keys-view";

export const metadata: Metadata = { title: "API keys" };
export const dynamic = "force-dynamic";

export default async function ApiSettingsPage() {
  const ctx = await requireGym();
  const hasAccess = can(ctx.plan, "api_access");
  await ensureApiPlans();

  const keys = hasAccess
    ? await db.select().from(apiKeys).where(eq(apiKeys.gymId, ctx.gym.id)).orderBy(desc(apiKeys.createdAt))
    : [];
  const usage = hasAccess
    ? await db.select({ apiKeyId: apiUsageLogs.apiKeyId }).from(apiUsageLogs).where(and(eq(apiUsageLogs.gymId, ctx.gym.id), gte(apiUsageLogs.createdAt, startOfMonth(new Date()))))
    : [];

  const usageByKey: Record<string, number> = {};
  for (const u of usage) if (u.apiKeyId) usageByKey[u.apiKeyId] = (usageByKey[u.apiKeyId] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader title="API keys" description="Programmatic access to your gym's data. Read the docs at /developers." />
      <ApiKeysView
        hasAccess={hasAccess}
        keys={keys.map((k) => ({ id: k.id, name: k.name, prefix: k.keyPrefix, isActive: k.isActive, lastUsedAt: k.lastUsedAt?.toISOString() ?? null, usedThisMonth: usageByKey[k.id] ?? 0 }))}
      />
    </div>
  );
}
