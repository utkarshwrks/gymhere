import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformPlans } from "@/lib/db/schema";
import { isConfigured } from "@/lib/env";

export type PlatformPlan = typeof platformPlans.$inferSelect;

/**
 * Demo fallback mirrors the seed so marketing/pricing render before a DB is
 * attached. When DATABASE_URL is set, plans come from the DB (source of truth).
 */
const DEMO_PLANS: PlatformPlan[] = [
  {
    id: "demo-starter",
    key: "starter",
    name: "Starter",
    pricePaise: 99_900,
    memberCap: 100,
    features: { classes: true, microsite: true },
    description: "For a single studio finding its feet.",
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "demo-growth",
    key: "growth",
    name: "Growth",
    pricePaise: 249_900,
    memberCap: 500,
    features: { classes: true, microsite: true, reports_advanced: true, whatsapp: true, pos: true, payroll: true },
    description: "For a busy gym scaling members and staff.",
    sortOrder: 2,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "demo-pro",
    key: "pro",
    name: "Pro",
    pricePaise: 499_900,
    memberCap: null,
    features: { classes: true, microsite: true, reports_advanced: true, api_access: true, whatsapp: true, pos: true, payroll: true },
    description: "Unlimited members, API access and every module.",
    sortOrder: 3,
    isActive: true,
    createdAt: new Date(),
  },
];

export async function getPlatformPlans(): Promise<PlatformPlan[]> {
  if (!isConfigured.db) return DEMO_PLANS;
  try {
    const rows = await db
      .select()
      .from(platformPlans)
      .orderBy(asc(platformPlans.sortOrder));
    return rows.length ? rows : DEMO_PLANS;
  } catch {
    return DEMO_PLANS;
  }
}

/** Marketing-facing highlights per tier (copy lives here, not in the DB). */
export const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  starter: [
    "Up to 100 members",
    "Membership plans & billing",
    "Attendance & QR check-in",
    "Enquiry CRM",
    "Public gym microsite",
  ],
  growth: [
    "Up to 500 members",
    "Everything in Starter",
    "Classes & timetable",
    "Supplement store (POS)",
    "Staff payroll",
    "Advanced reports & broadcasts",
  ],
  pro: [
    "Unlimited members",
    "Everything in Growth",
    "Public REST API access",
    "Priority support",
    "Multi-location ready",
  ],
};
