import crypto from "node:crypto";
import { env, isConfigured } from "@/lib/env";

/**
 * Razorpay stays in TEST mode; all keys come from env. Production is a key swap
 * (rzp_live_… + RAZORPAY_MODE=live) with no code change.
 */
export interface RazorpayOrder {
  orderId: string;
  amountPaise: number;
  keyId: string;
  currency: "INR";
}

export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!isConfigured.razorpay) throw new Error("Razorpay is not configured");
  const { default: Razorpay } = await import("razorpay");
  const rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! });
  const order = await rzp.orders.create({
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes,
  });
  return {
    orderId: order.id,
    amountPaise: Number(order.amount),
    keyId: env.RAZORPAY_KEY_ID!,
    currency: "INR",
  };
}

/** Verify the Checkout callback signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, signature);
}

/** Verify a webhook payload: HMAC_SHA256(rawBody, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
