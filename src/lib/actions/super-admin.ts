"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, IMPERSONATE_COOKIE } from "@/lib/auth";
import { announcements, gyms, platformPlans } from "@/lib/db/schema";

type Result = { ok: true } | { ok: false; error: string };

async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") return null;
  return user;
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
