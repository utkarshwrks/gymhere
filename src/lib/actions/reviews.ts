"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { gyms, memberReviews } from "@/lib/db/schema";

type Result = { ok: true } | { ok: false; error: string };

export async function setReviewStatus(reviewId: string, status: "approved" | "hidden"): Promise<Result> {
  const ctx = await requireGym();
  await db.update(memberReviews).set({ status }).where(and(eq(memberReviews.gymId, ctx.gym.id), eq(memberReviews.id, reviewId)));
  revalidatePath("/app/reviews");
  await revalidateMicrosite(ctx.gym.id);
  return { ok: true };
}

export async function toggleReviewMicrosite(reviewId: string, show: boolean): Promise<Result> {
  const ctx = await requireGym();
  await db.update(memberReviews).set({ showOnMicrosite: show }).where(and(eq(memberReviews.gymId, ctx.gym.id), eq(memberReviews.id, reviewId)));
  revalidatePath("/app/reviews");
  await revalidateMicrosite(ctx.gym.id);
  return { ok: true };
}

async function revalidateMicrosite(gymId: string) {
  const gym = await db.query.gyms.findFirst({ where: eq(gyms.id, gymId) });
  if (gym) revalidatePath(`/g/${gym.slug}`);
}
