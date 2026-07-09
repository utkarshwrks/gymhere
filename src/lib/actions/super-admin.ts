"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { addMonths } from "date-fns";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, IMPERSONATE_COOKIE } from "@/lib/auth";
import {
  announcements,
  gymSettings,
  gymSubscriptions,
  gyms,
  platformPlans,
  users,
} from "@/lib/db/schema";
import { randomToken, slugify } from "@/lib/slug";

type Result = { ok: true } | { ok: false; error: string };

async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") return null;
  return user;
}

async function uniqueGymSlug(base: string): Promise<string> {
  const root = slugify(base) || "gym";
  let slug = root;
  while (await db.query.gyms.findFirst({ where: eq(gyms.slug, slug) })) {
    slug = `${root}-${randomToken("", 3)}`;
  }
  return slug;
}

export async function setGymStatus(gymId: string, status: "active" | "suspended"): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  await db.update(gyms).set({ status, updatedAt: new Date() }).where(eq(gyms.id, gymId));
  revalidatePath("/sa/tenants");
  revalidatePath(`/sa/tenants/${gymId}`);
  return { ok: true };
}

export async function startImpersonation(gymId: string): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  const store = await cookies();
  store.set(IMPERSONATE_COOKIE, gymId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/app");
}

export async function stopImpersonation(): Promise<Result> {
  const store = await cookies();
  store.delete(IMPERSONATE_COOKIE);
  redirect("/sa");
}

const planSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(2).max(30),
  name: z.string().min(1).max(40),
  priceRupees: z.coerce.number().min(0),
  memberCap: z.coerce.number().int().min(0).optional(),
  unlimited: z.boolean().default(false),
  description: z.string().max(160).optional(),
  features: z.record(z.string(), z.boolean()).default({}),
});

export async function savePlatformPlan(input: z.input<typeof planSchema>): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan" };
  const d = parsed.data;
  const values = {
    key: d.key,
    name: d.name,
    pricePaise: Math.round(d.priceRupees * 100),
    memberCap: d.unlimited ? null : (d.memberCap ?? 0),
    description: d.description ?? null,
    features: d.features,
  };
  if (d.id) {
    await db.update(platformPlans).set(values).where(eq(platformPlans.id, d.id));
  } else {
    await db.insert(platformPlans).values(values);
  }
  revalidatePath("/sa/plans");
  return { ok: true };
}

export async function createAnnouncement(title: string, body: string): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  if (!title.trim()) return { ok: false, error: "Title required" };
  await db.insert(announcements).values({ title: title.trim(), body: body || null });
  revalidatePath("/sa/announcements");
  return { ok: true };
}

export async function toggleAnnouncement(id: string, isActive: boolean): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  await db.update(announcements).set({ isActive }).where(eq(announcements.id, id));
  revalidatePath("/sa/announcements");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tenant provisioning (super-admin-only signup model)
// ---------------------------------------------------------------------------

const createGymSchema = z.object({
  gymName: z.string().trim().min(2, "Gym name is too short").max(80),
  ownerName: z.string().trim().max(80).optional(),
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid owner email"),
  planKey: z.string().min(1, "Pick a plan"),
  city: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
});

/**
 * Create a gym and its owner in one step. The owner is a placeholder row claimed
 * on first sign-in (see provisionUser). The gym goes live immediately on the
 * chosen platform plan — no trial, no payment. The owner then configures
 * everything (membership plans, members, settings) from /app.
 */
