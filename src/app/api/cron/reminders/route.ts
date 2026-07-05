import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { gyms, invoices, memberSubscriptions, members, notifications } from "@/lib/db/schema";
import { sendEmail } from "@/lib/messaging";
import { env, isConfigured } from "@/lib/env";
import { daysLeft } from "@/lib/membership";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminders (Vercel Cron): membership renewals at T-7 / T-1, pending dues,
 * and birthday greetings. Each becomes an outbox entry + email + notification.
 */
export async function GET(req: Request) {
  if (env.CRON_SECRET) {
    if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!isConfigured.db) return NextResponse.json({ ok: true, skipped: "db not configured" });

  const allGyms = await db.select().from(gyms);
  let queued = 0;

  for (const gym of allGyms) {
    const [subs, memberRows, dueInvoices] = await Promise.all([
      db.select().from(memberSubscriptions).where(and(eq(memberSubscriptions.gymId, gym.id), eq(memberSubscriptions.status, "active"))),
      db.select().from(members).where(eq(members.gymId, gym.id)),
      db.select().from(invoices).where(and(eq(invoices.gymId, gym.id), gt(invoices.duePaise, 0))),
    ]);
    const memberById = new Map(memberRows.map((m) => [m.id, m]));

    // Renewals at T-7 / T-1.
    for (const sub of subs) {
      const dl = daysLeft(sub.endDate);
      if (dl === 7 || dl === 1) {
        const m = memberById.get(sub.memberId);
        if (!m) continue;
        await queueReminder(gym.id, m.id, m.email, m.fullName, "renewal", `Membership renewal in ${dl} day${dl === 1 ? "" : "s"}`, `Hi ${m.fullName}, your ${sub.planName} membership at ${gym.name} expires in ${dl} day(s). Renew to keep training!`);
        queued++;
      }
    }

    // Dues.
    for (const inv of dueInvoices) {
      if (!inv.memberId) continue;
      const m = memberById.get(inv.memberId);
      if (!m) continue;
      await queueReminder(gym.id, m.id, m.email, m.fullName, "dues", `Payment due — ${inv.number}`, `Hi ${m.fullName}, ₹${(inv.duePaise / 100).toLocaleString("en-IN")} is pending on ${inv.number} at ${gym.name}.`);
      queued++;
    }

    // Birthdays today.
    const today = new Date();
    for (const m of memberRows) {
      if (!m.dob) continue;
      const dob = new Date(m.dob);
      if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
        await queueReminder(gym.id, m.id, m.email, m.fullName, "birthday", "Happy birthday!", `Happy birthday, ${m.fullName}! Wishing you a strong year from all of us at ${gym.name}.`);
        queued++;
      }
    }
  }

  return NextResponse.json({ ok: true, gyms: allGyms.length, queued });
}

async function queueReminder(gymId: string, memberId: string, email: string | null, name: string, type: string, title: string, body: string) {
  await db.insert(notifications).values({ gymId, memberId, type, title, body });
  if (email) {
    await sendEmail({ gymId, to: email, memberId, subject: title, body });
  }
}
