"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { classBookings, classSchedules, classes } from "@/lib/db/schema";
import { toPaise } from "@/lib/format";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const classSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  trainerId: z.string().uuid().optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(500),
  durationMins: z.coerce.number().int().min(15).max(240),
  color: z.string().max(9).default("#b5f31d"),
});

export async function saveClass(input: z.input<typeof classSchema>): Promise<Result<{ id: string }>> {
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid class" };
  const d = parsed.data;
  const ctx = await requireGym();
  const values = { name: d.name, trainerId: d.trainerId || null, capacity: d.capacity, durationMins: d.durationMins, color: d.color };
  if (d.id) {
    await db.update(classes).set(values).where(and(eq(classes.gymId, ctx.gym.id), eq(classes.id, d.id)));
    revalidatePath("/app/classes");
    return { ok: true, data: { id: d.id } };
  }
  const [row] = await db.insert(classes).values({ gymId: ctx.gym.id, ...values }).returning();
  revalidatePath("/app/classes");
  return { ok: true, data: { id: row.id } };
}

const scheduleSchema = z.object({
  classId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string(), // HH:MM
});

export async function addSchedule(input: z.input<typeof scheduleSchema>): Promise<Result> {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid slot" };
  const ctx = await requireGym();
  await db.insert(classSchedules).values({
    gymId: ctx.gym.id,
    classId: parsed.data.classId,
    dayOfWeek: parsed.data.dayOfWeek,
    startTime: parsed.data.startTime.length === 5 ? `${parsed.data.startTime}:00` : parsed.data.startTime,
  });
  revalidatePath("/app/classes");
  return { ok: true };
}

export async function deleteSchedule(scheduleId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.delete(classSchedules).where(and(eq(classSchedules.gymId, ctx.gym.id), eq(classSchedules.id, scheduleId)));
  revalidatePath("/app/classes");
  return { ok: true };
}

const bookSchema = z.object({ scheduleId: z.string().uuid(), memberId: z.string().uuid(), bookingDate: z.string() });

/** Book a member into a class slot — blocked once the class hits capacity. */
export async function bookClass(input: z.input<typeof bookSchema>): Promise<Result> {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking" };
  const { scheduleId, memberId, bookingDate } = parsed.data;
  const ctx = await requireGym();

  const schedule = await db.query.classSchedules.findFirst({
    where: and(eq(classSchedules.gymId, ctx.gym.id), eq(classSchedules.id, scheduleId)),
  });
  if (!schedule) return { ok: false, error: "Slot not found" };
  const klass = await db.query.classes.findFirst({ where: eq(classes.id, schedule.classId) });
  if (!klass) return { ok: false, error: "Class not found" };

  const existing = await db
    .select({ id: classBookings.id, memberId: classBookings.memberId })
    .from(classBookings)
    .where(and(eq(classBookings.gymId, ctx.gym.id), eq(classBookings.scheduleId, scheduleId), eq(classBookings.bookingDate, bookingDate), eq(classBookings.status, "booked")));

  if (existing.some((e) => e.memberId === memberId)) return { ok: false, error: "Already booked" };
  if (existing.length >= klass.capacity) return { ok: false, error: "Class is full" };

  await db.insert(classBookings).values({ gymId: ctx.gym.id, scheduleId, memberId, bookingDate, status: "booked" });
  revalidatePath("/app/classes");
  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.update(classBookings).set({ status: "cancelled" }).where(and(eq(classBookings.gymId, ctx.gym.id), eq(classBookings.id, bookingId)));
  revalidatePath("/app/classes");
  return { ok: true };
}

// --- Session packs & appointments (PT) ---
const packSchema = z.object({ memberId: z.string().uuid(), name: z.string().min(1).max(60), totalSessions: z.coerce.number().int().min(1).max(200), priceRupees: z.coerce.number().min(0) });

export async function createSessionPack(input: z.input<typeof packSchema>): Promise<Result> {
  const parsed = packSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid pack" };
  const ctx = await requireGym();
  const { sessionPacks } = await import("@/lib/db/schema");
  await db.insert(sessionPacks).values({ gymId: ctx.gym.id, memberId: parsed.data.memberId, name: parsed.data.name, totalSessions: parsed.data.totalSessions, pricePaise: toPaise(parsed.data.priceRupees) });
  revalidatePath("/app/classes");
  return { ok: true };
}

const apptSchema = z.object({ memberId: z.string().uuid(), trainerId: z.string().uuid().optional().or(z.literal("")), title: z.string().min(1).max(80), startAt: z.string(), durationMins: z.coerce.number().int().min(15).max(240).default(60), sessionPackId: z.string().uuid().optional().or(z.literal("")) });

export async function bookAppointment(input: z.input<typeof apptSchema>): Promise<Result> {
  const parsed = apptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid appointment" };
  const d = parsed.data;
  const ctx = await requireGym();
  const { appointments } = await import("@/lib/db/schema");
  await db.insert(appointments).values({ gymId: ctx.gym.id, memberId: d.memberId, trainerId: d.trainerId || null, title: d.title, startAt: new Date(d.startAt), durationMins: d.durationMins, sessionPackId: d.sessionPackId || null });
  revalidatePath("/app/classes");
  return { ok: true };
}

/** Completing a PT appointment decrements the linked session pack's remaining count. */
export async function completeAppointment(appointmentId: string): Promise<Result> {
  const ctx = await requireGym();
  const { appointments, sessionPacks } = await import("@/lib/db/schema");
  const { sql } = await import("drizzle-orm");
  const appt = await db.query.appointments.findFirst({ where: and(eq(appointments.gymId, ctx.gym.id), eq(appointments.id, appointmentId)) });
  if (!appt) return { ok: false, error: "Appointment not found" };
  await db.update(appointments).set({ status: "completed" }).where(eq(appointments.id, appointmentId));
  if (appt.sessionPackId) {
    await db.update(sessionPacks).set({ usedSessions: sql`LEAST(${sessionPacks.totalSessions}, ${sessionPacks.usedSessions} + 1)` }).where(eq(sessionPacks.id, appt.sessionPackId));
  }
  revalidatePath("/app/classes");
  return { ok: true };
}
