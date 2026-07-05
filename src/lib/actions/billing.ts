"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { invoices, payments, platformPlans } from "@/lib/db/schema";
import { createOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { captureRazorpayPayment } from "@/lib/billing-core";
import {
  getPlatformPaymentContext,
  paymentsReady,
  resolvePaymentContext,
} from "@/lib/credentials/resolver";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export interface CheckoutInfo {
  orderId: string;
  keyId: string;
  amountPaise: number;
  name: string;
  description: string;
}

/** Gym → member: create a Razorpay order using the gym's resolved credentials. */
export async function startInvoiceCheckout(invoiceId: string): Promise<Result<CheckoutInfo>> {
  const ctx = await requireGym();
  if (!(await paymentsReady(ctx.gym.id))) {
    return { ok: false, error: "Online payments aren't set up for this gym yet." };
  }
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.gymId, ctx.gym.id), eq(invoices.id, invoiceId)),
  });
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (invoice.duePaise <= 0) return { ok: false, error: "Invoice is already paid" };

  const pay = await resolvePaymentContext(ctx.gym.id);
  const order = await createOrder(
    { amountPaise: invoice.duePaise, receipt: invoice.number, notes: { invoiceId: invoice.id, gymId: ctx.gym.id, type: "invoice" } },
    { keyId: pay.keyId, keySecret: pay.keySecret },
  );

  await db.insert(payments).values({
    gymId: ctx.gym.id,
    invoiceId: invoice.id,
    memberId: invoice.memberId,
    amountPaise: invoice.duePaise,
    method: "razorpay",
    status: "pending",
    razorpayOrderId: order.orderId,
  });

  return { ok: true, data: { orderId: order.orderId, keyId: order.keyId, amountPaise: order.amountPaise, name: ctx.gym.name, description: `Invoice ${invoice.number}` } };
}

/** Platform → gym: SaaS tier checkout ALWAYS uses platform Razorpay keys. */
export async function startSubscriptionCheckout(planKey: string): Promise<Result<CheckoutInfo>> {
  const ctx = await requireGym();
  const plat = getPlatformPaymentContext();
  if (!plat.keyId || !plat.keySecret) return { ok: false, error: "Platform payments aren't configured." };

  const plan = await db.query.platformPlans.findFirst({ where: eq(platformPlans.key, planKey) });
  if (!plan) return { ok: false, error: "Plan not found" };

  const order = await createOrder(
    { amountPaise: plan.pricePaise, receipt: `sub-${ctx.gym.id.slice(0, 8)}`, notes: { type: "gym_subscription", gymId: ctx.gym.id, planId: plan.id } },
    { keyId: plat.keyId, keySecret: plat.keySecret },
  );

  await db.insert(payments).values({
    gymId: ctx.gym.id,
    amountPaise: plan.pricePaise,
    method: "razorpay",
    status: "pending",
    razorpayOrderId: order.orderId,
    note: `gym_subscription:${plan.id}`,
  });

  return { ok: true, data: { orderId: order.orderId, keyId: order.keyId, amountPaise: order.amountPaise, name: "GymHere", description: `${plan.name} plan` } };
}

/** Client callback after Checkout succeeds — verify with the right secret, then capture. */
export async function verifyAndCapture(input: { orderId: string; paymentId: string; signature: string }): Promise<Result> {
  const ctx = await requireGym();
  const pending = await db.query.payments.findFirst({
    where: and(eq(payments.gymId, ctx.gym.id), eq(payments.razorpayOrderId, input.orderId)),
  });
  if (!pending) return { ok: false, error: "Order not found for this gym" };

  // Subscription payments are signed with platform keys; invoice payments with
  // the gym's resolved keys.
  const isSubscription = pending.note?.startsWith("gym_subscription:") ?? false;
  let keySecret: string;
  try {
    keySecret = isSubscription ? getPlatformPaymentContext().keySecret : (await resolvePaymentContext(ctx.gym.id)).keySecret;
  } catch {
    return { ok: false, error: "Payment credentials are no longer available for this gym." };
  }

  if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature, keySecret)) {
    return { ok: false, error: "Signature verification failed" };
  }

  const res = await captureRazorpayPayment(input.orderId, input.paymentId);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/app/billing");
  revalidatePath("/app/settings/billing");
  revalidatePath("/app");
  return { ok: true };
}
