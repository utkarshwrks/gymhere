import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  addonKindEnum,
  enquirySourceEnum,
  memberSubStatusEnum,
} from "./enums";
import { gyms } from "./tenancy";
import { members, users } from "./people";

export const membershipPlans = pgTable("membership_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationMonths: integer("duration_months").notNull().default(1),
  pricePaise: integer("price_paise").notNull(),
  sessionsPerWeek: integer("sessions_per_week"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  description: text("description"),
  isArchived: boolean("is_archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planAddons = pgTable("plan_addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: addonKindEnum("kind").notNull().default("other"),
  pricePaise: integer("price_paise").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One membership period per member. endDate = startDate + plan.durationMonths. */
export const memberSubscriptions = pgTable("member_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => membershipPlans.id),
  planName: text("plan_name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  pricePaise: integer("price_paise").notNull(),
  status: memberSubStatusEnum("status").notNull().default("active"),
  freezeStart: date("freeze_start"),
  freezeEnd: date("freeze_end"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Configurable CRM pipeline stages. Terminal stages (Converted/Lost) close leads. */
export const enquiryStages = pgTable("enquiry_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isTerminal: boolean("is_terminal").notNull().default(false),
  isWon: boolean("is_won").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const enquiries = pgTable("enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  interest: text("interest"),
  source: enquirySourceEnum("source").notNull().default("walk_in"),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => enquiryStages.id),
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  convertedMemberId: uuid("converted_member_id").references(() => members.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const enquiryFollowups = pgTable("enquiry_followups", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  enquiryId: uuid("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  note: text("note"),
  done: boolean("done").notNull().default(false),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
