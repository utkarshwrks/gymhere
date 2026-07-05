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

export const enquirySourceEnum = pgEnum("enquiry_source", [
  "walk_in",
  "phone",
  "website",
  "referral",
  "social",
  "other",
]);

export const memberSubStatusEnum = pgEnum("member_sub_status", [
  "active",
  "expired",
  "frozen",
  "cancelled",
]);

export const attendanceMethodEnum = pgEnum("attendance_method", [
  "manual",
  "qr",
  "biometric",
]);

export const attendancePersonEnum = pgEnum("attendance_person", [
  "member",
  "staff",
]);

export const addonKindEnum = pgEnum("addon_kind", [
  "personal_training",
  "locker",
  "diet_plan",
  "other",
]);
