"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import { memberSubscriptions, members, membershipPlans } from "@/lib/db/schema";
import { atMemberCap } from "@/lib/features";
import { memberCount } from "@/lib/queries/members";
import { computeEndDate } from "@/lib/membership";
import { randomToken } from "@/lib/slug";

const rowSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
});

const importSchema = z.object({
  planId: z.string().uuid(),
  startDate: z.string(),
  rows: z.array(z.object({ fullName: z.string(), phone: z.string(), email: z.string().optional() })).max(2000),
});

export interface ImportResult {
  ok: boolean;
  created: number;
  skipped: number;
  errors: string[];
  error?: string;
}

/** Bulk member CSV import with per-row validation and tier-cap stop. */
export async function importMembers(input: z.input<typeof importSchema>): Promise<ImportResult> {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, created: 0, skipped: 0, errors: [], error: "Invalid import payload" };
  const { planId, startDate, rows } = parsed.data;
  const ctx = await requireGym();

  const plan = await db.query.membershipPlans.findFirst({
    where: and(eq(membershipPlans.gymId, ctx.gym.id), eq(membershipPlans.id, planId)),
  });
  if (!plan) return { ok: false, created: 0, skipped: 0, errors: [], error: "Plan not found" };

  let count = await memberCount(ctx.gym.id);
  const endDate = format(computeEndDate(startDate, plan.durationMonths), "yyyy-MM-dd");
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rowSchema.safeParse(rows[i]);
    if (!r.success) {
      skipped++;
      if (errors.length < 10) errors.push(`Row ${i + 2}: ${r.error.issues[0]?.message}`);
      continue;
    }
    if (atMemberCap(ctx.plan, count)) {
      errors.push(`Stopped at plan member cap (${ctx.plan?.memberCap}). Remaining rows skipped.`);
      skipped += rows.length - i;
      break;
    }
    const [member] = await db
      .insert(members)
      .values({
        gymId: ctx.gym.id,
        fullName: r.data.fullName,
        phone: r.data.phone,
        email: r.data.email || null,
        status: "active",
        qrToken: randomToken("ghm"),
        joinDate: startDate,
      })
      .returning();
    await db.insert(memberSubscriptions).values({
      gymId: ctx.gym.id,
      memberId: member.id,
      planId: plan.id,
      planName: plan.name,
      startDate,
      endDate,
      pricePaise: plan.pricePaise,
      status: "active",
    });
    created++;
    count++;
  }

  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.created",
    entity: "member",
    summary: `Imported ${created} members via CSV`,
  });

  revalidatePath("/app/members");
  revalidatePath("/app");
  return { ok: true, created, skipped, errors };
}
