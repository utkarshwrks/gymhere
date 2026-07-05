import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { messageChannelEnum, outboxStatusEnum } from "./enums";
import { gyms } from "./tenancy";
import { members } from "./people";

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  channel: messageChannelEnum("channel").notNull().default("email"),
  subject: text("subject"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactGroups = pgTable("contact_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactGroupMembers = pgTable("contact_group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => contactGroups.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
});

/** Every send lands here (delivery log). Demo SMS/WhatsApp write here only. */
export const outbox = pgTable("outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  channel: messageChannelEnum("channel").notNull().default("email"),
  toAddress: text("to_address").notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  subject: text("subject"),
  body: text("body").notNull(),
  status: outboxStatusEnum("status").notNull().default("queued"),
  provider: text("provider"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