export async function createGymWithOwner(input: z.input<typeof createGymSchema>): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  const parsed = createGymSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const plan = await db.query.platformPlans.findFirst({
    where: and(eq(platformPlans.key, d.planKey), eq(platformPlans.isActive, true)),
  });
  if (!plan) return { ok: false, error: "Selected plan is unavailable." };

  // Resolve the owner: reuse an existing unassigned user, or create a placeholder.
  const existing = await db.query.users.findFirst({ where: eq(users.email, d.ownerEmail) });
  if (existing) {
    if (existing.role === "super_admin") return { ok: false, error: "That email belongs to a super admin." };
    if (existing.gymId) return { ok: false, error: "That owner is already linked to a gym." };
  }

  const slug = await uniqueGymSlug(d.gymName);

  let ownerId: string;
  if (existing) {
    ownerId = existing.id;
  } else {
    const [owner] = await db
      .insert(users)
      .values({
        clerkId: `invite_${randomToken("", 12)}`,
        email: d.ownerEmail,
        name: d.ownerName || null,
        role: "gym_owner",
      })
      .returning();
    ownerId = owner.id;
  }

  const [gym] = await db
    .insert(gyms)
    .values({ slug, name: d.gymName, ownerUserId: ownerId, status: "active" })
    .returning();

  await db.insert(gymSettings).values({
    gymId: gym.id,
    currency: "INR",
    timezone: "Asia/Kolkata",
    city: d.city || null,
    phone: d.phone || null,
    email: d.ownerEmail,
  });

  await db.insert(gymSubscriptions).values({
    gymId: gym.id,
    planId: plan.id,
    status: "active",
    currentPeriodEnd: addMonths(new Date(), 1),
  });

  await db
    .update(users)
    .set({ gymId: gym.id, role: "gym_owner", name: existing?.name ?? d.ownerName ?? null, updatedAt: new Date() })
    .where(eq(users.id, ownerId));

  revalidatePath("/sa/tenants");
  revalidatePath("/sa");
  return { ok: true };
}

/** Permanently delete a gym and everything under it (all gym data cascades). */
export async function deleteGym(gymId: string): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  const gym = await db.query.gyms.findFirst({ where: eq(gyms.id, gymId) });
  if (!gym) return { ok: false, error: "Gym not found." };

  // Capture the gym's users (owner/staff/trainer/member rows) before the FK
  // cascade nulls their gymId, so we can remove them too.
  const gymUsers = await db.select({ id: users.id }).from(users).where(eq(users.gymId, gymId));
  await db.delete(gyms).where(eq(gyms.id, gymId)); // cascades all gym-scoped rows
  if (gymUsers.length) {
    await db.delete(users).where(inArray(users.id, gymUsers.map((u) => u.id)));
  }

  // Drop any lingering impersonation of the now-deleted gym.
  const store = await cookies();
  if (store.get(IMPERSONATE_COOKIE)?.value === gymId) store.delete(IMPERSONATE_COOKIE);

  revalidatePath("/sa/tenants");
  revalidatePath("/sa");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Super admins
// ---------------------------------------------------------------------------

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

/** Grant super admin by email: promote an existing user, or invite a placeholder. */
export async function addSuperAdmin(email: string): Promise<Result> {
  if (!(await requireSuperAdmin())) return { ok: false, error: "Not authorized" };
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  const addr = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, addr) });
  if (existing) {
    if (existing.role === "super_admin") return { ok: false, error: "That user is already a super admin." };
    await db
      .update(users)
      .set({ role: "super_admin", gymId: null, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      clerkId: `invite_${randomToken("", 12)}`,
      email: addr,
      role: "super_admin",
    });
  }

  revalidatePath("/sa/admins");
  return { ok: true };
}

/** Revoke super admin. Guards against removing yourself or the last one. */
export async function removeSuperAdmin(userId: string): Promise<Result> {
  const me = await requireSuperAdmin();
  if (!me) return { ok: false, error: "Not authorized" };
  if (userId === me.id) return { ok: false, error: "You can't remove your own super admin access." };

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "super_admin"));
  if (total <= 1) return { ok: false, error: "At least one super admin must remain." };

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target || target.role !== "super_admin") return { ok: false, error: "Not a super admin." };

  await db
    .update(users)
    .set({ role: "gym_owner", updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/sa/admins");
  return { ok: true };
}
