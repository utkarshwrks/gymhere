import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { gymStatusEnum, subscriptionStatusEnum } from "./enums";

/** A tenant. Every gym-scoped row carries gym_id and is filtered via withGym(). */
export const gyms = pgTable("gyms", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  ownerUserId: uuid("owner_user_id"),
  status: gymStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gymSettings = pgTable("gym_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" })
    .unique(),
  currency: text("currency").notNull().default("INR"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  gstEnabled: boolean("gst_enabled").notNull().default(false),
  gstNumber: text("gst_number"),
  addressLine: text("address_line"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  primaryColor: text("primary_color").default("#b5f31d"),
  // Microsite
  micrositePublished: boolean("microsite_published").notNull().default(false),
  heroTagline: text("hero_tagline"),
  aboutText: text("about_text"),
  openingHours: jsonb("opening_hours").$type<{ day: string; hours: string }[]>(),
  mapEmbedUrl: text("map_embed_url"),
  // Biometric device webhook signing secret
  deviceSecret: text("device_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * SaaS tiers sold to gym owners. Prices in integer paise.
 * `memberCap` null = unlimited. `features` is a flag JSON read by can().
 */
export const platformPlans = pgTable("platform_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(), // starter | growth | pro
  name: text("name").notNull(),
  pricePaise: integer("price_paise").notNull(),
  memberCap: integer("member_cap"), // null = unlimited
  features: jsonb("features")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gymSubscriptions = pgTable("gym_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id")
    .notNull()
    .references(() => gyms.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => platformPlans.id),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
