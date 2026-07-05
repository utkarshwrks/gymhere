"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import {
  attendance,
  memberSubscriptions,
  memberWeightLogs,
  members,
  membershipPlans,
} from "@/lib/db/schema";
import { atMemberCap } from "@/lib/features";
import { memberCount } from "@/lib/queries/members";
import { computeBmi, computeEndDate } from "@/lib/membership";
import { randomToken } from "@/lib/slug";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const addMemberSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().optional(),
  address: z.string().max(240).optional(),
  idProofNo: z.string().max(40).optional(),
  emergencyContactName: z.string().max(80).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  heightCm: z.coerce.number().min(50).max(260).optional(),
  weightKg: z.coerce.number().min(10).max(400).optional(),
  batchId: z.string().uuid().optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
  planId: z.string().uuid(),
  startDate: z.string(),
});

export type AddMemberInput = z.input<typeof addMemberSchema>;

export async function addMember(input: AddMemberInput): Promise<Result<{ memberId: string }>> {
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const ctx = await requireGym();

  // Tier cap enforcement.
  const count = await memberCount(ctx.gym.id);
  if (atMemberCap(ctx.plan, count)) {
    return {
      ok: false,
      error: `You've reached your plan's member limit (${ctx.plan?.memberCap}). Upgrade to add more.`,
    };
  }

  const plan = await db.query.membershipPlans.findFirst({
    where: and(eq(membershipPlans.gymId, ctx.gym.id), eq(membershipPlans.id, data.planId)),
  });
  if (!plan) return { ok: false, error: "Selected plan not found." };

  const endDate = computeEndDate(data.startDate, plan.durationMonths);

  const [member] = await db
    .insert(members)
    .values({
      gymId: ctx.gym.id,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || null,
      gender: data.gender,
      dob: data.dob || null,
      address: data.address || null,
      idProofNo: data.idProofNo || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      heightCm: data.heightCm ? String(data.heightCm) : null,
      weightKg: data.weightKg ? String(data.weightKg) : null,
      batchId: data.batchId || null,
      photoUrl: data.photoUrl || null,
      status: "active",
      qrToken: randomToken("ghm"),
      joinDate: data.startDate,
    })
    .returning();

  await db.insert(memberSubscriptions).values({
    gymId: ctx.gym.id,
    memberId: member.id,
    planId: plan.id,
    planName: plan.name,
    startDate: data.startDate,
    endDate: format(endDate, "yyyy-MM-dd"),
    pricePaise: plan.pricePaise,
    status: "active",
  });

  if (data.heightCm && data.weightKg) {
    await db.insert(memberWeightLogs).values({
      gymId: ctx.gym.id,
      memberId: member.id,
      weightKg: String(data.weightKg),
      heightCm: String(data.heightCm),
      bmi: computeBmi(data.heightCm, data.weightKg)?.toString() ?? null,
    });
  }

  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.created",
    entity: "member",
    entityId: member.id,
    summary: `${member.fullName} joined on the ${plan.name} plan`,
  });

  revalidatePath("/app/members");
  revalidatePath("/app");
  return { ok: true, data: { memberId: member.id } };
}

const renewSchema = z.object({
  memberId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string(),
});

export async function renewMember(input: z.input<typeof renewSchema>): Promise<Result> {
  const parsed = renewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { memberId, planId, startDate } = parsed.data;
  const ctx = await requireGym();

  const plan = await db.query.membershipPlans.findFirst({
    where: and(eq(membershipPlans.gymId, ctx.gym.id), eq(membershipPlans.id, planId)),
  });
  if (!plan) return { ok: false, error: "Plan not found." };

  const endDate = computeEndDate(startDate, plan.durationMonths);

  await db.insert(memberSubscriptions).values({
    gymId: ctx.gym.id,
    memberId,
    planId: plan.id,
    planName: plan.name,
    startDate,
    endDate: format(endDate, "yyyy-MM-dd"),
    pricePaise: plan.pricePaise,
    status: "active",
  });

  await db
    .update(members)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(members.gymId, ctx.gym.id), eq(members.id, memberId)));

  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.renewed",
    entity: "member",
    entityId: memberId,
    summary: `Renewed on the ${plan.name} plan`,
  });

  revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app/members");
  return { ok: true };
}

const freezeSchema = z.object({
  memberId: z.string().uuid(),
  freezeStart: z.string(),
  freezeEnd: z.string(),
});

