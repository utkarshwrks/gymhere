import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  cashDirectionEnum,
  invoiceStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
} from "./enums";
import { gyms } from "./tenancy";
import { members, users } from "./people";

export const expenseTypes = pgTable("expense_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  groupName: text("group_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  expenseTypeId: uuid("expense_type_id").references(() => expenseTypes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  amountPaise: integer("amount_paise").notNull(),
  spentOn: date("spent_on").notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  number: text("number").notNull(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  subtotalPaise: integer("subtotal_paise").notNull().default(0),
  discountPaise: integer("discount_paise").notNull().default(0),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  taxPaise: integer("tax_paise").notNull().default(0),
  totalPaise: integer("total_paise").notNull().default(0),
  amountPaidPaise: integer("amount_paid_paise").notNull().default(0),
  duePaise: integer("due_paise").notNull().default(0),
  notes: text("notes"),
  issuedOn: date("issued_on").notNull(),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPricePaise: integer("unit_price_paise").notNull(),
  amountPaise: integer("amount_paise").notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  amountPaise: integer("amount_paise").notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  status: paymentStatusEnum("status").notNull().default("captured"),
  reference: text("reference"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  collectedByUserId: uuid("collected_by_user_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single ledger for every rupee in/out — powers the cash book / day book. */
export const cashbookEntries = pgTable("cashbook_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  direction: cashDirectionEnum("direction").notNull(),
  source: text("source").notNull(), // payment | pos | expense | payroll | vendor
  refId: text("ref_id"),
  amountPaise: integer("amount_paise").notNull(),
  description: text("description").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
