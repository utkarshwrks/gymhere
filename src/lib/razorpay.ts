import crypto from "node:crypto";

/**
 * Stateless Razorpay adapter — all credentials are INJECTED by the caller, which
 * obtains them from the credential resolver (platform vs tenant). This module
 * never reads env keys directly.
 */
export interface RazorpayOrder {
  orderId: string;
  amountPaise: number;
  keyId: string;
  currency: "INR";
}

export async function createOrder(
  input: { amountPaise: number; receipt: string; notes?: Record<string, string> },
  creds: { keyId: string; keySecret: string },
): Promise<RazorpayOrder> {
  if (!creds.keyId || !creds.keySecret) throw new Error("Razorpay credentials are not configured");
  const { default: Razorpay } = await import("razorpay");
  const rzp = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
  const order = await rzp.orders.create({
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes,
  });
  return { orderId: order.id, amountPaise: Number(order.amount), keyId: creds.keyId, currency: "INR" };
}

/** Verify the Checkout callback signature: HMAC_SHA256(order_id|payment_id, keySecret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  if (!keySecret) return false;
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeEqual(expected, signature);
}

/** Verify a webhook payload: HMAC_SHA256(rawBody, webhookSecret). */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  if (!webhookSecret) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

/** Lightweight credential check for the "Test connection" action (test-mode order fetch). */
export async function pingRazorpay(creds: { keyId: string; keySecret: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { default: Razorpay } = await import("razorpay");
    const rzp = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
    // A tiny authenticated call; throws on bad credentials.
    await rzp.orders.all({ count: 1 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Authentication failed" };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
