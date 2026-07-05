import { desc, eq } from "drizzle-orm";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import {
  gymSubscriptions,
  gyms,
  invoices,
  members,
  platformPlans,
} from "@/lib/db/schema";

export interface PlatformStats {
  totalGyms: number;
  trialing: number;
  activeGyms: number;
  mrrPaise: number;
  churn30d: number;
}

export async function platformStats(): Promise<PlatformStats> {
  const [gymRows, subs, plans] = await Promise.all([
    db.select().from(gyms),
    db.select().from(gymSubscriptions),
    db.select().from(platformPlans),
  ]);
  const priceByPlan = new Map(plans.map((p) => [p.id, p.pricePaise]));

  // Latest subscription per gym.
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const cur = latest.get(s.gymId);
    if (!cur || s.createdAt > cur.createdAt) latest.set(s.gymId, s);
  }

  let trialing = 0;
  let activeGyms = 0;
  let mrrPaise = 0;
  let churn30d = 0;
  const cutoff = subDays(new Date(), 30);
  for (const s of latest.values()) {
    if (s.status === "trialing") trialing++;
    if (s.status === "active") {
      activeGyms++;
      mrrPaise += priceByPlan.get(s.planId) ?? 0;
    }
    if ((s.status === "canceled" || s.status === "suspended") && s.updatedAt >= cutoff) churn30d++;
  }

  return { totalGyms: gymRows.length, trialing, activeGyms, mrrPaise, churn30d };
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: string;
  subStatus: string;
  memberCount: number;
}

export async function tenantList(): Promise<TenantRow[]> {
  const [gymRows, subs, plans, memberRows] = await Promise.all([
    db.select().from(gyms).orderBy(desc(gyms.createdAt)),
    db.select().from(gymSubscriptions),
    db.select().from(platformPlans),
    db.select({ gymId: members.gymId }).from(members),
  ]);
  const planName = new Map(plans.map((p) => [p.id, p.name]));
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const cur = latest.get(s.gymId);
    if (!cur || s.createdAt > cur.createdAt) latest.set(s.gymId, s);
  }
  const counts = new Map<string, number>();
  for (const m of memberRows) counts.set(m.gymId, (counts.get(m.gymId) ?? 0) + 1);

  return gymRows.map((g) => {
    const sub = latest.get(g.id);
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      status: g.status,
      tier: sub ? (planName.get(sub.planId) ?? "—") : "—",
      subStatus: sub?.status ?? "none",
      memberCount: counts.get(g.id) ?? 0,
    };
  });
}

export async function tenantDetail(gymId: string) {
  const gym = await db.query.gyms.findFirst({ where: eq(gyms.id, gymId) });
  if (!gym) return null;
  const [subs, invoiceRows, memberRows] = await Promise.all([
    db.select().from(gymSubscriptions).where(eq(gymSubscriptions.gymId, gymId)).orderBy(desc(gymSubscriptions.createdAt)),
    db.select().from(invoices).where(eq(invoices.gymId, gymId)).orderBy(desc(invoices.createdAt)).limit(20),
    db.select({ id: members.id }).from(members).where(eq(members.gymId, gymId)),
  ]);
  const plans = await db.select().from(platformPlans);
  const planName = new Map(plans.map((p) => [p.id, p.name]));
  return {
    gym,
    memberCount: memberRows.length,
    subscriptions: subs.map((s) => ({ id: s.id, plan: planName.get(s.planId) ?? "—", status: s.status, trialEndsAt: s.trialEndsAt?.toISOString() ?? null, createdAt: s.createdAt.toISOString() })),
    invoices: invoiceRows.map((i) => ({ id: i.id, number: i.number, totalPaise: i.totalPaise, status: i.status })),
  };
}

export interface FunnelData {
  signups: number;
  onboarded: number;
  activated: number;
  paid: number;
}

export async function trialFunnel(): Promise<FunnelData> {
  const [gymRows, subs, invoiceRows] = await Promise.all([
    db.select({ id: gyms.id }).from(gyms),
    db.select().from(gymSubscriptions),
    db.select({ gymId: invoices.gymId, status: invoices.status }).from(invoices),
  ]);
  const onboarded = gymRows.length; // a gym row means onboarding completed
  const activated = new Set(subs.filter((s) => s.status === "active").map((s) => s.gymId)).size;
  const paidGyms = new Set(invoiceRows.filter((i) => i.status === "paid" && i.gymId).map((i) => i.gymId as string)).size;
  return { signups: onboarded, onboarded, activated, paid: paidGyms };
}
