import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberSubscriptions, membershipPlans, planAddons } from "@/lib/db/schema";
import { PlanManager } from "@/components/plans/plan-manager";

export const metadata: Metadata = { title: "Membership plans" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const ctx = await requireGym();

  const [plans, addons, activeSubs] = await Promise.all([
    db
      .select()
      .from(membershipPlans)
      .where(and(eq(membershipPlans.gymId, ctx.gym.id), eq(membershipPlans.isArchived, false)))
      .orderBy(membershipPlans.sortOrder, membershipPlans.createdAt),
    db
      .select()
      .from(planAddons)
      .where(and(eq(planAddons.gymId, ctx.gym.id), eq(planAddons.isArchived, false))),
    db
      .select({ planId: memberSubscriptions.planId })
      .from(memberSubscriptions)
      .where(and(eq(memberSubscriptions.gymId, ctx.gym.id), eq(memberSubscriptions.status, "active"))),
  ]);

  const counts: Record<string, number> = {};
  for (const s of activeSubs) counts[s.planId] = (counts[s.planId] ?? 0) + 1;

  return <PlanManager plans={plans} addons={addons} activeCounts={counts} />;
}
