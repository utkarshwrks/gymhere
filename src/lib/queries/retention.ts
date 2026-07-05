import { and, eq, gte, inArray } from "drizzle-orm";
import { differenceInCalendarDays, subDays } from "date-fns";
import { db } from "@/lib/db";
import { attendance, members } from "@/lib/db/schema";

export interface RetentionRow {
  memberId: string;
  name: string;
  phone: string;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
  daysPresent: number;
  irregular: boolean;
}

/**
 * Retention snapshot over the trailing window. A member is "irregular" if they
 * haven't visited in `irregularDays` days (or never have). Holidays aren't
 * counted against members in the absence math done on the report page.
 */
export async function getRetention(
  gymId: string,
  irregularDays = 7,
  windowDays = 30,
): Promise<RetentionRow[]> {
  const activeMembers = await db
    .select({ id: members.id, name: members.fullName, phone: members.phone })
    .from(members)
    .where(and(eq(members.gymId, gymId), inArray(members.status, ["active", "frozen"])));

  if (activeMembers.length === 0) return [];

  const since = subDays(new Date(), windowDays);
  const att = await db
    .select({ memberId: attendance.memberId, checkInAt: attendance.checkInAt })
    .from(attendance)
    .where(and(eq(attendance.gymId, gymId), eq(attendance.personType, "member"), gte(attendance.checkInAt, since)));

  const lastByMember = new Map<string, Date>();
  const daysByMember = new Map<string, Set<string>>();
  for (const a of att) {
    if (!a.memberId) continue;
    const cur = lastByMember.get(a.memberId);
    if (!cur || a.checkInAt > cur) lastByMember.set(a.memberId, a.checkInAt);
    const key = a.checkInAt.toISOString().slice(0, 10);
    (daysByMember.get(a.memberId) ?? daysByMember.set(a.memberId, new Set()).get(a.memberId)!).add(key);
  }

  const now = new Date();
  return activeMembers
    .map((m) => {
      const last = lastByMember.get(m.id) ?? null;
      const daysSince = last ? differenceInCalendarDays(now, last) : null;
      return {
        memberId: m.id,
        name: m.name,
        phone: m.phone,
        lastVisit: last ? last.toISOString() : null,
        daysSinceLastVisit: daysSince,
        daysPresent: daysByMember.get(m.id)?.size ?? 0,
        irregular: daysSince === null || daysSince >= irregularDays,
      };
    })
    .sort((a, b) => (b.daysSinceLastVisit ?? 9999) - (a.daysSinceLastVisit ?? 9999));
}
