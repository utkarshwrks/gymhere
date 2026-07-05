import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { dietMeals, dietPlans, workoutExercises, workoutPlans } from "@/lib/db/schema";
import { listMembers } from "@/lib/queries/members";
import { WorkoutsView } from "@/components/workouts/workouts-view";

export const metadata: Metadata = { title: "Workouts & diet" };
export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const ctx = await requireGym();
  const [wPlans, exercises, dPlans, meals, membersList] = await Promise.all([
    db.select().from(workoutPlans).where(eq(workoutPlans.gymId, ctx.gym.id)),
    db.select().from(workoutExercises).where(eq(workoutExercises.gymId, ctx.gym.id)).orderBy(asc(workoutExercises.sortOrder)),
    db.select().from(dietPlans).where(eq(dietPlans.gymId, ctx.gym.id)),
    db.select().from(dietMeals).where(eq(dietMeals.gymId, ctx.gym.id)).orderBy(asc(dietMeals.sortOrder)),
    listMembers(ctx.gym.id),
  ]);

  const memberName = new Map(membersList.map((m) => [m.id, m.fullName]));

  return (
    <WorkoutsView
      workouts={wPlans.map((p) => ({
        id: p.id,
        name: p.name,
        assignedTo: p.memberId ? memberName.get(p.memberId) ?? null : null,
        exercises: exercises.filter((e) => e.planId === p.id).map((e) => ({ id: e.id, dayLabel: e.dayLabel, name: e.name, sets: e.sets, reps: e.reps, restSec: e.restSec })),
      }))}
      diets={dPlans.map((p) => ({
        id: p.id,
        name: p.name,
        assignedTo: p.memberId ? memberName.get(p.memberId) ?? null : null,
        meals: meals.filter((m) => m.planId === p.id).map((m) => ({ id: m.id, time: m.time, items: m.items, calories: m.calories })),
      }))}
      members={membersList.map((m) => ({ id: m.id, name: m.fullName }))}
    />
  );
}
