"use server";

import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  gymSettings,
  gymSubscriptions,
  gyms,
  platformPlans,
  users,
} from "@/lib/db/schema";
import { slugify, randomToken } from "@/lib/slug";

const onboardingSchema = z.object({
  gymName: z.string().min(2, "Gym name is too short").max(80),
  logoUrl: z.string().url().optional().or(z.literal("")),
  city: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
  gstEnabled: z.boolean().default(false),
  gstNumber: z.string().max(20).optional(),
  planKey: z.enum(["starter", "growth", "pro"]),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingResult = { ok: false; error: string };

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "gym";
  const existing = await db.query.gyms.findFirst({ where: eq(gyms.slug, slug) });
  if (existing) slug = `${slug}-${randomToken("", 3)}`;
  return slug;
}

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  if (user.gymId) redirect("/app");

  const plan = await db.query.platformPlans.findFirst({
    where: and(eq(platformPlans.key, data.planKey), eq(platformPlans.isActive, true)),
  });
  if (!plan) return { ok: false, error: "Selected plan is unavailable." };

  const slug = await uniqueSlug(data.gymName);

  const [gym] = await db
    .insert(gyms)
    .values({
      slug,
      name: data.gymName,
      logoUrl: data.logoUrl || null,
      ownerUserId: user.id,
      status: "active",
    })
    .returning();

  await db.insert(gymSettings).values({
    gymId: gym.id,
    currency: data.currency,
    timezone: data.timezone,
    gstEnabled: data.gstEnabled,
    gstNumber: data.gstEnabled ? (data.gstNumber ?? null) : null,
    city: data.city ?? null,
    phone: data.phone ?? null,
    email: user.email,
  });

  await db.insert(gymSubscriptions).values({
    gymId: gym.id,
    planId: plan.id,
    status: "trialing",
    trialEndsAt: addDays(new Date(), 14),
  });

  await db
    .update(users)
    .set({ gymId: gym.id, role: "gym_owner", updatedAt: new Date() })
    .where(eq(users.id, user.id));

  redirect("/app");
}
