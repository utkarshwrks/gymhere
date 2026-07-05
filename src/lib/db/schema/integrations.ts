import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  credentialStatusEnum,
  integrationModeEnum,
  integrationServiceEnum,
} from "./enums";
import { gyms } from "./tenancy";
import { users } from "./people";

/**
 * Per-service policy. A row with gym_id NULL is the platform-wide default; a row
 * with a gym_id is that gym's override. The credential resolver reads the
 * override first, then the global default.
 */
export const integrationPolicies = pgTable("integration_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }),
  service: integrationServiceEnum("service").notNull(),
  mode: integrationModeEnum("mode").notNull().default("platform"),
  allowPlatformFallback: boolean("allow_platform_fallback").notNull().default(true),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A gym's own encrypted credentials for a service. Secrets live only in
 * `encryptedPayload` (AES-256-GCM); `keyHint` is a masked display value.
 */
export const tenantCredentials = pgTable("tenant_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  service: integrationServiceEnum("service").notNull(),
  encryptedPayload: text("encrypted_payload").notNull(),
  keyHint: text("key_hint"),
  status: credentialStatusEnum("status").notNull().default("unverified"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  error: text("error"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
