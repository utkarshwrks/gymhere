import {
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { attendanceMethodEnum, attendancePersonEnum } from "./enums";
import { gyms } from "./tenancy";
import { members, users } from "./people";

/**
 * Attendance events. Phase 2 records member/staff check-ins (one row per visit);
 * Phase 4 extends this with check-out + duration for in/out punches.
 */
export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  personType: attendancePersonEnum("person_type").notNull().default("member"),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  staffUserId: uuid("staff_user_id").references(() => users.id, { onDelete: "cascade" }),
  method: attendanceMethodEnum("method").notNull().default("manual"),
  checkInAt: timestamp("check_in_at", { withTimezone: true }).notNull().defaultNow(),
  checkOutAt: timestamp("check_out_at", { withTimezone: true }),
  durationMins: integer("duration_mins"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
