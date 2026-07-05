import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendance,
  memberSubscriptions,
  members,
  membershipPlans,
} from "@/lib/db/schema";

export type MemberRow = typeof members.$inferSelect;
export type SubscriptionRow = typeof memberSubscriptions.$inferSelect;

export interface MemberWithSub extends MemberRow {
  currentSub: SubscriptionRow | null;
}

function latestByEndDate(subs: SubscriptionRow[]): Map<string, SubscriptionRow> {
  const map = new Map<string, SubscriptionRow>();
  for (const s of subs) {
    const cur = map.get(s.memberId);
    if (!cur || new Date(s.endDate) > new Date(cur.endDate)) map.set(s.memberId, s);
  }
  return map;
}

/** All members for a gym with their current (latest) subscription attached. */
export async function listMembers(gymId: string): Promise<MemberWithSub[]> {
  const [memberRows, subs] = await Promise.all([
    db.select().from(members).where(eq(members.gymId, gymId)).orderBy(desc(members.createdAt)),
    db.select().from(memberSubscriptions).where(eq(memberSubscriptions.gymId, gymId)),
  ]);
  const latest = latestByEndDate(subs);
  return memberRows.map((m) => ({ ...m, currentSub: latest.get(m.id) ?? null }));
}

export async function memberCount(gymId: string): Promise<number> {
  const rows = await db.select({ id: members.id }).from(members).where(eq(members.gymId, gymId));
  return rows.length;
}

export interface MemberDetail {
  member: MemberRow;
  subscriptions: SubscriptionRow[];
  currentSub: SubscriptionRow | null;
  recentAttendance: (typeof attendance.$inferSelect)[];
}

export async function getMember(gymId: string, memberId: string): Promise<MemberDetail | null> {
  const member = await db.query.members.findFirst({
    where: and(eq(members.gymId, gymId), eq(members.id, memberId)),
  });
  if (!member) return null;

  const [subs, att] = await Promise.all([
    db
      .select()
      .from(memberSubscriptions)
      .where(and(eq(memberSubscriptions.gymId, gymId), eq(memberSubscriptions.memberId, memberId)))
      .orderBy(desc(memberSubscriptions.startDate)),
    db
      .select()
      .from(attendance)
      .where(and(eq(attendance.gymId, gymId), eq(attendance.memberId, memberId)))
      .orderBy(desc(attendance.checkInAt))
      .limit(120),
  ]);

  const currentSub =
    subs.length > 0
      ? subs.reduce((a, b) => (new Date(a.endDate) > new Date(b.endDate) ? a : b))
      : null;

  return { member, subscriptions: subs, currentSub, recentAttendance: att };
}

/** Members whose current membership ends within `days` days (and not expired). */
export async function expiringMembers(gymId: string, days = 7): Promise<MemberWithSub[]> {
  const all = await listMembers(gymId);
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(now.getDate() + days);
  return all.filter((m) => {
    if (!m.currentSub) return false;
    const end = new Date(m.currentSub.endDate);
    return end >= now && end <= horizon;
  });
}

export async function listPlansForGym(gymId: string) {
  return db
    .select()
    .from(membershipPlans)
    .where(and(eq(membershipPlans.gymId, gymId), eq(membershipPlans.isArchived, false)))
    .orderBy(membershipPlans.sortOrder);
}
