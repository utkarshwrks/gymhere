"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { salaryStructures, staffProfiles, trainers, users } from "@/lib/db/schema";
import { randomToken } from "@/lib/slug";
import { toPaise } from "@/lib/format";

type Result = { ok: true } | { ok: false; error: string };

export const STAFF_PERMISSIONS = ["attendance", "members", "billing", "classes"] as const;

const staffSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  designation: z.string().max(60).optional(),
  role: z.enum(["staff", "trainer"]).default("staff"),
});

/** Adds a staff/trainer user for the gym. They claim the login when they sign up
 * with this email (JIT). */
export async function addStaff(input: z.input<typeof staffSchema>): Promise<Result> {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid staff" };
  const d = parsed.data;
  const ctx = await requireGym();

  const existing = await db.query.users.findFirst({ where: eq(users.email, d.email) });
  const [user] = existing
    ? [existing]
    : await db.insert(users).values({ clerkId: randomToken("staff"), email: d.email, name: d.name, role: d.role, gymId: ctx.gym.id }).returning();

  if (!existing) {
    await db.update(users).set({ gymId: ctx.gym.id, role: d.role }).where(eq(users.id, user.id));
  }

  await db.insert(staffProfiles).values({
    gymId: ctx.gym.id,
    userId: user.id,
    designation: d.designation || null,
    phone: d.phone || null,
    permissions: Object.fromEntries(STAFF_PERMISSIONS.map((p) => [p, d.role === "staff"])),
  });

  if (d.role === "trainer") {
    await db.insert(trainers).values({ gymId: ctx.gym.id, userId: user.id, name: d.name });
  }

  revalidatePath("/app/staff");
  return { ok: true };
}

export async function updateStaffPermissions(profileId: string, permissions: Record<string, boolean>): Promise<Result> {
  const ctx = await requireGym();
  await db.update(staffProfiles).set({ permissions }).where(and(eq(staffProfiles.gymId, ctx.gym.id), eq(staffProfiles.id, profileId)));
  revalidatePath("/app/staff");
  return { ok: true };
}

const trainerSchema = z.object({ name: z.string().min(2).max(80), specialization: z.string().max(80).optional(), bio: z.string().max(240).optional() });

export async function addTrainer(input: z.input<typeof trainerSchema>): Promise<Result> {
  const parsed = trainerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid trainer" };
  const ctx = await requireGym();
  await db.insert(trainers).values({ gymId: ctx.gym.id, name: parsed.data.name, specialization: parsed.data.specialization || null, bio: parsed.data.bio || null });
  revalidatePath("/app/staff");
  revalidatePath("/app/classes");
  return { ok: true };
}

const structureSchema = z.object({
  staffUserId: z.string().uuid(),
  monthlyBaseRupees: z.coerce.number().min(0),
  standardDays: z.coerce.number().int().min(1).max(31).default(26),
  ptIncentivePerSessionRupees: z.coerce.number().min(0).default(0),
});

export async function setSalaryStructure(input: z.input<typeof structureSchema>): Promise<Result> {
  const parsed = structureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid structure" };
  const d = parsed.data;
  const ctx = await requireGym();

  const existing = await db.query.salaryStructures.findFirst({ where: and(eq(salaryStructures.gymId, ctx.gym.id), eq(salaryStructures.staffUserId, d.staffUserId)) });
  const values = { monthlyBasePaise: toPaise(d.monthlyBaseRupees), standardDays: d.standardDays, ptIncentivePerSessionPaise: toPaise(d.ptIncentivePerSessionRupees) };
  if (existing) {
    await db.update(salaryStructures).set(values).where(eq(salaryStructures.id, existing.id));
  } else {
    await db.insert(salaryStructures).values({ gymId: ctx.gym.id, staffUserId: d.staffUserId, ...values });
  }
  revalidatePath("/app/payroll");
  return { ok: true };
}
