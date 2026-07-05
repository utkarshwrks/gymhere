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

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "partial",
  "overdue",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "upi",
  "card",
  "razorpay",
  "bank",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "captured",
  "failed",
  "refunded",
]);

export const cashDirectionEnum = pgEnum("cash_direction", ["in", "out"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "booked",
  "attended",
  "cancelled",
]);

export const salaryRunStatusEnum = pgEnum("salary_run_status", [
  "draft",
  "finalized",
  "paid",
]);

export const messageChannelEnum = pgEnum("message_channel", [
  "email",
  "sms",
  "whatsapp",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "queued",
  "sent",
  "failed",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "hidden",
]);
