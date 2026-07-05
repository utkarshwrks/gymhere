import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformPlans } from "@/lib/db/schema";
import { TierEditor } from "@/components/super-admin/tier-editor";

export const metadata: Metadata = { title: "SaaS tiers" };
export const dynamic = "force-dynamic";

export default async function SaPlansPage() {
  const plans = await db.select().from(platformPlans).orderBy(asc(platformPlans.sortOrder));
  return (
    <TierEditor
      plans={plans.map((p) => ({ id: p.id, key: p.key, name: p.name, pricePaise: p.pricePaise, memberCap: p.memberCap, description: p.description, features: (p.features ?? {}) as Record<string, boolean> }))}
    />
  );
}
