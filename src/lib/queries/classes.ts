import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  appointments,
  classBookings,
  classSchedules,
  classes,
  members,
  sessionPacks,
  trainers,
} from "@/lib/db/schema";

export function upcomingDateForDay(dayOfWeek: number): string {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return format(d, "yyyy-MM-dd");
}

export interface TimetableSlot {
  scheduleId: string;
  classId: string;
  className: string;
  color: string;
  capacity: number;
  dayOfWeek: number;
  startTime: string;
  bookedCount: number;
  upcomingDate: string;
}

export async function getTimetable(gymId: string): Promise<TimetableSlot[]> {
  const rows = await db
    .select({
      scheduleId: classSchedules.id,
      classId: classes.id,
      className: classes.name,
      color: classes.color,
      capacity: classes.capacity,
      dayOfWeek: classSchedules.dayOfWeek,
      startTime: classSchedules.startTime,
    })
    .from(classSchedules)
    .innerJoin(classes, eq(classSchedules.classId, classes.id))
    .where(eq(classSchedules.gymId, gymId));

  const bookings = await db
    .select({ scheduleId: classBookings.scheduleId, bookingDate: classBookings.bookingDate })
    .from(classBookings)
    .where(and(eq(classBookings.gymId, gymId), eq(classBookings.status, "booked")));

  return rows
    .map((r) => {
      const upcoming = upcomingDateForDay(r.dayOfWeek);
      const bookedCount = bookings.filter((b) => b.scheduleId === r.scheduleId && b.bookingDate === upcoming).length;
      return { ...r, startTime: r.startTime.slice(0, 5), bookedCount, upcomingDate: upcoming };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function getClassesWithTrainer(gymId: string) {
  const rows = await db
    .select({ id: classes.id, name: classes.name, capacity: classes.capacity, durationMins: classes.durationMins, color: classes.color, trainerName: trainers.name })
    .from(classes)
    .leftJoin(trainers, eq(classes.trainerId, trainers.id))
    .where(eq(classes.gymId, gymId));
  return rows;
}

export async function getRoster(gymId: string, scheduleId: string, date: string) {
  return db
    .select({ id: classBookings.id, memberId: classBookings.memberId, memberName: members.fullName, status: classBookings.status })
    .from(classBookings)
    .innerJoin(members, eq(classBookings.memberId, members.id))
    .where(and(eq(classBookings.gymId, gymId), eq(classBookings.scheduleId, scheduleId), eq(classBookings.bookingDate, date)));
}

export async function getSessionPacks(gymId: string) {
  return db
    .select({ id: sessionPacks.id, name: sessionPacks.name, memberName: members.fullName, total: sessionPacks.totalSessions, used: sessionPacks.usedSessions })
    .from(sessionPacks)
    .innerJoin(members, eq(sessionPacks.memberId, members.id))
    .where(eq(sessionPacks.gymId, gymId));
}

export async function getAppointments(gymId: string) {
  return db
    .select({ id: appointments.id, title: appointments.title, startAt: appointments.startAt, status: appointments.status, memberName: members.fullName })
    .from(appointments)
    .innerJoin(members, eq(appointments.memberId, members.id))
    .where(eq(appointments.gymId, gymId));
}
