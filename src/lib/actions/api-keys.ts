"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import { apiKeys, apiPlans } from "@/lib/db/schema";
import { can } from "@/lib/features";
import { generateApiKey } from "@/lib/api/keys";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const DEFAULT_API_PLANS = [
  { key: "free", name: "Free", monthlyQuota: 1_000, pricePaise: 0 },
  { key: "startup", name: "Startup", monthlyQuota: 50_000, pricePaise: 499_900 },
  { key: "scale", name: "Scale", monthlyQuota: 1_000_000, pricePaise: 2_499_900 },
];

export async function ensureApiPlans() {
  const existing = await db.select().from(apiPlans).orderBy(asc(apiPlans.monthlyQuota));
  if (existing.length > 0) return existing;
  await db.insert(apiPlans).values(DEFAULT_API_PLANS);
  return db.select().from(apiPlans).orderBy(asc(apiPlans.monthlyQuota));
}

export async function createApiKey(name: string): Promise<Result<{ raw: string }>> {
  const ctx = await requireGym();
  if (!can(ctx.plan, "api_access")) return { ok: false, error: "API access isn't included in your plan. Upgrade to Pro." };
  if (!name.trim()) return { ok: false, error: "Name your key" };

  const plans = await ensureApiPlans();
  const freePlan = plans.find((p) => p.key === "free") ?? plans[0];
  const { raw, hash, prefix } = generateApiKey();

  await db.insert(apiKeys).values({ gymId: ctx.gym.id, name: name.trim(), keyHash: hash, keyPrefix: prefix, scopes: ["read", "write"], apiPlanId: freePlan.id });
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.created", entity: "api_key", summary: `API key "${name}" created` });

  revalidatePath("/app/settings/api");
  return { ok: true, data: { raw } };
}

export async function rotateApiKey(keyId: string): Promise<Result<{ raw: string }>> {
  const ctx = await requireGym();
  if (!can(ctx.plan, "api_access")) return { ok: false, error: "API access isn't included in your plan." };
  const { raw, hash, prefix } = generateApiKey();
  await db.update(apiKeys).set({ keyHash: hash, keyPrefix: prefix, isActive: true, lastUsedAt: null }).where(and(eq(apiKeys.gymId, ctx.gym.id), eq(apiKeys.id, keyId)));
  revalidatePath("/app/settings/api");
  return { ok: true, data: { raw } };
}

export async function revokeApiKey(keyId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.update(apiKeys).set({ isActive: false }).where(and(eq(apiKeys.gymId, ctx.gym.id), eq(apiKeys.id, keyId)));
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.archived", entity: "api_key", entityId: keyId, summary: "API key revoked" });
  revalidatePath("/app/settings/api");
  return { ok: true };
}
