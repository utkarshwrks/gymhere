import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { paymentMethodEnum, salaryRunStatusEnum } from "./enums";
import { gyms } from "./tenancy";
import { users } from "./people";

export const staffAttendance = pgTable("staff_attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  staffUserId: uuid("staff_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  onDate: date("on_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salaryStructures = pgTable("salary_structures", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  staffUserId: uuid("staff_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthlyBasePaise: integer("monthly_base_paise").notNull().default(0),
  standardDays: integer("standard_days").notNull().default(26),
  ptIncentivePerSessionPaise: integer("pt_incentive_per_session_paise").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salaryRuns = pgTable("salary_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  staffUserId: uuid("staff_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // YYYY-MM
  workedDays: integer("worked_days").notNull().default(0),
  perDayPaise: integer("per_day_paise").notNull().default(0),
  basePaise: integer("base_paise").notNull().default(0),
  bonusPaise: integer("bonus_paise").notNull().default(0),
  ptSessions: integer("pt_sessions").notNull().default(0),
  ptIncentivePaise: integer("pt_incentive_paise").notNull().default(0),
  advanceDeductionPaise: integer("advance_deduction_paise").notNull().default(0),
  payablePaise: integer("payable_paise").notNull().default(0),
  status: salaryRunStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffPayments = pgTable("staff_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  staffUserId: uuid("staff_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  salaryRunId: uuid("salary_run_id").references(() => salaryRuns.id, { onDelete: "set null" }),
  amountPaise: integer("amount_paise").notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
