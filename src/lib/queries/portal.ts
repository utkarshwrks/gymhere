import { and, desc, eq, gt } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  attendance,
  classBookings,
  classSchedules,
  classes,
  dietMeals,
  dietPlans,
  invoices,
  memberSubscriptions,
  payments,
  workoutExercises,
  workoutPlans,
} from "@/lib/db/schema";

export async function portalHome(gymId: string, memberId: string) {
  const [subs, dueInvoices, recentAtt, bookings] = await Promise.all([
    db.select().from(memberSubscriptions).where(and(eq(memberSubscriptions.gymId, gymId), eq(memberSubscriptions.memberId, memberId))),
    db.select().from(invoices).where(and(eq(invoices.gymId, gymId), eq(invoices.memberId, memberId), gt(invoices.duePaise, 0))),
    db.select().from(attendance).where(and(eq(attendance.gymId, gymId), eq(attendance.memberId, memberId))).orderBy(desc(attendance.checkInAt)).limit(30),
    db.select({ bookingDate: classBookings.bookingDate, className: classes.name, startTime: classSchedules.startTime })
      .from(classBookings)
      .innerJoin(classSchedules, eq(classBookings.scheduleId, classSchedules.id))
      .innerJoin(classes, eq(classSchedules.classId, classes.id))
      .where(and(eq(classBookings.gymId, gymId), eq(classBookings.memberId, memberId), eq(classBookings.status, "booked"))),
  ]);

  const currentSub = subs.length ? subs.reduce((a, b) => (new Date(a.endDate) > new Date(b.endDate) ? a : b)) : null;
  const duesPaise = dueInvoices.reduce((s, i) => s + i.duePaise, 0);
  const today = format(new Date(), "yyyy-MM-dd");
  const nextClass = bookings
    .filter((b) => b.bookingDate >= today)
    .sort((a, b) => (a.bookingDate + a.startTime).localeCompare(b.bookingDate + b.startTime))[0] ?? null;

  return {
    currentSub: currentSub ? { planName: currentSub.planName, startDate: currentSub.startDate, endDate: currentSub.endDate, status: currentSub.status } : null,
    duesPaise,
    checkinCount: recentAtt.length,
    recentAttendance: recentAtt.map((a) => a.checkInAt.toISOString()),
    nextClass: nextClass ? { className: nextClass.className, date: nextClass.bookingDate, time: nextClass.startTime.slice(0, 5) } : null,
  };
}

export async function portalPayments(gymId: string, memberId: string) {
  const [pays, dueInvoices] = await Promise.all([
    db.select().from(payments).where(and(eq(payments.gymId, gymId), eq(payments.memberId, memberId), eq(payments.status, "captured"))).orderBy(desc(payments.createdAt)),
    db.select().from(invoices).where(and(eq(invoices.gymId, gymId), eq(invoices.memberId, memberId), gt(invoices.duePaise, 0))),
  ]);
  return {
    payments: pays.map((p) => ({ id: p.id, amountPaise: p.amountPaise, method: p.method, createdAt: p.createdAt.toISOString() })),
    dueInvoices: dueInvoices.map((i) => ({ id: i.id, number: i.number, duePaise: i.duePaise })),
  };
}

export async function portalWorkouts(gymId: string, memberId: string) {
  const [wPlans, exercises, dPlans, meals] = await Promise.all([
    db.select().from(workoutPlans).where(and(eq(workoutPlans.gymId, gymId), eq(workoutPlans.memberId, memberId))),
    db.select().from(workoutExercises).where(eq(workoutExercises.gymId, gymId)),
    db.select().from(dietPlans).where(and(eq(dietPlans.gymId, gymId), eq(dietPlans.memberId, memberId))),
    db.select().from(dietMeals).where(eq(dietMeals.gymId, gymId)),
  ]);
  return {
    workouts: wPlans.map((p) => ({ id: p.id, name: p.name, exercises: exercises.filter((e) => e.planId === p.id).map((e) => ({ id: e.id, dayLabel: e.dayLabel, name: e.name, sets: e.sets, reps: e.reps, restSec: e.restSec })) })),
    diets: dPlans.map((p) => ({ id: p.id, name: p.name, meals: meals.filter((m) => m.planId === p.id).map((m) => ({ id: m.id, time: m.time, items: m.items, calories: m.calories })) })),
  };
}

export async function portalClasses(gymId: string, memberId: string) {
  const myBookings = await db
    .select({ id: classBookings.id, scheduleId: classBookings.scheduleId, bookingDate: classBookings.bookingDate })
    .from(classBookings)
    .where(and(eq(classBookings.gymId, gymId), eq(classBookings.memberId, memberId), eq(classBookings.status, "booked")));
  return { myBookings };
}
