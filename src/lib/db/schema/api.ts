import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { gyms } from "./tenancy";

export const apiPlans = pgTable("api_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(), // free | startup | scale
  name: text("name").notNull(),
  monthlyQuota: integer("monthly_quota").notNull(),
  pricePaise: integer("price_paise").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(), // sha256 of the raw key
  keyPrefix: text("key_prefix").notNull(), // ghk_xxxxABCD for display
  scopes: jsonb("scopes").$type<string[]>().notNull().default(["read"]),
  apiPlanId: uuid("api_plan_id").references(() => apiPlans.id),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiUsageLogs = pgTable("api_usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  status: integer("status").notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
