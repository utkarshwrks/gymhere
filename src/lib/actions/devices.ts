"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { recordPunch } from "@/lib/attendance-core";
import { attendance, attendanceDevices, gymSettings, invoices, memberSubscriptions, members } from "@/lib/db/schema";
import { deriveStatus, statusLabel, statusToTone } from "@/lib/membership";
import { randomToken } from "@/lib/slug";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function ensureDeviceSecret(gymId: string): Promise<string> {
  const settings = await db.query.gymSettings.findFirst({ where: eq(gymSettings.gymId, gymId) });
  if (settings?.deviceSecret) return settings.deviceSecret;
  const secret = randomToken("dev");
  await db.update(gymSettings).set({ deviceSecret: secret }).where(eq(gymSettings.gymId, gymId));
  return secret;
}

export async function addDevice(name: string): Promise<Result> {
  const ctx = await requireGym();
  if (!name.trim()) return { ok: false, error: "Name required" };
  await ensureDeviceSecret(ctx.gym.id);
  await db.insert(attendanceDevices).values({ gymId: ctx.gym.id, name: name.trim(), serial: randomToken("ESSL").toUpperCase() });
  revalidatePath("/app/attendance/simulator");
  return { ok: true };
}

/** Demo: fire a biometric punch for a member (in→out toggle). */
export async function simulatePunch(memberId: string): Promise<Result<{ direction: string }>> {
  const ctx = await requireGym();
  const res = await recordPunch(ctx.gym.id, memberId, "biometric");
  revalidatePath("/app/attendance/live");
  revalidatePath("/app/attendance/simulator");
  return { ok: true, data: { direction: res.direction } };
}

export interface LiveRow {
  memberId: string;
  name: string;
  checkInAt: string;
  tone: "success" | "warning" | "danger" | "info" | "muted";
  label: string;
  hasDues: boolean;
}

/** Members currently on the floor (open check-in today) with status colour. */
export async function getLiveBoard(): Promise<LiveRow[]> {
  const ctx = await requireGym();
  const open = await db
    .select({ memberId: attendance.memberId, checkInAt: attendance.checkInAt })
    .from(attendance)
    .where(and(eq(attendance.gymId, ctx.gym.id), isNull(attendance.checkOutAt), gte(attendance.checkInAt, startOfDay(new Date()))))
    .orderBy(desc(attendance.checkInAt));

  const ids = [...new Set(open.map((o) => o.memberId).filter(Boolean))] as string[];
  if (ids.length === 0) return [];

  const [memberRows, subs, dueInvoices] = await Promise.all([
    db.select().from(members).where(eq(members.gymId, ctx.gym.id)),
    db.select().from(memberSubscriptions).where(eq(memberSubscriptions.gymId, ctx.gym.id)),
    db.select({ memberId: invoices.memberId, duePaise: invoices.duePaise }).from(invoices).where(eq(invoices.gymId, ctx.gym.id)),
  ]);
  const memberById = new Map(memberRows.map((m) => [m.id, m]));
  const latestSub = new Map<string, (typeof subs)[number]>();
  for (const s of subs) {
    const cur = latestSub.get(s.memberId);
    if (!cur || new Date(s.endDate) > new Date(cur.endDate)) latestSub.set(s.memberId, s);
  }
  const dues = new Set(dueInvoices.filter((i) => i.duePaise > 0 && i.memberId).map((i) => i.memberId as string));

  const seen = new Set<string>();
  const rows: LiveRow[] = [];
  for (const o of open) {
    if (!o.memberId || seen.has(o.memberId)) continue;
    seen.add(o.memberId);
    const m = memberById.get(o.memberId);
    if (!m) continue;
    const sub = latestSub.get(m.id);
    const st = sub ? deriveStatus({ endDate: sub.endDate, status: sub.status }) : "none";
    rows.push({
      memberId: m.id,
      name: m.fullName,
      checkInAt: o.checkInAt.toISOString(),
      tone: st === "none" ? "muted" : statusToTone[st],
      label: statusLabel[st] ?? "—",
      hasDues: dues.has(m.id),
    });
  }
  return rows;
}