export async function freezeMember(input: z.input<typeof freezeSchema>): Promise<Result> {
  const parsed = freezeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { memberId, freezeStart, freezeEnd } = parsed.data;
  const ctx = await requireGym();

  const current = await currentSubscription(ctx.gym.id, memberId);
  if (!current) return { ok: false, error: "No active membership to freeze." };

  await db
    .update(memberSubscriptions)
    .set({ status: "frozen", freezeStart, freezeEnd })
    .where(eq(memberSubscriptions.id, current.id));
  await db
    .update(members)
    .set({ status: "frozen", updatedAt: new Date() })
    .where(and(eq(members.gymId, ctx.gym.id), eq(members.id, memberId)));

  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.frozen",
    entity: "member",
    entityId: memberId,
    summary: `Membership frozen ${freezeStart} → ${freezeEnd}`,
  });

  revalidatePath(`/app/members/${memberId}`);
  return { ok: true };
}

export async function unfreezeMember(memberId: string): Promise<Result> {
  const ctx = await requireGym();
  const current = await currentSubscription(ctx.gym.id, memberId);
  if (!current) return { ok: false, error: "No membership found." };

  await db
    .update(memberSubscriptions)
    .set({ status: "active", freezeStart: null, freezeEnd: null })
    .where(eq(memberSubscriptions.id, current.id));
  await db
    .update(members)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(members.gymId, ctx.gym.id), eq(members.id, memberId)));

  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.unfrozen",
    entity: "member",
    entityId: memberId,
  });

  revalidatePath(`/app/members/${memberId}`);
  return { ok: true };
}

const cancelSchema = z.object({ memberId: z.string().uuid(), reason: z.string().max(240).optional() });

export async function cancelMember(input: z.input<typeof cancelSchema>): Promise<Result> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { memberId, reason } = parsed.data;
  const ctx = await requireGym();

  const current = await currentSubscription(ctx.gym.id, memberId);
  if (current) {
    await db
      .update(memberSubscriptions)
      .set({ status: "cancelled", cancelReason: reason ?? null })
      .where(eq(memberSubscriptions.id, current.id));
  }
  await db
    .update(members)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(and(eq(members.gymId, ctx.gym.id), eq(members.id, memberId)));

  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.cancelled",
    entity: "member",
    entityId: memberId,
    summary: reason ? `Cancelled: ${reason}` : "Membership cancelled",
  });

  revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app/members");
  return { ok: true };
}

const weightSchema = z.object({
  memberId: z.string().uuid(),
  weightKg: z.coerce.number().min(10).max(400),
  heightCm: z.coerce.number().min(50).max(260).optional(),
});

export async function logWeight(input: z.input<typeof weightSchema>): Promise<Result> {
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { memberId, weightKg, heightCm } = parsed.data;
  const ctx = await requireGym();

  await db.insert(memberWeightLogs).values({
    gymId: ctx.gym.id,
    memberId,
    weightKg: String(weightKg),
    heightCm: heightCm ? String(heightCm) : null,
    bmi: heightCm ? computeBmi(heightCm, weightKg)?.toString() ?? null : null,
  });
  await db
    .update(members)
    .set({ weightKg: String(weightKg), updatedAt: new Date() })
    .where(and(eq(members.gymId, ctx.gym.id), eq(members.id, memberId)));

  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.weight_logged",
    entity: "member",
    entityId: memberId,
    summary: `Weight logged: ${weightKg} kg`,
  });

  revalidatePath(`/app/members/${memberId}`);
  return { ok: true };
}

export async function updateMemberNotes(memberId: string, notes: string): Promise<Result> {
  const ctx = await requireGym();
  await db
    .update(members)
    .set({ notes: notes.slice(0, 4000), updatedAt: new Date() })
    .where(and(eq(members.gymId, ctx.gym.id), eq(members.id, memberId)));
  revalidatePath(`/app/members/${memberId}`);
  return { ok: true };
}

/** One-tap manual check-in from the attendance screen or member profile. */
export async function checkInMember(memberId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.insert(attendance).values({
    gymId: ctx.gym.id,
    personType: "member",
    memberId,
    method: "manual",
  });
  await logActivity({
    gymId: ctx.gym.id,
    actorUserId: ctx.user.id,
    action: "member.checked_in",
    entity: "member",
    entityId: memberId,
  });
  revalidatePath("/app/attendance");
  revalidatePath("/app");
  return { ok: true };
}

async function currentSubscription(gymId: string, memberId: string) {
  const subs = await db
    .select()
    .from(memberSubscriptions)
    .where(and(eq(memberSubscriptions.gymId, gymId), eq(memberSubscriptions.memberId, memberId)));
  if (!subs.length) return null;
  return subs.reduce((a, b) => (new Date(a.endDate) > new Date(b.endDate) ? a : b));
}
