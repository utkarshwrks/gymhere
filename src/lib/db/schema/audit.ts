import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { gyms } from "./tenancy";
import { users } from "./people";

/** Append-only activity feed powering the dashboard and audit trail. */
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  summary: text("summary"),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
