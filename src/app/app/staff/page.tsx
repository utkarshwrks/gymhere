import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { staffProfiles, trainers, users } from "@/lib/db/schema";
import { StaffView } from "@/components/staff/staff-view";

export const metadata: Metadata = { title: "Staff & trainers" };
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const ctx = await requireGym();
  const [profiles, trainerRows] = await Promise.all([
    db
      .select({ id: staffProfiles.id, userId: staffProfiles.userId, name: users.name, email: users.email, role: users.role, designation: staffProfiles.designation, permissions: staffProfiles.permissions })
      .from(staffProfiles)
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(eq(staffProfiles.gymId, ctx.gym.id)),
    db.select().from(trainers).where(eq(trainers.gymId, ctx.gym.id)),
  ]);

  return (
    <StaffView
      staff={profiles.map((p) => ({ id: p.id, userId: p.userId, name: p.name ?? p.email, email: p.email, role: p.role, designation: p.designation, permissions: (p.permissions ?? {}) as Record<string, boolean> }))}
      trainers={trainerRows.map((t) => ({ id: t.id, name: t.name, specialization: t.specialization }))}
    />
  );
}
