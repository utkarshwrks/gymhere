"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import {
  enquiries,
  enquiryFollowups,
  enquiryStages,
  memberSubscriptions,
  members,
  membershipPlans,
} from "@/lib/db/schema";
import { ensureDefaultStages } from "@/lib/queries/enquiries";
import { atMemberCap } from "@/lib/features";
import { memberCount } from "@/lib/queries/members";
import { computeEndDate } from "@/lib/membership";
import { randomToken } from "@/lib/slug";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const createSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  interest: z.string().max(120).optional(),
  source: z.enum(["walk_in", "phone", "website", "referral", "social", "other"]).default("walk_in"),
});

export async function createEnquiry(input: z.input<typeof createSchema>): Promise<Result> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;
  const ctx = await requireGym();
  const stages = await ensureDefaultStages(ctx.gym.id);
  const first = stages[0];

  await db.insert(enquiries).values({
    gymId: ctx.gym.id,
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    interest: data.interest || null,
    source: data.source,
    stageId: first.id,
    sortOrder: Date.now() % 1_000_000,
  });

  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "enquiry.created", entity: "enquiry", summary: `${data.name} enquired` });
  revalidatePath("/app/enquiries");
  return { ok: true };
}

const moveSchema = z.object({
  enquiryId: z.string().uuid(),
  stageId: z.string().uuid(),
  sortOrder: z.number().int().optional(),
});

export async function moveEnquiry(input: z.input<typeof moveSchema>): Promise<Result> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { enquiryId, stageId, sortOrder } = parsed.data;
  const ctx = await requireGym();

  const stage = await db.query.enquiryStages.findFirst({
    where: and(eq(enquiryStages.gymId, ctx.gym.id), eq(enquiryStages.id, stageId)),
  });
  if (!stage) return { ok: false, error: "Stage not found" };

  await db
    .update(enquiries)
    .set({ stageId, sortOrder: sortOrder ?? 0, updatedAt: new Date() })
    .where(and(eq(enquiries.gymId, ctx.gym.id), eq(enquiries.id, enquiryId)));

  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "enquiry.stage_changed", entity: "enquiry", entityId: enquiryId, summary: `Moved to ${stage.name}` });
  revalidatePath("/app/enquiries");
  return { ok: true };
}

const followupSchema = z.object({
  enquiryId: z.string().uuid(),
  dueAt: z.string(),
  note: z.string().max(240).optional(),
});

export async function scheduleFollowup(input: z.input<typeof followupSchema>): Promise<Result> {
  const parsed = followupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { enquiryId, dueAt, note } = parsed.data;
  const ctx = await requireGym();

  await db.insert(enquiryFollowups).values({
    gymId: ctx.gym.id,
    enquiryId,
    dueAt: new Date(dueAt),
    note: note || null,
    createdByUserId: ctx.user.id,
  });
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "enquiry.followup_scheduled", entity: "enquiry", entityId: enquiryId });
  revalidatePath("/app/enquiries");
  return { ok: true };
}

export async function completeFollowup(followupId: string): Promise<Result> {
  const ctx = await requireGym();
  await db
    .update(enquiryFollowups)
    .set({ done: true })
    .where(and(eq(enquiryFollowups.gymId, ctx.gym.id), eq(enquiryFollowups.id, followupId)));
  revalidatePath("/app/enquiries");
  return { ok: true };
}

const convertSchema = z.object({
  enquiryId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string(),
});

export async function convertEnquiry(input: z.input<typeof convertSchema>): Promise<Result<{ memberId: string }>> {
  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { enquiryId, planId, startDate } = parsed.data;
  const ctx = await requireGym();

  const enquiry = await db.query.enquiries.findFirst({
    where: and(eq(enquiries.gymId, ctx.gym.id), eq(enquiries.id, enquiryId)),
  });
  if (!enquiry) return { ok: false, error: "Enquiry not found" };
  if (enquiry.convertedMemberId) return { ok: false, error: "This lead is already converted" };

  const count = await memberCount(ctx.gym.id);
  if (atMemberCap(ctx.plan, count)) return { ok: false, error: `Member cap reached (${ctx.plan?.memberCap}). Upgrade to convert.` };

  const plan = await db.query.membershipPlans.findFirst({
    where: and(eq(membershipPlans.gymId, ctx.gym.id), eq(membershipPlans.id, planId)),
  });
  if (!plan) return { ok: false, error: "Plan not found" };

  const [member] = await db
    .insert(members)
    .values({
      gymId: ctx.gym.id,
      fullName: enquiry.name,
      phone: enquiry.phone,
      email: enquiry.email,
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
    endDate: format(computeEndDate(startDate, plan.durationMonths), "yyyy-MM-dd"),
    pricePaise: plan.pricePaise,
    status: "active",
  });

  // Move enquiry to the "won" terminal stage and link the member.
  const stages = await db
    .select()
    .from(enquiryStages)
    .where(eq(enquiryStages.gymId, ctx.gym.id))
    .orderBy(asc(enquiryStages.sortOrder));
  const won = stages.find((s) => s.isWon) ?? stages.find((s) => s.isTerminal);

  await db
    .update(enquiries)
    .set({ convertedMemberId: member.id, stageId: won?.id ?? enquiry.stageId, updatedAt: new Date() })
    .where(eq(enquiries.id, enquiry.id));

  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "enquiry.converted", entity: "member", entityId: member.id, summary: `${enquiry.name} converted to member` });
  revalidatePath("/app/enquiries");
  revalidatePath("/app/members");
  return { ok: true, data: { memberId: member.id } };
}

const importSchema = z.object({
  rows: z.array(z.object({ name: z.string(), phone: z.string(), email: z.string().optional(), interest: z.string().optional() })).max(2000),
  source: z.enum(["walk_in", "phone", "website", "referral", "social", "other"]).default("other"),
});

export async function importLeads(input: z.input<typeof importSchema>): Promise<{ ok: boolean; created: number; error?: string }> {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, created: 0, error: "Invalid payload" };
  const ctx = await requireGym();
  const stages = await ensureDefaultStages(ctx.gym.id);
  const first = stages[0];

  let created = 0;
  const rows = parsed.data.rows.filter((r) => r.name?.trim() && r.phone?.trim());
  for (const r of rows) {
    await db.insert(enquiries).values({
      gymId: ctx.gym.id,
      name: r.name.trim(),
      phone: r.phone.trim(),
      email: r.email?.trim() || null,
      interest: r.interest?.trim() || null,
      source: parsed.data.source,
      stageId: first.id,
      sortOrder: created,
    });
    created++;
  }
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "enquiry.created", entity: "enquiry", summary: `Imported ${created} leads` });
  revalidatePath("/app/enquiries");
  return { ok: true, created };
}

const renameStageSchema = z.object({ stageId: z.string().uuid(), name: z.string().min(1).max(40) });

export async function renameStage(input: z.input<typeof renameStageSchema>): Promise<Result> {
  const parsed = renameStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await requireGym();
  await db
    .update(enquiryStages)
    .set({ name: parsed.data.name })
    .where(and(eq(enquiryStages.gymId, ctx.gym.id), eq(enquiryStages.id, parsed.data.stageId)));
  revalidatePath("/app/enquiries");
  revalidatePath("/app/settings");
  return { ok: true };
}
