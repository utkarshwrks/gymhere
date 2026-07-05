import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { portalWorkouts } from "@/lib/queries/portal";
import { MemberWorkouts } from "@/components/portal/member-workouts";

export const metadata: Metadata = { title: "Workout & diet" };
export const dynamic = "force-dynamic";

export default async function MemberWorkoutsPage() {
  const ctx = await requireMember();
  const data = await portalWorkouts(ctx.gym.id, ctx.member.id);
  return <MemberWorkouts workouts={data.workouts} diets={data.diets} />;
}
