import { and, eq, gte, lte } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import { db } from "@/lib/db";
import {
  attendance,
  cashbookEntries,
  enquiries,
  enquiryStages,
  invoices,
  memberSubscriptions,
  members,
  payments,
  posSales,
  users,
} from "@/lib/db/schema";

export interface ReportData {
  from: string;
  to: string;
  revenueByMonth: { month: string; amount: number }[];
  planSplit: { plan: string; count: number }[];
  newMembers: number;
  expiredMembers: number;
  gstCollectedPaise: number;
  collectionsByStaff: { name: string; amountPaise: number }[];
  enquiryFunnel: { stage: string; count: number }[];
  attendanceHeat: { day: string; count: number }[];
  cashbook: { id: string; occurredAt: string; direction: string; source: string; description: string; amountPaise: number; balancePaise: number }[];
  totalInPaise: number;
  totalOutPaise: number;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getReports(gymId: string, from: string, to: string): Promise<ReportData> {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  toDate.setHours(23, 59, 59, 999);

  const [pays, subs, memberRows, invoiceRows, sales, entries, stageRows, enquiryRows, attRows, staffUsers] = await Promise.all([
    db.select().from(payments).where(and(eq(payments.gymId, gymId), eq(payments.status, "captured"), gte(payments.createdAt, fromDate), lte(payments.createdAt, toDate))),
    db.select().from(memberSubscriptions).where(eq(memberSubscriptions.gymId, gymId)),
    db.select().from(members).where(eq(members.gymId, gymId)),
    db.select().from(invoices).where(and(eq(invoices.gymId, gymId), gte(invoices.createdAt, fromDate), lte(invoices.createdAt, toDate))),
    db.select().from(posSales).where(and(eq(posSales.gymId, gymId), gte(posSales.createdAt, fromDate), lte(posSales.createdAt, toDate))),
    db.select().from(cashbookEntries).where(and(eq(cashbookEntries.gymId, gymId), gte(cashbookEntries.occurredAt, fromDate), lte(cashbookEntries.occurredAt, toDate))),
    db.select().from(enquiryStages).where(eq(enquiryStages.gymId, gymId)),
    db.select().from(enquiries).where(eq(enquiries.gymId, gymId)),
    db.select({ checkInAt: attendance.checkInAt }).from(attendance).where(and(eq(attendance.gymId, gymId), eq(attendance.personType, "member"), gte(attendance.checkInAt, fromDate), lte(attendance.checkInAt, toDate))),
    db.select().from(users).where(eq(users.gymId, gymId)),
  ]);

  // Revenue by month.
  const revMap = new Map<string, number>();
  for (const p of pays) {
    const key = format(p.createdAt, "MMM yyyy");
    revMap.set(key, (revMap.get(key) ?? 0) + p.amountPaise);
  }
  const revenueByMonth = Array.from(revMap.entries()).map(([month, amount]) => ({ month, amount: Math.round(amount / 100) }));

  // Plan split (active subs).
  const planMap = new Map<string, number>();
  const now = new Date();
  for (const s of subs) {
    if (s.status === "active" && new Date(s.endDate) >= now) planMap.set(s.planName, (planMap.get(s.planName) ?? 0) + 1);
  }
  const planSplit = Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count }));

  // New vs expired in range.
  const newMembers = memberRows.filter((m) => m.createdAt >= fromDate && m.createdAt <= toDate).length;
  const expiredMembers = subs.filter((s) => { const e = parseISO(s.endDate); return e >= fromDate && e <= toDate && e < now; }).length;

  // GST.
  const gstCollectedPaise = invoiceRows.reduce((s, i) => s + i.taxPaise, 0) + sales.reduce((s, x) => s + x.gstPaise, 0);

  // Collections by staff.
  const nameById = new Map(staffUsers.map((u) => [u.id, u.name ?? u.email]));
  const collMap = new Map<string, number>();
  for (const p of pays) {
    const key = p.collectedByUserId ? (nameById.get(p.collectedByUserId) ?? "Unknown") : "Online / system";
    collMap.set(key, (collMap.get(key) ?? 0) + p.amountPaise);
  }
  const collectionsByStaff = Array.from(collMap.entries()).map(([name, amountPaise]) => ({ name, amountPaise }));

  // Enquiry funnel.
  const stageName = new Map(stageRows.map((s) => [s.id, { name: s.name, order: s.sortOrder }]));
  const funnelMap = new Map<string, number>();
  for (const e of enquiryRows) {
    const st = stageName.get(e.stageId);
    if (st) funnelMap.set(st.name, (funnelMap.get(st.name) ?? 0) + 1);
  }
  const enquiryFunnel = stageRows.sort((a, b) => a.sortOrder - b.sortOrder).map((s) => ({ stage: s.name, count: funnelMap.get(s.name) ?? 0 }));

  // Attendance heat (by weekday).
  const attByDay = new Array(7).fill(0);
  for (const a of attRows) attByDay[a.checkInAt.getDay()]++;
  const attendanceHeat = DOW.map((day, i) => ({ day, count: attByDay[i] }));

  // Cash book with running balance.
  const sorted = [...entries].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  let balance = 0;
  const cashbook = sorted.map((e) => {
    balance += e.direction === "in" ? e.amountPaise : -e.amountPaise;
    return { id: e.id, occurredAt: e.occurredAt.toISOString(), direction: e.direction, source: e.source, description: e.description, amountPaise: e.amountPaise, balancePaise: balance };
  });
  const totalInPaise = entries.filter((e) => e.direction === "in").reduce((s, e) => s + e.amountPaise, 0);
  const totalOutPaise = entries.filter((e) => e.direction === "out").reduce((s, e) => s + e.amountPaise, 0);

  return {
    from, to, revenueByMonth, planSplit, newMembers, expiredMembers, gstCollectedPaise,
    collectionsByStaff, enquiryFunnel, attendanceHeat, cashbook, totalInPaise, totalOutPaise,
  };
}
