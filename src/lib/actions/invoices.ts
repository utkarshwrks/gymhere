"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { recordCash } from "@/lib/db/cashbook";
import { settleInvoiceAmount } from "@/lib/billing-core";
import { logActivity } from "@/lib/db/activity";
import { invoiceItems, invoices, members, payments } from "@/lib/db/schema";
import { sendEmail } from "@/lib/messaging";
import { toPaise } from "@/lib/format";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function nextInvoiceNumber(gymId: string): Promise<string> {
  const rows = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.gymId, gymId));
  return `INV-${String(rows.length + 1).padStart(4, "0")}`;
}

const itemSchema = z.object({
  description: z.string().min(1).max(120),
  quantity: z.coerce.number().int().min(1).max(999),
  unitPriceRupees: z.coerce.number().min(0),
});

const createSchema = z.object({
  memberId: z.string().uuid().optional().or(z.literal("")),
  items: z.array(itemSchema).min(1),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  discountRupees: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional(),
  notes: z.string().max(240).optional(),
  markSent: z.boolean().default(true),
});

export type CreateInvoiceInput = z.input<typeof createSchema>;

export async function createInvoice(input: CreateInvoiceInput): Promise<Result<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invoice" };
  const data = parsed.data;
  const ctx = await requireGym();

  const items = data.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unitPricePaise: toPaise(it.unitPriceRupees),
    amountPaise: toPaise(it.unitPriceRupees) * it.quantity,
  }));
  const subtotal = items.reduce((s, i) => s + i.amountPaise, 0);
  const discount = toPaise(data.discountRupees);
  const taxable = Math.max(0, subtotal - discount);
  const taxPaise = Math.round((taxable * data.taxPercent) / 100);
  const total = taxable + taxPaise;

  const [invoice] = await db
    .insert(invoices)
    .values({
      gymId: ctx.gym.id,
      memberId: data.memberId || null,
      number: await nextInvoiceNumber(ctx.gym.id),
      status: data.markSent ? "sent" : "draft",
      subtotalPaise: subtotal,
      discountPaise: discount,
      taxPercent: String(data.taxPercent),
      taxPaise,
      totalPaise: total,
      duePaise: total,
      notes: data.notes ?? null,
      issuedOn: new Date().toISOString().slice(0, 10),
      dueDate: data.dueDate || null,
    })
    .returning();

  await db.insert(invoiceItems).values(items.map((i) => ({ gymId: ctx.gym.id, invoiceId: invoice.id, ...i })));
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "plan.created", entity: "invoice", entityId: invoice.id, summary: `Invoice ${invoice.number} raised` });

  revalidatePath("/app/billing");
  return { ok: true, data: { id: invoice.id } };
}

const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountRupees: z.coerce.number().min(0.01),
  method: z.enum(["cash", "upi", "card", "razorpay", "bank"]),
  note: z.string().max(160).optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
});

/** Record a (possibly partial) payment and recompute invoice status + dues. */
export async function recordInvoicePayment(input: z.input<typeof paymentSchema>): Promise<Result> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment" };
  const data = parsed.data;
  const ctx = await requireGym();

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.gymId, ctx.gym.id), eq(invoices.id, data.invoiceId)),
  });
  if (!invoice) return { ok: false, error: "Invoice not found" };

  // Idempotency: skip if this Razorpay payment was already recorded.
  if (data.razorpayPaymentId) {
    const existing = await db.query.payments.findFirst({
      where: and(eq(payments.gymId, ctx.gym.id), eq(payments.razorpayPaymentId, data.razorpayPaymentId)),
    });
    if (existing) return { ok: true };
  }

  const amount = toPaise(data.amountRupees);
  await applyPayment({
    gymId: ctx.gym.id,
    invoice,
    amountPaise: amount,
    method: data.method,
    note: data.note,
    collectedByUserId: ctx.user.id,
    razorpayOrderId: data.razorpayOrderId,
    razorpayPaymentId: data.razorpayPaymentId,
  });

  revalidatePath(`/app/billing/${data.invoiceId}`);
  revalidatePath("/app/billing");
  revalidatePath("/app");
  return { ok: true };
}

/** Shared payment application used by manual recording and the Razorpay webhook. */
export async function applyPayment(input: {
  gymId: string;
  invoice: typeof invoices.$inferSelect;
  amountPaise: number;
  method: "cash" | "upi" | "card" | "razorpay" | "bank";
  note?: string;
  collectedByUserId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}): Promise<void> {
  const { gymId, invoice } = input;

  await db.insert(payments).values({
    gymId,
    invoiceId: invoice.id,
    memberId: invoice.memberId,
    amountPaise: input.amountPaise,
    method: input.method,
    status: "captured",
    note: input.note,
    collectedByUserId: input.collectedByUserId,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    reference: input.razorpayPaymentId,
  });

  await settleInvoiceAmount(invoice.id, input.amountPaise);

  await recordCash({
    gymId,
    direction: "in",
    source: "payment",
    refId: invoice.id,
    amountPaise: input.amountPaise,
    description: `Payment for ${invoice.number}`,
  });

  await logActivity({ gymId, actorUserId: input.collectedByUserId, action: "member.renewed", entity: "payment", entityId: invoice.id, summary: `Payment received on ${invoice.number}` });
}

export async function sendDueReminder(invoiceId: string): Promise<Result> {
  const ctx = await requireGym();
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.gymId, ctx.gym.id), eq(invoices.id, invoiceId)),
  });
  if (!invoice || !invoice.memberId) return { ok: false, error: "No member on this invoice" };
  const member = await db.query.members.findFirst({ where: eq(members.id, invoice.memberId) });
  if (!member?.email) return { ok: false, error: "Member has no email on file" };

  await sendEmail({
    gymId: ctx.gym.id,
    to: member.email,
    memberId: member.id,
    subject: `Payment reminder — ${invoice.number}`,
    body: `Hi ${member.fullName},\n\nThis is a friendly reminder that ₹${(invoice.duePaise / 100).toLocaleString("en-IN")} is due on invoice ${invoice.number}.\n\nThank you,\n${ctx.gym.name}`,
  });

  return { ok: true };
}

export async function cancelInvoice(invoiceId: string): Promise<Result> {
  const ctx = await requireGym();
  await db
    .update(invoices)
    .set({ status: "cancelled" })
    .where(and(eq(invoices.gymId, ctx.gym.id), eq(invoices.id, invoiceId)));
  revalidatePath("/app/billing");
  return { ok: true };
}

export async function listRecentInvoices(gymId: string) {
  return db.select().from(invoices).where(eq(invoices.gymId, gymId)).orderBy(desc(invoices.createdAt));
}
