"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { dietMeals, dietPlans, workoutExercises, workoutPlans } from "@/lib/db/schema";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function createWorkoutPlan(name: string, memberId?: string): Promise<Result<{ id: string }>> {
  const ctx = await requireGym();
  if (!name.trim()) return { ok: false, error: "Name required" };
  const [row] = await db.insert(workoutPlans).values({ gymId: ctx.gym.id, name: name.trim(), memberId: memberId || null }).returning();
  revalidatePath("/app/workouts");
  return { ok: true, data: { id: row.id } };
}

const exerciseSchema = z.object({
  planId: z.string().uuid(),
  dayLabel: z.string().min(1).max(30),
  name: z.string().min(1).max(80),
  sets: z.coerce.number().int().min(1).max(20),
  reps: z.string().max(20),
  restSec: z.coerce.number().int().min(0).max(600),
});

export async function addExercise(input: z.input<typeof exerciseSchema>): Promise<Result> {
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid exercise" };
  const ctx = await requireGym();
  await db.insert(workoutExercises).values({ gymId: ctx.gym.id, ...parsed.data });
  revalidatePath("/app/workouts");
  return { ok: true };
}

export async function deleteExercise(id: string): Promise<Result> {
  const ctx = await requireGym();
  await db.delete(workoutExercises).where(and(eq(workoutExercises.gymId, ctx.gym.id), eq(workoutExercises.id, id)));
  revalidatePath("/app/workouts");
  return { ok: true };
}

export async function assignWorkout(planId: string, memberId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.update(workoutPlans).set({ memberId: memberId || null }).where(and(eq(workoutPlans.gymId, ctx.gym.id), eq(workoutPlans.id, planId)));
  revalidatePath("/app/workouts");
  return { ok: true };
}

export async function createDietPlan(name: string, memberId?: string): Promise<Result<{ id: string }>> {
  const ctx = await requireGym();
  if (!name.trim()) return { ok: false, error: "Name required" };
  const [row] = await db.insert(dietPlans).values({ gymId: ctx.gym.id, name: name.trim(), memberId: memberId || null }).returning();
  revalidatePath("/app/workouts");
  return { ok: true, data: { id: row.id } };
}

const mealSchema = z.object({
  planId: z.string().uuid(),
  time: z.string().min(1).max(30),
  items: z.string().min(1).max(200),
  calories: z.coerce.number().int().min(0).max(10000),
  protein: z.coerce.number().min(0).max(1000).optional(),
  carbs: z.coerce.number().min(0).max(1000).optional(),
  fat: z.coerce.number().min(0).max(1000).optional(),
});

export async function addMeal(input: z.input<typeof mealSchema>): Promise<Result> {
  const parsed = mealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid meal" };
  const d = parsed.data;
  const ctx = await requireGym();
  await db.insert(dietMeals).values({ gymId: ctx.gym.id, planId: d.planId, time: d.time, items: d.items, calories: d.calories, protein: d.protein?.toString() ?? null, carbs: d.carbs?.toString() ?? null, fat: d.fat?.toString() ?? null });
  revalidatePath("/app/workouts");
  return { ok: true };
}

export async function assignDiet(planId: string, memberId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.update(dietPlans).set({ memberId: memberId || null }).where(and(eq(dietPlans.gymId, ctx.gym.id), eq(dietPlans.id, planId)));
  revalidatePath("/app/workouts");
  return { ok: true };
}
