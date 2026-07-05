import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { captureRazorpayPayment } from "@/lib/billing-core";
import { getPlatformPaymentContext } from "@/lib/credentials/resolver";

export const dynamic = "force-dynamic";

/**
 * Platform Razorpay webhook. Handles platform-billing (SaaS subscription) events
 * and platform-mode gym→member payments — all signed with the PLATFORM webhook
 * secret. Tenant-mode gyms use /api/webhooks/razorpay/[gymId] instead.
 * Idempotent: captureRazorpayPayment short-circuits an already-captured payment.
 */
export async function POST(req: Request) {
  const webhookSecret = getPlatformPaymentContext().webhookSecret;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && payment.id) {
      const res = await captureRazorpayPayment(payment.order_id, payment.id);
      return NextResponse.json({ ok: true, result: res });
    }
  }

  return NextResponse.json({ ok: true, ignored: event.event });
}

interface RazorpayEvent {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id: string; amount: number } } };
}
