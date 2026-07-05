import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { appointmentStatusEnum, bookingStatusEnum } from "./enums";
import { gyms } from "./tenancy";
import { members, trainers } from "./people";

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trainerId: uuid("trainer_id").references(() => trainers.id, { onDelete: "set null" }),
  capacity: integer("capacity").notNull().default(20),
  durationMins: integer("duration_mins").notNull().default(60),
  color: text("color").notNull().default("#b5f31d"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Recurring weekly slot: dayOfWeek 0=Sun … 6=Sat + start time. */
export const classSchedules = pgTable("class_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classBookings = pgTable("class_bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  scheduleId: uuid("schedule_id").notNull().references(() => classSchedules.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  bookingDate: date("booking_date").notNull(),
  status: bookingStatusEnum("status").notNull().default("booked"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionPacks = pgTable("session_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  totalSessions: integer("total_sessions").notNull(),
  usedSessions: integer("used_sessions").notNull().default(0),
  pricePaise: integer("price_paise").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  trainerId: uuid("trainer_id").references(() => trainers.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  durationMins: integer("duration_mins").notNull().default(60),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  sessionPackId: uuid("session_pack_id").references(() => sessionPacks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workoutPlans = pgTable("workout_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // memberId null = reusable template; set = assigned to that member.
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => workoutPlans.id, { onDelete: "cascade" }),
  dayLabel: text("day_label").notNull(),
  name: text("name").notNull(),
  sets: integer("sets").notNull().default(3),
  reps: text("reps").notNull().default("10"),
  restSec: integer("rest_sec").notNull().default(60),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const dietPlans = pgTable("diet_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dietMeals = pgTable("diet_meals", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => dietPlans.id, { onDelete: "cascade" }),
  time: text("time").notNull(),
  items: text("items").notNull(),
  calories: integer("calories").notNull().default(0),
  protein: numeric("protein", { precision: 6, scale: 1 }),
  carbs: numeric("carbs", { precision: 6, scale: 1 }),
  fat: numeric("fat", { precision: 6, scale: 1 }),
  sortOrder: integer("sort_order").notNull().default(0),
});
