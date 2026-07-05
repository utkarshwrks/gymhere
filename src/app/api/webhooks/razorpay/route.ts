import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { captureRazorpayPayment } from "@/lib/billing-core";
import { isConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Single Razorpay webhook. Verifies the payload signature, then captures the
 * matching pending payment. Idempotent — a replayed event.id is a no-op because
 * captureRazorpayPayment short-circuits once a payment is captured.
 */
export async function POST(req: Request) {
  if (!isConfigured.razorpay) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
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

  // Acknowledge unhandled events so Razorpay doesn't retry them.
  return NextResponse.json({ ok: true, ignored: event.event });
}

interface RazorpayEvent {
  event: string;
  payload?: {
    payment?: { entity?: { id: string; order_id: string; amount: number } };
  };
}
