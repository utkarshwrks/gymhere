"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import { integrationPolicies, tenantCredentials } from "@/lib/db/schema";
import { encryptJson, decryptJson, maskHint } from "@/lib/crypto";
import { can } from "@/lib/features";
import { pingRazorpay } from "@/lib/razorpay";
import type { IntegrationService } from "@/lib/credentials/resolver";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const SERVICES: IntegrationService[] = ["payments", "sms", "whatsapp", "email", "storage"];

async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") return null;
  return user;
}

/** Ensure a platform-default policy row exists for every service. */
export async function ensureGlobalPolicies() {
  const existing = await db.select().from(integrationPolicies).where(isNull(integrationPolicies.gymId));
  const have = new Set(existing.map((p) => p.service));
  for (const service of SERVICES) {
    if (!have.has(service)) {
      await db.insert(integrationPolicies).values({ gymId: null, service, mode: "platform", allowPlatformFallback: true });
    }
  }
}

// --- Super admin ---

const globalPolicySchema = z.object({
  service: z.enum(["payments", "sms", "whatsapp", "email", "storage"]),
  mode: z.enum(["platform", "tenant"]),
  allowPlatformFallback: z.boolean(),
});

export async function setGlobalPolicy(input: z.input<typeof globalPolicySchema>): Promise<Result> {
  const user = await requireSuperAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const parsed = globalPolicySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid policy" };
  const d = parsed.data;

  const existing = await db.query.integrationPolicies.findFirst({
    where: and(isNull(integrationPolicies.gymId), eq(integrationPolicies.service, d.service)),
  });
  if (existing) {
    await db.update(integrationPolicies).set({ mode: d.mode, allowPlatformFallback: d.allowPlatformFallback, updatedByUserId: user.id, updatedAt: new Date() }).where(eq(integrationPolicies.id, existing.id));
  } else {
    await db.insert(integrationPolicies).values({ gymId: null, service: d.service, mode: d.mode, allowPlatformFallback: d.allowPlatformFallback, updatedByUserId: user.id });
  }
  revalidatePath("/sa/integrations");
  return { ok: true };
}

export async function setGymOverride(gymId: string, service: IntegrationService, mode: "platform" | "tenant"): Promise<Result> {
  const user = await requireSuperAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  const existing = await db.query.integrationPolicies.findFirst({ where: and(eq(integrationPolicies.gymId, gymId), eq(integrationPolicies.service, service)) });
  if (existing) {
    await db.update(integrationPolicies).set({ mode, updatedByUserId: user.id, updatedAt: new Date() }).where(eq(integrationPolicies.id, existing.id));
  } else {
    await db.insert(integrationPolicies).values({ gymId, service, mode, updatedByUserId: user.id });
  }
  revalidatePath("/sa/integrations");
  return { ok: true };
}

export async function removeGymOverride(gymId: string, service: IntegrationService): Promise<Result> {
  const user = await requireSuperAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  await db.delete(integrationPolicies).where(and(eq(integrationPolicies.gymId, gymId), eq(integrationPolicies.service, service)));
  revalidatePath("/sa/integrations");
  return { ok: true };
}

/** Force a gym back to platform keys instantly (override to platform + disable its creds). */
export async function forceRevert(gymId: string, service: IntegrationService): Promise<Result> {
  const user = await requireSuperAdmin();
  if (!user) return { ok: false, error: "Not authorized" };
  await setGymOverride(gymId, service, "platform");
  await db.update(tenantCredentials).set({ status: "failed", error: "Reverted to platform by admin", updatedAt: new Date() }).where(and(eq(tenantCredentials.gymId, gymId), eq(tenantCredentials.service, service)));
  await logActivity({ gymId, actorUserId: user.id, action: "plan.updated", entity: "integration", summary: `${service} force-reverted to platform keys` });
  revalidatePath("/sa/integrations");
  return { ok: true };
}

// --- Gym owner ---

