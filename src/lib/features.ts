/**
 * Feature flags & tier limits. Source of truth is platform_plans.features
 * (JSON) + platform_plans.member_cap, edited live by the super admin (Phase 4)
 * and read here via can() / memberCap().
 */

export type FeatureKey =
  | "classes"
  | "api_access"
  | "whatsapp"
  | "microsite"
  | "reports_advanced"
  | "pos"
  | "payroll";

export const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "classes", label: "Classes & timetable" },
  { key: "api_access", label: "Public API access" },
  { key: "whatsapp", label: "WhatsApp/SMS broadcasts" },
  { key: "microsite", label: "Public gym microsite" },
  { key: "reports_advanced", label: "Advanced reports" },
  { key: "pos", label: "Supplement store (POS)" },
  { key: "payroll", label: "Staff payroll" },
];

export interface PlanLike {
  features: Record<string, boolean> | null;
  memberCap: number | null;
}

/** Is a feature enabled for this gym's current plan? */
export function can(plan: PlanLike | null | undefined, feature: FeatureKey): boolean {
  if (!plan?.features) return false;
  return plan.features[feature] === true;
}

/** Member cap for the plan; null = unlimited. */
export function memberCap(plan: PlanLike | null | undefined): number | null {
  return plan?.memberCap ?? null;
}

/** Would adding one more member exceed the cap? */
export function atMemberCap(plan: PlanLike | null | undefined, currentCount: number): boolean {
  const cap = memberCap(plan);
  if (cap === null) return false;
  return currentCount >= cap;
}
