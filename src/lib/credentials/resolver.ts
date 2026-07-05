import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrationPolicies, tenantCredentials } from "@/lib/db/schema";
import { decryptJson } from "@/lib/crypto";
import { env, isDemo } from "@/lib/env";

/**
 * The ONE place allowed to read service keys from the environment. Every adapter
 * (Razorpay, Resend, SMS/WhatsApp, storage) obtains credentials from here so the
 * platform-vs-tenant policy is enforced centrally. A custom ESLint rule blocks
 * direct env service-key reads anywhere else.
 */

export type IntegrationService = "payments" | "sms" | "whatsapp" | "email" | "storage";
export type CredentialSource = "tenant" | "platform";

export class CredentialsMissingError extends Error {
  constructor(public service: IntegrationService, public gymId: string) {
    super(`No credentials available for ${service}`);
    this.name = "CredentialsMissingError";
  }
}

interface EffectivePolicy {
  mode: "platform" | "tenant";
  allowPlatformFallback: boolean;
}

/** Gym override wins over the platform-wide default; default is platform+fallback. */
export async function getEffectivePolicy(gymId: string, service: IntegrationService): Promise<EffectivePolicy> {
  const override = await db.query.integrationPolicies.findFirst({
    where: and(eq(integrationPolicies.gymId, gymId), eq(integrationPolicies.service, service)),
  });
  if (override) return { mode: override.mode, allowPlatformFallback: override.allowPlatformFallback };

  const global = await db.query.integrationPolicies.findFirst({
    where: and(isNull(integrationPolicies.gymId), eq(integrationPolicies.service, service)),
  });
  if (global) return { mode: global.mode, allowPlatformFallback: global.allowPlatformFallback };

  return { mode: "platform", allowPlatformFallback: true };
}

export async function getTenantCredRow(gymId: string, service: IntegrationService) {
  return db.query.tenantCredentials.findFirst({
    where: and(eq(tenantCredentials.gymId, gymId), eq(tenantCredentials.service, service)),
  });
}

export async function hasVerifiedTenantCreds(gymId: string, service: IntegrationService): Promise<boolean> {
  const row = await getTenantCredRow(gymId, service);
  return !!row && row.status === "verified";
}

/** Platform credentials from env — reads happen ONLY in this module. */
export function getPlatformValues(service: IntegrationService): Record<string, string> {
  switch (service) {
    case "payments":
      return { keyId: env.RAZORPAY_KEY_ID ?? "", keySecret: env.RAZORPAY_KEY_SECRET ?? "", webhookSecret: env.RAZORPAY_WEBHOOK_SECRET ?? "" };
    case "email":
      return { apiKey: env.RESEND_API_KEY ?? "", fromEmail: env.RESEND_FROM_EMAIL };
    case "storage":
      return { token: env.UPLOADTHING_TOKEN ?? "" };
    default:
      return {};
  }
}

export interface Resolved {
  source: CredentialSource;
  values: Record<string, string>;
}

/**
 * Resolve credentials for a gym+service: tenant creds when in tenant mode and
 * verified; else platform env creds when fallback (or demo) is allowed; else
 * throw CredentialsMissingError for the UI to surface as a setup prompt.
 */
export async function resolveCredentials(gymId: string, service: IntegrationService): Promise<Resolved> {
  const policy = await getEffectivePolicy(gymId, service);

  if (policy.mode === "tenant") {
    const row = await getTenantCredRow(gymId, service);
    if (row && row.status === "verified") {
      return { source: "tenant", values: decryptJson(row.encryptedPayload) };
    }
    if (policy.allowPlatformFallback || isDemo) {
      return { source: "platform", values: getPlatformValues(service) };
    }
    throw new CredentialsMissingError(service, gymId);
  }

  return { source: "platform", values: getPlatformValues(service) };
}

// --- Typed convenience wrappers ---

export interface PaymentContext { source: CredentialSource; keyId: string; keySecret: string; webhookSecret: string }

export async function resolvePaymentContext(gymId: string): Promise<PaymentContext> {
  const r = await resolveCredentials(gymId, "payments");
  return { source: r.source, keyId: r.values.keyId ?? "", keySecret: r.values.keySecret ?? "", webhookSecret: r.values.webhookSecret ?? "" };
}

/** Platform SaaS billing (gyms paying GymHere) ALWAYS uses platform keys. */
export function getPlatformPaymentContext(): PaymentContext {
  const v = getPlatformValues("payments");
  return { source: "platform", keyId: v.keyId, keySecret: v.keySecret, webhookSecret: v.webhookSecret };
}

export interface EmailContext { source: CredentialSource; apiKey: string; fromEmail: string }

export async function resolveEmailContext(gymId: string): Promise<EmailContext> {
  const r = await resolveCredentials(gymId, "email");
  return { source: r.source, apiKey: r.values.apiKey ?? "", fromEmail: r.values.fromEmail || env.RESEND_FROM_EMAIL };
}

/** The gym's stored Razorpay webhook secret (for the gym-scoped webhook route). */
export async function getGymPaymentWebhookSecret(gymId: string): Promise<string | null> {
  try {
    const row = await getTenantCredRow(gymId, "payments");
    if (!row) return null;
    return decryptJson(row.encryptedPayload).webhookSecret ?? null;
  } catch {
    return null;
  }
}

/** Is online payment usable for this gym right now (tenant verified OR platform configured)? */
export async function paymentsReady(gymId: string): Promise<boolean> {
  const policy = await getEffectivePolicy(gymId, "payments");
  if (policy.mode === "tenant") {
    if (await hasVerifiedTenantCreds(gymId, "payments")) return true;
    if (!policy.allowPlatformFallback && !isDemo) return false;
  }
  const v = getPlatformValues("payments");
  return real(v.keyId) && real(v.keySecret);
}

function real(v: string): boolean {
  return !!v && !/_xxx$|^xxx$/i.test(v) && !v.includes("xxxx");
}
