import { addMonths, differenceInCalendarDays, isBefore, parseISO } from "date-fns";

export type DerivedStatus = "active" | "expiring" | "expired" | "frozen";

/** endDate = startDate + durationMonths (calendar months). */
export function computeEndDate(startDate: string | Date, durationMonths: number): Date {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  return addMonths(start, durationMonths);
}

/**
 * Derive a member's live status from their current subscription.
 * "expiring" = active but ends within `soonDays` days.
 */
export function deriveStatus(
  sub: { endDate: string | Date; status: string; freezeStart?: string | null; freezeEnd?: string | null } | null,
  soonDays = 7,
): DerivedStatus | "none" {
  if (!sub) return "none";
  if (sub.status === "frozen") return "frozen";
  const end = typeof sub.endDate === "string" ? parseISO(sub.endDate) : sub.endDate;
  const daysLeft = differenceInCalendarDays(end, new Date());
  if (daysLeft < 0) return "expired";
  if (daysLeft <= soonDays) return "expiring";
  return "active";
}

export function isExpired(endDate: string | Date): boolean {
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
  return isBefore(end, new Date());
}

export function daysLeft(endDate: string | Date): number {
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;
  return differenceInCalendarDays(end, new Date());
}

/** BMI from height (cm) and weight (kg), 1 decimal. */
export function computeBmi(heightCm: number, weightKg: number): number | null {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export const statusToTone: Record<DerivedStatus | "none", "success" | "warning" | "danger" | "info" | "muted"> = {
  active: "success",
  expiring: "warning",
  expired: "danger",
  frozen: "info",
  none: "muted",
};

export const statusLabel: Record<DerivedStatus | "none", string> = {
  active: "Active",
  expiring: "Expiring",
  expired: "Expired",
  frozen: "Frozen",
  none: "No plan",
};
