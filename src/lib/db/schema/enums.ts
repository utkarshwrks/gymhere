import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "super_admin",
  "gym_owner",
  "staff",
  "trainer",
  "member",
]);

export const gymStatusEnum = pgEnum("gym_status", ["active", "suspended"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "suspended",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "active",
  "inactive",
  "frozen",
  "expired",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
