"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { classBookings, classSchedules, classes, invoices, memberReviews, members, payments } from "@/lib/db/schema";
import { createOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { captureRazorpayPayment } from "@/lib/billing-core";
import { paymentsReady, resolvePaymentContext } from "@/lib/credentials/resolver";
import type { CheckoutInfo } from "@/lib/actions/billing";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function bookClassMe(scheduleId: string, bookingDate: string): Promise<Result> {
  const ctx = await requireMember();
  const schedule = await db.query.classSchedules.findFirst({ where: and(eq(classSchedules.gymId, ctx.gym.id), eq(classSchedules.id, scheduleId)) });
  if (!schedule) return { ok: false, error: "Slot not found" };
  const klass = await db.query.classes.findFirst({ where: eq(classes.id, schedule.classId) });
  if (!klass) return { ok: false, error: "Class not found" };

  const existing = await db
    .select({ id: classBookings.id, memberId: classBookings.memberId })
    .from(classBookings)
    .where(and(eq(classBookings.gymId, ctx.gym.id), eq(classBookings.scheduleId, scheduleId), eq(classBookings.bookingDate, bookingDate), eq(classBookings.status, "booked")));
  if (existing.some((e) => e.memberId === ctx.member.id)) return { ok: false, error: "You're already booked" };
  if (existing.length >= klass.capacity) return { ok: false, error: "Class is full" };

  await db.insert(classBookings).values({ gymId: ctx.gym.id, scheduleId, memberId: ctx.member.id, bookingDate, status: "booked" });
  revalidatePath("/me/classes");
  return { ok: true };
}

export async function cancelBookingMe(bookingId: string): Promise<Result> {
  const ctx = await requireMember();
  await db.update(classBookings).set({ status: "cancelled" }).where(and(eq(classBookings.gymId, ctx.gym.id), eq(classBookings.id, bookingId), eq(classBookings.memberId, ctx.member.id)));
  revalidatePath("/me/classes");
  return { ok: true };
}

const profileSchema = z.object({
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(240).optional(),
  emergencyContactName: z.string().max(80).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
});

export async function updateMyProfile(input: z.input<typeof profileSchema>): Promise<Result> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const ctx = await requireMember();
  const d = parsed.data;
  await db.update(members).set({
    phone: d.phone || ctx.member.phone,
    email: d.email || null,
    address: d.address || null,
    emergencyContactName: d.emergencyContactName || null,
    emergencyContactPhone: d.emergencyContactPhone || null,
    updatedAt: new Date(),
  }).where(eq(members.id, ctx.member.id));
  revalidatePath("/me/profile");
  return { ok: true };
}

const reviewSchema = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().max(500).optional() });

export async function submitReview(input: z.input<typeof reviewSchema>): Promise<Result> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a rating 1–5" };
  const ctx = await requireMember();
  await db.insert(memberReviews).values({ gymId: ctx.gym.id, memberId: ctx.member.id, authorName: ctx.member.fullName, rating: parsed.data.rating, comment: parsed.data.comment || null });
  revalidatePath("/me");
  return { ok: true };
}

/** Member pays their own outstanding invoice via Razorpay. */
export async function startMyInvoiceCheckout(invoiceId: string): Promise<Result<CheckoutInfo>> {
  const ctx = await requireMember();
  if (!(await paymentsReady(ctx.gym.id))) return { ok: false, error: "Online payment isn't set up for this gym." };
  const invoice = await db.query.invoices.findFirst({ where: and(eq(invoices.gymId, ctx.gym.id), eq(invoices.id, invoiceId), eq(invoices.memberId, ctx.member.id)) });
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (invoice.duePaise <= 0) return { ok: false, error: "Already paid" };

  const pay = await resolvePaymentContext(ctx.gym.id);
  const order = await createOrder(
    { amountPaise: invoice.duePaise, receipt: invoice.number, notes: { invoiceId: invoice.id, gymId: ctx.gym.id, type: "invoice" } },
    { keyId: pay.keyId, keySecret: pay.keySecret },
  );
  await db.insert(payments).values({ gymId: ctx.gym.id, invoiceId: invoice.id, memberId: ctx.member.id, amountPaise: invoice.duePaise, method: "razorpay", status: "pending", razorpayOrderId: order.orderId });

  return { ok: true, data: { orderId: order.orderId, keyId: order.keyId, amountPaise: order.amountPaise, name: ctx.gym.name, description: `Invoice ${invoice.number}` } };
}

export async function verifyMyPayment(input: { orderId: string; paymentId: string; signature: string }): Promise<Result> {
  const ctx = await requireMember();
  const pay = await resolvePaymentContext(ctx.gym.id);
  if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature, pay.keySecret)) return { ok: false, error: "Signature verification failed" };
  const pending = await db.query.payments.findFirst({ where: and(eq(payments.gymId, ctx.gym.id), eq(payments.razorpayOrderId, input.orderId), eq(payments.memberId, ctx.member.id)) });
  if (!pending) return { ok: false, error: "Order not found" };
  const res = await captureRazorpayPayment(input.orderId, input.paymentId);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/me/payments");
  revalidatePath("/me");
  return { ok: true };
}
