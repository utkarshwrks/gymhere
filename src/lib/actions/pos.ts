"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { recordCash } from "@/lib/db/cashbook";
import {
  posSaleItems,
  posSales,
  productBrands,
  products,
  purchaseItems,
  purchases,
  stockLedger,
  vendorPayments,
  vendors,
} from "@/lib/db/schema";
import { toPaise } from "@/lib/format";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function createBrand(name: string): Promise<Result> {
  const ctx = await requireGym();
  if (!name.trim()) return { ok: false, error: "Name required" };
  await db.insert(productBrands).values({ gymId: ctx.gym.id, name: name.trim() });
  revalidatePath("/app/store");
  return { ok: true };
}

const productSchema = z.object({
  name: z.string().min(1).max(80),
  brandId: z.string().uuid().optional().or(z.literal("")),
  sku: z.string().max(40).optional(),
  sellRupees: z.coerce.number().min(0),
  gstPercent: z.coerce.number().min(0).max(28).default(0),
});

export async function createProduct(input: z.input<typeof productSchema>): Promise<Result> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid product" };
  const ctx = await requireGym();
  await db.insert(products).values({
    gymId: ctx.gym.id,
    name: parsed.data.name,
    brandId: parsed.data.brandId || null,
    sku: parsed.data.sku || null,
    sellPricePaise: toPaise(parsed.data.sellRupees),
    gstPercent: String(parsed.data.gstPercent),
  });
  revalidatePath("/app/store");
  return { ok: true };
}

export async function createVendor(input: { name: string; gstNumber?: string; phone?: string }): Promise<Result> {
  const ctx = await requireGym();
  if (!input.name?.trim()) return { ok: false, error: "Name required" };
  await db.insert(vendors).values({ gymId: ctx.gym.id, name: input.name.trim(), gstNumber: input.gstNumber || null, phone: input.phone || null });
  revalidatePath("/app/store");
  return { ok: true };
}

const purchaseSchema = z.object({
  vendorId: z.string().uuid(),
  invoiceNo: z.string().max(40).optional(),
  purchasedOn: z.string(),
  paidRupees: z.coerce.number().min(0).default(0),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.coerce.number().int().min(1), costRupees: z.coerce.number().min(0) })).min(1),
});

/** Stock in + vendor payable. Increments stock and records a stock-ledger entry. */
export async function recordPurchase(input: z.input<typeof purchaseSchema>): Promise<Result> {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid purchase" };
  const data = parsed.data;
  const ctx = await requireGym();

  const items = data.items.map((it) => ({ ...it, costPaise: toPaise(it.costRupees), amountPaise: toPaise(it.costRupees) * it.qty }));
  const total = items.reduce((s, i) => s + i.amountPaise, 0);
  const paid = Math.min(toPaise(data.paidRupees), total);

  const [purchase] = await db.insert(purchases).values({
    gymId: ctx.gym.id,
    vendorId: data.vendorId,
    invoiceNo: data.invoiceNo || null,
    totalPaise: total,
    paidPaise: paid,
    purchasedOn: data.purchasedOn,
  }).returning();

  for (const it of items) {
    await db.insert(purchaseItems).values({ gymId: ctx.gym.id, purchaseId: purchase.id, productId: it.productId, qty: it.qty, costPricePaise: it.costPaise, amountPaise: it.amountPaise });
    await db.update(products).set({ stockQty: sql`${products.stockQty} + ${it.qty}` }).where(and(eq(products.gymId, ctx.gym.id), eq(products.id, it.productId)));
    await db.insert(stockLedger).values({ gymId: ctx.gym.id, productId: it.productId, direction: "in", qty: it.qty, refType: "purchase", refId: purchase.id });
  }

  if (paid > 0) {
    await db.insert(vendorPayments).values({ gymId: ctx.gym.id, vendorId: data.vendorId, purchaseId: purchase.id, amountPaise: paid, method: "cash" });
    await recordCash({ gymId: ctx.gym.id, direction: "out", source: "vendor", refId: purchase.id, amountPaise: paid, description: "Stock purchase payment" });
  }

  revalidatePath("/app/store");
  return { ok: true };
}

const saleSchema = z.object({
  memberId: z.string().uuid().optional().or(z.literal("")),
  customerName: z.string().max(80).optional(),
  method: z.enum(["cash", "upi", "card"]).default("cash"),
  paidRupees: z.coerce.number().min(0),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.coerce.number().int().min(1) })).min(1),
});

/** Counter sale: stock out, GST line, full/partial pay (balance → dues). */
export async function recordSale(input: z.input<typeof saleSchema>): Promise<Result> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid sale" };
  const data = parsed.data;
  const ctx = await requireGym();

  const prods = await db.select().from(products).where(eq(products.gymId, ctx.gym.id));
  const byId = new Map(prods.map((p) => [p.id, p]));

  let subtotal = 0;
  let gst = 0;
  const lines: (typeof posSaleItems.$inferInsert)[] = [];
  for (const it of data.items) {
    const p = byId.get(it.productId);
    if (!p) return { ok: false, error: "Product not found" };
    if (p.stockQty < it.qty) return { ok: false, error: `Not enough stock of ${p.name}` };
    const amount = p.sellPricePaise * it.qty;
    const lineGst = Math.round((amount * Number(p.gstPercent)) / 100);
    subtotal += amount;
    gst += lineGst;
    lines.push({ gymId: ctx.gym.id, saleId: "", productId: p.id, qty: it.qty, unitPricePaise: p.sellPricePaise, gstPercent: p.gstPercent, amountPaise: amount });
  }
  const total = subtotal + gst;
  const paid = Math.min(toPaise(data.paidRupees), total);
  const due = total - paid;

  const [sale] = await db.insert(posSales).values({
    gymId: ctx.gym.id,
    memberId: data.memberId || null,
    customerName: data.customerName || null,
    subtotalPaise: subtotal,
    gstPaise: gst,
    totalPaise: total,
    paidPaise: paid,
    duePaise: due,
    method: data.method,
  }).returning();

  for (const line of lines) {
    await db.insert(posSaleItems).values({ ...line, saleId: sale.id });
    await db.update(products).set({ stockQty: sql`${products.stockQty} - ${line.qty}` }).where(eq(products.id, line.productId));
    await db.insert(stockLedger).values({ gymId: ctx.gym.id, productId: line.productId, direction: "out", qty: line.qty, refType: "sale", refId: sale.id });
  }

  if (paid > 0) {
    await recordCash({ gymId: ctx.gym.id, direction: "in", source: "pos", refId: sale.id, amountPaise: paid, description: "Counter sale" });
  }

  revalidatePath("/app/store");
  return { ok: true };
}

export async function payVendor(input: { vendorId: string; purchaseId?: string; amountRupees: number; method?: "cash" | "upi" | "bank" }): Promise<Result> {
  const ctx = await requireGym();
  const amount = toPaise(input.amountRupees);
  if (amount <= 0) return { ok: false, error: "Amount required" };
  await db.insert(vendorPayments).values({ gymId: ctx.gym.id, vendorId: input.vendorId, purchaseId: input.purchaseId || null, amountPaise: amount, method: input.method ?? "cash" });
  if (input.purchaseId) {
    await db.update(purchases).set({ paidPaise: sql`${purchases.paidPaise} + ${amount}` }).where(and(eq(purchases.gymId, ctx.gym.id), eq(purchases.id, input.purchaseId)));
  }
  await recordCash({ gymId: ctx.gym.id, direction: "out", source: "vendor", refId: input.purchaseId, amountPaise: amount, description: "Vendor payment" });
  revalidatePath("/app/store");
  return { ok: true };
}
