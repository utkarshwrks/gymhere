"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { contactGroupMembers, contactGroups, invoices, members, messageTemplates } from "@/lib/db/schema";
import { getRetention } from "@/lib/queries/retention";
import { renderTemplate, sendVia } from "@/lib/messaging";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const templateSchema = z.object({
  name: z.string().min(1).max(60),
  channel: z.enum(["email", "sms", "whatsapp"]).default("email"),
  subject: z.string().max(120).optional(),
  body: z.string().min(1).max(2000),
});

export async function createTemplate(input: z.input<typeof templateSchema>): Promise<Result> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid template" };
  const ctx = await requireGym();
  await db.insert(messageTemplates).values({ gymId: ctx.gym.id, name: parsed.data.name, channel: parsed.data.channel, subject: parsed.data.subject || null, body: parsed.data.body });
  revalidatePath("/app/messages");
  return { ok: true };
}

export async function createContactGroup(name: string): Promise<Result> {
  const ctx = await requireGym();
  if (!name.trim()) return { ok: false, error: "Name required" };
  await db.insert(contactGroups).values({ gymId: ctx.gym.id, name: name.trim() });
  revalidatePath("/app/messages");
  return { ok: true };
}

const broadcastSchema = z.object({
  segment: z.enum(["active", "inactive", "irregular", "pending_dues", "all", "group"]),
  groupId: z.string().uuid().optional().or(z.literal("")),
  channel: z.enum(["email", "sms", "whatsapp"]).default("email"),
  subject: z.string().max(120).optional(),
  body: z.string().min(1).max(2000),
});

/** Resolve a segment to member recipients, then send + log each to the outbox. */
export async function sendBroadcast(input: z.input<typeof broadcastSchema>): Promise<Result<{ sent: number }>> {
  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid broadcast" };
  const d = parsed.data;
  const ctx = await requireGym();

  let recipients: { id: string; name: string; email: string | null; phone: string }[] = [];
  const all = await db.select().from(members).where(eq(members.gymId, ctx.gym.id));

  if (d.segment === "all") {
    recipients = all.map((m) => ({ id: m.id, name: m.fullName, email: m.email, phone: m.phone }));
  } else if (d.segment === "active" || d.segment === "inactive") {
    recipients = all.filter((m) => m.status === d.segment).map((m) => ({ id: m.id, name: m.fullName, email: m.email, phone: m.phone }));
  } else if (d.segment === "irregular") {
    const ret = await getRetention(ctx.gym.id, 7);
    const ids = new Set(ret.filter((r) => r.irregular).map((r) => r.memberId));
    recipients = all.filter((m) => ids.has(m.id)).map((m) => ({ id: m.id, name: m.fullName, email: m.email, phone: m.phone }));
  } else if (d.segment === "pending_dues") {
    const dueInvoices = await db.select({ memberId: invoices.memberId }).from(invoices).where(eq(invoices.gymId, ctx.gym.id));
    const ids = new Set(dueInvoices.filter((i) => i.memberId).map((i) => i.memberId as string));
    recipients = all.filter((m) => ids.has(m.id)).map((m) => ({ id: m.id, name: m.fullName, email: m.email, phone: m.phone }));
  } else if (d.segment === "group" && d.groupId) {
    const links = await db.select().from(contactGroupMembers).where(and(eq(contactGroupMembers.gymId, ctx.gym.id), eq(contactGroupMembers.groupId, d.groupId)));
    const ids = links.map((l) => l.memberId);
    const rows = ids.length ? await db.select().from(members).where(inArray(members.id, ids)) : [];
    recipients = rows.map((m) => ({ id: m.id, name: m.fullName, email: m.email, phone: m.phone }));
  }

  let sent = 0;
  for (const r of recipients) {
    const to = d.channel === "email" ? r.email : r.phone;
    if (!to) continue;
    const body = renderTemplate(d.body, { name: r.name });
    await sendVia(d.channel, { gymId: ctx.gym.id, to, memberId: r.id, subject: d.subject, body });
    sent++;
  }

  revalidatePath("/app/messages");
  return { ok: true, data: { sent } };
}
