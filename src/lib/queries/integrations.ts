import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { gyms, integrationPolicies, tenantCredentials } from "@/lib/db/schema";
import { ensureGlobalPolicies } from "@/lib/actions/integrations";
import { FORM_SERVICES } from "@/lib/integrations/labels";
import type { IntegrationService } from "@/lib/credentials/resolver";

const SERVICES: IntegrationService[] = ["payments", "sms", "whatsapp", "email", "storage"];

export interface SuperServiceRow {
  service: IntegrationService;
  mode: "platform" | "tenant";
  allowPlatformFallback: boolean;
  usingOwn: number;
  onPlatform: number;
}

export interface TenantCredRow {
  gymId: string;
  gymName: string;
  service: string;
  status: string;
  keyHint: string | null;
}

export async function superIntegrationData(): Promise<{ services: SuperServiceRow[]; tenantRows: TenantCredRow[]; totalGyms: number }> {
  await ensureGlobalPolicies();
  const [globals, allGyms, creds] = await Promise.all([
    db.select().from(integrationPolicies).where(isNull(integrationPolicies.gymId)),
    db.select().from(gyms),
    db.select().from(tenantCredentials),
  ]);
  const gymName = new Map(allGyms.map((g) => [g.id, g.name]));
  const globalByService = new Map(globals.map((g) => [g.service, g]));

  const services: SuperServiceRow[] = SERVICES.map((service) => {
    const g = globalByService.get(service);
    const usingOwn = creds.filter((c) => c.service === service && c.status === "verified").length;
    return {
      service,
      mode: g?.mode ?? "platform",
      allowPlatformFallback: g?.allowPlatformFallback ?? true,
      usingOwn,
      onPlatform: allGyms.length - usingOwn,
    };
  });

  const tenantRows: TenantCredRow[] = creds.map((c) => ({
    gymId: c.gymId,
    gymName: gymName.get(c.gymId) ?? "—",
    service: c.service,
    status: c.status,
    keyHint: c.keyHint,
  }));

  return { services, tenantRows, totalGyms: allGyms.length };
}

export interface GymServiceRow {
  service: IntegrationService;
  effectiveMode: "platform" | "tenant";
  hasOverride: boolean;
  credStatus: string | null;
  keyHint: string | null;
  error: string | null;
}

/** Per-service integration state for a gym — only services currently in tenant mode. */
export async function gymIntegrationData(gymId: string): Promise<GymServiceRow[]> {
  await ensureGlobalPolicies();
  const [globals, overrides, creds] = await Promise.all([
    db.select().from(integrationPolicies).where(isNull(integrationPolicies.gymId)),
    db.select().from(integrationPolicies).where(eq(integrationPolicies.gymId, gymId)),
    db.select().from(tenantCredentials).where(eq(tenantCredentials.gymId, gymId)),
  ]);
  const globalByService = new Map(globals.map((g) => [g.service, g]));
  const overrideByService = new Map(overrides.map((o) => [o.service, o]));
  const credByService = new Map(creds.map((c) => [c.service, c]));

  const rows: GymServiceRow[] = [];
  for (const service of SERVICES) {
    const override = overrideByService.get(service);
    const effectiveMode = override?.mode ?? globalByService.get(service)?.mode ?? "platform";
    if (effectiveMode !== "tenant") continue; // gym page shows only tenant-mode services
    if (!FORM_SERVICES.includes(service as (typeof FORM_SERVICES)[number])) continue; // only services with a credential form
    const cred = credByService.get(service);
    rows.push({
      service,
      effectiveMode,
      hasOverride: !!override,
      credStatus: cred?.status ?? null,
      keyHint: cred?.keyHint ?? null,
      error: cred?.error ?? null,
    });
  }
  return rows;
}

export async function tenantCredForGym(gymId: string, service: IntegrationService) {
  return db.query.tenantCredentials.findFirst({ where: and(eq(tenantCredentials.gymId, gymId), eq(tenantCredentials.service, service)) });
}
