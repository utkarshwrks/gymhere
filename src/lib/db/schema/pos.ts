import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { cashDirectionEnum, paymentMethodEnum } from "./enums";
import { gyms } from "./tenancy";
import { members } from "./people";

export const productBrands = pgTable("product_brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").references(() => productBrands.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku"),
  sellPricePaise: integer("sell_price_paise").notNull(),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  stockQty: integer("stock_qty").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gstNumber: text("gst_number"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  invoiceNo: text("invoice_no"),
  totalPaise: integer("total_paise").notNull().default(0),
  paidPaise: integer("paid_paise").notNull().default(0),
  purchasedOn: date("purchased_on").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  purchaseId: uuid("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull(),
  costPricePaise: integer("cost_price_paise").notNull(),
  amountPaise: integer("amount_paise").notNull(),
});

export const posSales = pgTable("pos_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  subtotalPaise: integer("subtotal_paise").notNull().default(0),
  gstPaise: integer("gst_paise").notNull().default(0),
  totalPaise: integer("total_paise").notNull().default(0),
  paidPaise: integer("paid_paise").notNull().default(0),
  duePaise: integer("due_paise").notNull().default(0),
  method: paymentMethodEnum("method").notNull().default("cash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posSaleItems = pgTable("pos_sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  saleId: uuid("sale_id").notNull().references(() => posSales.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull(),
  unitPricePaise: integer("unit_price_paise").notNull(),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  amountPaise: integer("amount_paise").notNull(),
});

export const stockLedger = pgTable("stock_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  direction: cashDirectionEnum("direction").notNull(),
  qty: integer("qty").notNull(),
  refType: text("ref_type").notNull(), // purchase | sale | adjustment
  refId: text("ref_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorPayments = pgTable("vendor_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  gymId: uuid("gym_id").notNull().references(() => gyms.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  purchaseId: uuid("purchase_id").references(() => purchases.id, { onDelete: "set null" }),
  amountPaise: integer("amount_paise").notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
