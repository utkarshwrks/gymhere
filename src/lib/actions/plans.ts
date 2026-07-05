"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import { memberSubscriptions, membershipPlans, planAddons } from "@/lib/db/schema";
import { toPaise } from "@/lib/format";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const planSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  durationMonths: z.coerce.number().int().min(1).max(120),
  priceRupees: z.coerce.number().min(0).max(10_000_000),
  sessionsPerWeek: z.coerce.number().int().min(0).max(21).optional(),
  features: z.array(z.string().max(60)).max(20).default([]),
  description: z.string().max(240).optional(),
});

export type PlanInput = z.input<typeof planSchema>;

export async function savePlan(input: PlanInput): Promise<Result<{ id: string }>> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const ctx = await requireGym();

  const values = {
    name: data.name,
    durationMonths: data.durationMonths,
    pricePaise: toPaise(data.priceRupees),
    sessionsPerWeek: data.sessionsPerWeek ?? null,
    features: data.features,
    description: data.description ?? null,
  };

  let id = data.id;
  if (id) {
    await db
      .update(membershipPlans)
      .set(values)
      .where(and(eq(membershipPlans.gymId, ctx.gym.id), eq(membershipPlans.id, id)));
    await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.updated", entity: "plan", entityId: id, summary: data.name });
  } else {
    const [row] = await db
      .insert(membershipPlans)
      .values({ gymId: ctx.gym.id, ...values })
      .returning();
    id = row.id;
    await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.created", entity: "plan", entityId: id, summary: data.name });
  }

  revalidatePath("/app/plans");
  return { ok: true, data: { id: id! } };
}

export async function archivePlan(planId: string): Promise<Result> {
  const ctx = await requireGym();

  // Guard: block archive if active members are on this plan.
  const active = await db
    .select({ id: memberSubscriptions.id })
    .from(memberSubscriptions)
    .where(
      and(
        eq(memberSubscriptions.gymId, ctx.gym.id),
        eq(memberSubscriptions.planId, planId),
        eq(memberSubscriptions.status, "active"),
      ),
    );
  if (active.length > 0) {
    return { ok: false, error: `${active.length} active member(s) are on this plan. Move them first.` };
  }

  await db
    .update(membershipPlans)
    .set({ isArchived: true })
    .where(and(eq(membershipPlans.gymId, ctx.gym.id), eq(membershipPlans.id, planId)));
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.archived", entity: "plan", entityId: planId });

  revalidatePath("/app/plans");
  return { ok: true };
}

const addonSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  kind: z.enum(["personal_training", "locker", "diet_plan", "other"]).default("other"),
  priceRupees: z.coerce.number().min(0).max(1_000_000),
});

export async function saveAddon(input: z.input<typeof addonSchema>): Promise<Result> {
  const parsed = addonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const ctx = await requireGym();

  const values = { name: data.name, kind: data.kind, pricePaise: toPaise(data.priceRupees) };
  if (data.id) {
    await db
      .update(planAddons)
      .set(values)
      .where(and(eq(planAddons.gymId, ctx.gym.id), eq(planAddons.id, data.id)));
  } else {
    await db.insert(planAddons).values({ gymId: ctx.gym.id, ...values });
  }
  revalidatePath("/app/plans");
  return { ok: true };
}

export async function archiveAddon(addonId: string): Promise<Result> {
  const ctx = await requireGym();
  await db
    .update(planAddons)
    .set({ isArchived: true })
    .where(and(eq(planAddons.gymId, ctx.gym.id), eq(planAddons.id, addonId)));
  revalidatePath("/app/plans");
  return { ok: true };
}
