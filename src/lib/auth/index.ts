import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  gymSubscriptions,
  gyms,
  platformPlans,
  users,
  type roleEnum,
} from "@/lib/db/schema";
import { isConfigured } from "@/lib/env";

export type Role = (typeof roleEnum.enumValues)[number];

export const GYM_ROLES: Role[] = ["gym_owner", "staff", "trainer"];

export type SessionUser = typeof users.$inferSelect;

/** Clerk user id, or null when unauthenticated / Clerk not configured. */
export async function getClerkUserId(): Promise<string | null> {
  if (!isConfigured.clerk) return null;
  const { userId } = await auth();
  return userId ?? null;
}

/** The synced users row for the current session, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const clerkId = await getClerkUserId();
  if (!clerkId) return null;
  const row = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  return row ?? null;
}

export interface GymContext {
  user: SessionUser;
  gym: typeof gyms.$inferSelect;
  subscription: typeof gymSubscriptions.$inferSelect | null;
  plan: typeof platformPlans.$inferSelect | null;
}

/** Full gym context for /app: the user's gym, its active subscription and plan. */
export async function getGymContext(): Promise<GymContext | null> {
  const user = await getSessionUser();
  if (!user || !user.gymId) return null;

  const gym = await db.query.gyms.findFirst({ where: eq(gyms.id, user.gymId) });
  if (!gym) return null;

  const subscription = await db.query.gymSubscriptions.findFirst({
    where: and(
      eq(gymSubscriptions.gymId, gym.id),
      ne(gymSubscriptions.status, "canceled"),
    ),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  const plan = subscription
    ? ((await db.query.platformPlans.findFirst({
        where: eq(platformPlans.id, subscription.planId),
      })) ?? null)
    : null;

  return { user, gym, subscription: subscription ?? null, plan };
}

/** Gym context or redirect. Use at the top of every /app page and server action. */
export async function requireGym(): Promise<GymContext> {
  const ctx = await getGymContext();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

export function isGymRole(role: Role): boolean {
  return GYM_ROLES.includes(role);
}

/** Where should this role land after login? */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "super_admin":
      return "/sa";
    case "member":
      return "/me";
    default:
      return "/app";
  }
}
