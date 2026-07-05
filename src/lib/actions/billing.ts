"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { invoices, payments, platformPlans } from "@/lib/db/schema";
import { createOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { captureRazorpayPayment } from "@/lib/billing-core";
import { isConfigured } from "@/lib/env";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export interface CheckoutInfo {
  orderId: string;
  keyId: string;
  amountPaise: number;
  name: string;
  description: string;
}

/** Create a Razorpay order for an invoice's outstanding amount + a pending payment row. */
export async function startInvoiceCheckout(invoiceId: string): Promise<Result<CheckoutInfo>> {
  if (!isConfigured.razorpay) return { ok: false, error: "Razorpay is not configured (add test keys)." };
  const ctx = await requireGym();
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.gymId, ctx.gym.id), eq(invoices.id, invoiceId)),
  });
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (invoice.duePaise <= 0) return { ok: false, error: "Invoice is already paid" };

  const order = await createOrder({
    amountPaise: invoice.duePaise,
    receipt: invoice.number,
    notes: { invoiceId: invoice.id, gymId: ctx.gym.id, type: "invoice" },
  });

  await db.insert(payments).values({
    gymId: ctx.gym.id,
    invoiceId: invoice.id,
    memberId: invoice.memberId,
    amountPaise: invoice.duePaise,
    method: "razorpay",
    status: "pending",
    razorpayOrderId: order.orderId,
  });

  return {
    ok: true,
    data: { orderId: order.orderId, keyId: order.keyId, amountPaise: order.amountPaise, name: ctx.gym.name, description: `Invoice ${invoice.number}` },
  };
}

/** Platform → gym: checkout to activate a SaaS tier when the trial ends / on upgrade. */
export async function startSubscriptionCheckout(planKey: string): Promise<Result<CheckoutInfo>> {
  if (!isConfigured.razorpay) return { ok: false, error: "Razorpay is not configured (add test keys)." };
  const ctx = await requireGym();
  const plan = await db.query.platformPlans.findFirst({ where: eq(platformPlans.key, planKey) });
  if (!plan) return { ok: false, error: "Plan not found" };

  const order = await createOrder({
    amountPaise: plan.pricePaise,
    receipt: `sub-${ctx.gym.id.slice(0, 8)}`,
    notes: { type: "gym_subscription", gymId: ctx.gym.id, planId: plan.id },
  });

  await db.insert(payments).values({
    gymId: ctx.gym.id,
    amountPaise: plan.pricePaise,
    method: "razorpay",
    status: "pending",
    razorpayOrderId: order.orderId,
    note: `gym_subscription:${plan.id}`,
  });

  return {
    ok: true,
    data: { orderId: order.orderId, keyId: order.keyId, amountPaise: order.amountPaise, name: "GymHere", description: `${plan.name} plan` },
  };
}

/** Client callback after Razorpay Checkout succeeds — verify signature then capture. */
export async function verifyAndCapture(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<Result> {
  const ctx = await requireGym();
  if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
    return { ok: false, error: "Signature verification failed" };
  }
  const pending = await db.query.payments.findFirst({
    where: and(eq(payments.gymId, ctx.gym.id), eq(payments.razorpayOrderId, input.orderId)),
  });
  if (!pending) return { ok: false, error: "Order not found for this gym" };

  const res = await captureRazorpayPayment(input.orderId, input.paymentId);
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath("/app/billing");
  revalidatePath("/app/settings/billing");
  revalidatePath("/app");
  return { ok: true };
}
