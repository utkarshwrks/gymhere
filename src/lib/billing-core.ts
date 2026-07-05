import { addMonths } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gymSubscriptions, invoices, payments } from "@/lib/db/schema";
import { recordCash } from "@/lib/db/cashbook";

export type CaptureResult = { ok: true; kind: "invoice" | "subscription" | "noop" } | { ok: false; error: string };

/**
 * Convert a pending Razorpay payment (created at checkout) into a captured one,
 * then settle the linked invoice or activate the gym subscription. Idempotent:
 * a replayed webhook or double callback returns without double-applying.
 */
export async function captureRazorpayPayment(orderId: string, paymentId: string): Promise<CaptureResult> {
  const pending = await db.query.payments.findFirst({
    where: eq(payments.razorpayOrderId, orderId),
  });
  if (!pending) return { ok: false, error: "Unknown order" };
  if (pending.status === "captured") return { ok: true, kind: "noop" };

  await db
    .update(payments)
    .set({ status: "captured", razorpayPaymentId: paymentId, reference: paymentId })
    .where(eq(payments.id, pending.id));

  // Invoice settlement.
  if (pending.invoiceId) {
    const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, pending.invoiceId) });
    if (invoice) {
      const newPaid = invoice.amountPaidPaise + pending.amountPaise;
      const due = Math.max(0, invoice.totalPaise - newPaid);
      await db
        .update(invoices)
        .set({ amountPaidPaise: newPaid, duePaise: due, status: due <= 0 ? "paid" : "partial" })
        .where(eq(invoices.id, invoice.id));
      await recordCash({
        gymId: pending.gymId,
        direction: "in",
        source: "payment",
        refId: invoice.id,
        amountPaise: pending.amountPaise,
        description: `Razorpay payment for ${invoice.number}`,
      });
    }
    return { ok: true, kind: "invoice" };
  }

  // Platform → gym subscription activation.
  if (pending.note?.startsWith("gym_subscription:")) {
    const planId = pending.note.split(":")[1];
    const sub = await db.query.gymSubscriptions.findFirst({ where: eq(gymSubscriptions.gymId, pending.gymId) });
    if (sub) {
      await db
        .update(gymSubscriptions)
        .set({ status: "active", planId, currentPeriodEnd: addMonths(new Date(), 1), updatedAt: new Date() })
        .where(eq(gymSubscriptions.id, sub.id));
    }
    return { ok: true, kind: "subscription" };
  }

  return { ok: true, kind: "noop" };
}
