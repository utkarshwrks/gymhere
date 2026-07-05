import { desc, eq } from "drizzle-orm";
import { format, isSameMonth, subMonths } from "date-fns";
import { db } from "@/lib/db";
import {
  activityLogs,
  memberSubscriptions,
  members,
  membershipPlans,
} from "@/lib/db/schema";
import { todayCheckinCount } from "./attendance";

export interface DashboardData {
  totalMembers: number;
  activeMembers: number;
  mrrPaise: number;
  pendingDuesPaise: number;
  todayCheckins: number;
  expiringSoon: number;
  growth: { month: string; members: number }[];
  revenue: { month: string; amount: number }[];
  renewals: { id: string; name: string; endDate: string }[];
  birthdays: { id: string; name: string }[];
  activity: { id: string; summary: string; action: string; createdAt: string }[];
}

export async function getDashboard(gymId: string): Promise<DashboardData> {
  const [memberRows, subs, plans, logs, todayCheckins] = await Promise.all([
    db.select().from(members).where(eq(members.gymId, gymId)),
    db.select().from(memberSubscriptions).where(eq(memberSubscriptions.gymId, gymId)),
    db.select().from(membershipPlans).where(eq(membershipPlans.gymId, gymId)),
    db.select().from(activityLogs).where(eq(activityLogs.gymId, gymId)).orderBy(desc(activityLogs.createdAt)).limit(8),
    todayCheckinCount(gymId),
  ]);

  const planDuration = new Map(plans.map((p) => [p.id, p.durationMonths]));

  // Latest subscription per member.
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const cur = latest.get(s.memberId);
    if (!cur || new Date(s.endDate) > new Date(cur.endDate)) latest.set(s.memberId, s);
  }

  const now = new Date();
  let activeMembers = 0;
  let mrrPaise = 0;
  let expiringSoon = 0;
  const renewals: { id: string; name: string; endDate: string }[] = [];
  const nameById = new Map(memberRows.map((m) => [m.id, m.fullName]));

  for (const [memberId, sub] of latest) {
    const end = new Date(sub.endDate);
    const isActive = sub.status === "active" && end >= now;
    if (isActive) {
      activeMembers++;
      const months = planDuration.get(sub.planId) ?? 1;
      mrrPaise += Math.round(sub.pricePaise / Math.max(1, months));
      const days = (end.getTime() - now.getTime()) / 86_400_000;
      if (days <= 7) {
        expiringSoon++;
        renewals.push({ id: memberId, name: nameById.get(memberId) ?? "Member", endDate: sub.endDate });
      }
    }
  }
  renewals.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  // Growth: members created per month, last 12 months.
  const growth = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    const count = memberRows.filter((m) => isSameMonth(new Date(m.createdAt), d)).length;
    return { month: format(d, "MMM"), members: count };
  });

  // Revenue: subscription value by start month, last 6 months.
  const revenue = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const amount = subs
      .filter((s) => isSameMonth(new Date(s.startDate), d))
      .reduce((sum, s) => sum + s.pricePaise, 0);
    return { month: format(d, "MMM"), amount: Math.round(amount / 100) };
  });

  const birthdays = memberRows
    .filter((m) => {
      if (!m.dob) return false;
      const dob = new Date(m.dob);
      return dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth();
    })
    .map((m) => ({ id: m.id, name: m.fullName }));

  return {
    totalMembers: memberRows.length,
    activeMembers,
    mrrPaise,
    pendingDuesPaise: 0,
    todayCheckins,
    expiringSoon,
    growth,
    revenue,
    renewals: renewals.slice(0, 6),
    birthdays,
    activity: logs.map((l) => ({ id: l.id, summary: l.summary ?? l.action, action: l.action, createdAt: l.createdAt.toISOString() })),
  };
}
