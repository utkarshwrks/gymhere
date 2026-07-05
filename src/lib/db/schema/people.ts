import {
  date,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { genderEnum, memberStatusEnum, roleEnum } from "./enums";
import { gyms } from "./tenancy";

/**
 * Identity row synced from Clerk via webhook. A super_admin has gymId null.
 * A member row's user is linked when they accept an invite (Phase 4).
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  role: roleEnum("role").notNull().default("gym_owner"),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  gender: genderEnum("gender"),
  dob: date("dob"),
  photoUrl: text("photo_url"),
  address: text("address"),
  idProofNo: text("id_proof_no"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }),
  batchId: uuid("batch_id").references(() => batches.id, { onDelete: "set null" }),
  status: memberStatusEnum("status").notNull().default("active"),
  qrToken: text("qr_token").notNull().unique(),
  joinDate: date("join_date").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberWeightLogs = pgTable("member_weight_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  weightKg: numeric("weight_kg", { precision: 5, scale: 1 }).notNull(),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  bmi: numeric("bmi", { precision: 4, scale: 1 }),
  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  designation: text("designation"),
  phone: text("phone"),
  permissions: jsonb("permissions")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trainers = pgTable("trainers", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  specialization: text("specialization"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