const CRED_FIELDS: Record<string, { fields: string[]; primary: string }> = {
  payments: { fields: ["keyId", "keySecret", "webhookSecret"], primary: "keyId" },
  email: { fields: ["apiKey", "fromEmail"], primary: "apiKey" },
  sms: { fields: ["gatewayUrl", "user", "senderId"], primary: "senderId" },
  whatsapp: { fields: ["instanceId", "accessToken"], primary: "instanceId" },
};

export async function saveTenantCreds(service: IntegrationService, values: Record<string, string>): Promise<Result> {
  const ctx = await requireGym();
  if (ctx.user.role !== "gym_owner" && ctx.user.role !== "super_admin") return { ok: false, error: "Only the gym owner can manage integrations." };
  if (!can(ctx.plan, "byo_credentials")) return { ok: false, error: "Bring-your-own keys isn't in your plan. Upgrade to connect your own." };

  const spec = CRED_FIELDS[service];
  if (!spec) return { ok: false, error: "Unsupported service" };
  const clean: Record<string, string> = {};
  for (const f of spec.fields) clean[f] = (values[f] ?? "").trim();
  if (!clean[spec.primary]) return { ok: false, error: `${spec.primary} is required` };

  const payload = encryptJson(clean);
  const hint = maskHint(clean[spec.primary]);

  const existing = await db.query.tenantCredentials.findFirst({ where: and(eq(tenantCredentials.gymId, ctx.gym.id), eq(tenantCredentials.service, service)) });
  if (existing) {
    await db.update(tenantCredentials).set({ encryptedPayload: payload, keyHint: hint, status: "unverified", error: null, updatedAt: new Date() }).where(eq(tenantCredentials.id, existing.id));
  } else {
    await db.insert(tenantCredentials).values({ gymId: ctx.gym.id, service, encryptedPayload: payload, keyHint: hint, status: "unverified", createdByUserId: ctx.user.id });
  }
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.updated", entity: "integration", summary: `${service} credentials saved` });
  revalidatePath("/app/settings/integrations");
  return { ok: true };
}

/** Safe "Test connection" ping — verifies stored creds without side effects. */
export async function testTenantCreds(service: IntegrationService): Promise<Result<{ status: string }>> {
  const ctx = await requireGym();
  const row = await db.query.tenantCredentials.findFirst({ where: and(eq(tenantCredentials.gymId, ctx.gym.id), eq(tenantCredentials.service, service)) });
  if (!row) return { ok: false, error: "Save credentials first" };

  const creds = decryptJson(row.encryptedPayload);
  let ok = false;
  let error: string | undefined;

  if (service === "payments") {
    const r = await pingRazorpay({ keyId: creds.keyId ?? "", keySecret: creds.keySecret ?? "" });
    ok = r.ok; error = r.error;
  } else if (service === "email") {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(creds.apiKey);
      const res = await resend.domains.list();
      ok = !res.error;
      error = res.error?.message;
    } catch (e) { ok = false; error = e instanceof Error ? e.message : "failed"; }
  } else {
    // SMS/WhatsApp use demo providers — accept non-empty creds as verified.
    ok = !!creds[CRED_FIELDS[service].primary];
    if (!ok) error = "Missing credentials";
  }

  await db.update(tenantCredentials).set({ status: ok ? "verified" : "failed", error: ok ? null : (error ?? "Verification failed"), lastVerifiedAt: ok ? new Date() : row.lastVerifiedAt, updatedAt: new Date() }).where(eq(tenantCredentials.id, row.id));
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.updated", entity: "integration", summary: `${service} connection ${ok ? "verified" : "failed"}` });
  revalidatePath("/app/settings/integrations");
  return ok ? { ok: true, data: { status: "verified" } } : { ok: false, error: error ?? "Verification failed" };
}

export async function deleteTenantCreds(service: IntegrationService): Promise<Result> {
  const ctx = await requireGym();
  if (ctx.user.role !== "gym_owner" && ctx.user.role !== "super_admin") return { ok: false, error: "Only the gym owner can manage integrations." };
  await db.delete(tenantCredentials).where(and(eq(tenantCredentials.gymId, ctx.gym.id), eq(tenantCredentials.service, service)));
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.archived", entity: "integration", summary: `${service} credentials deleted` });
  revalidatePath("/app/settings/integrations");
  return { ok: true };
}
