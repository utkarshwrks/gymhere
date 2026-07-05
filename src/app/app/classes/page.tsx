import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainers } from "@/lib/db/schema";
import { listMembers } from "@/lib/queries/members";
import { getAppointments, getClassesWithTrainer, getSessionPacks, getTimetable } from "@/lib/queries/classes";
import { ClassesView } from "@/components/classes/classes-view";

export const metadata: Metadata = { title: "Classes" };
export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const ctx = await requireGym();
  const [timetable, classList, trainerRows, membersList, packs, appts] = await Promise.all([
    getTimetable(ctx.gym.id),
    getClassesWithTrainer(ctx.gym.id),
    db.select().from(trainers).where(eq(trainers.gymId, ctx.gym.id)),
    listMembers(ctx.gym.id),
    getSessionPacks(ctx.gym.id),
    getAppointments(ctx.gym.id),
  ]);

  return (
    <ClassesView
      timetable={timetable}
      classes={classList.map((c) => ({ id: c.id, name: c.name, capacity: c.capacity, durationMins: c.durationMins, color: c.color, trainerName: c.trainerName ?? null }))}
      trainers={trainerRows.map((t) => ({ id: t.id, name: t.name }))}
      members={membersList.map((m) => ({ id: m.id, name: m.fullName }))}
      packs={packs.map((p) => ({ id: p.id, name: p.name, memberName: p.memberName, total: p.total, used: p.used }))}
      appointments={appts.map((a) => ({ id: a.id, title: a.title, memberName: a.memberName, startAt: a.startAt.toISOString(), status: a.status }))}
    />
  );
}
