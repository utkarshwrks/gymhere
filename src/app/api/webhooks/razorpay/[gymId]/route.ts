import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { captureRazorpayPayment } from "@/lib/billing-core";
import { getGymPaymentWebhookSecret } from "@/lib/credentials/resolver";

export const dynamic = "force-dynamic";

/**
 * Tenant-mode Razorpay webhook for a specific gym. Verifies the payload with
 * THAT gym's stored webhook secret — a signature from another gym's secret is
 * rejected. Idempotent by payment (captureRazorpayPayment short-circuits).
 */
export async function POST(req: Request, { params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = await params;

  const secret = await getGymPaymentWebhookSecret(gymId);
  if (!secret) return NextResponse.json({ error: "No webhook secret for this gym" }, { status: 404 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
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
      // Ensure the order actually belongs to this gym before settling.
      const pending = await db.query.payments.findFirst({ where: eq(payments.razorpayOrderId, payment.order_id) });
      if (!pending || pending.gymId !== gymId) {
        return NextResponse.json({ error: "Order does not belong to this gym" }, { status: 404 });
      }
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
