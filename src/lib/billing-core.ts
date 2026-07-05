import { addMonths } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { gymSubscriptions, invoices, payments } from "@/lib/db/schema";
import { recordCash } from "@/lib/db/cashbook";

export type CaptureResult = { ok: true; kind: "invoice" | "subscription" | "noop" } | { ok: false; error: string };

/**
 * Atomically add a captured amount to an invoice and recompute dues/status.
 * The increment is done in SQL (no read-modify-write) so concurrent payments on
 * the same invoice can't clobber each other. Shared by manual + Razorpay paths.
 */
export async function settleInvoiceAmount(invoiceId: string, amountPaise: number): Promise<void> {
  await db
    .update(invoices)
    .set({ amountPaidPaise: sql`${invoices.amountPaidPaise} + ${amountPaise}` })
    .where(eq(invoices.id, invoiceId));
  const fresh = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!fresh) return;
  const due = Math.max(0, fresh.totalPaise - fresh.amountPaidPaise);
  await db
    .update(invoices)
    .set({ duePaise: due, status: due <= 0 ? "paid" : "partial" })
    .where(eq(invoices.id, invoiceId));
}

/**
 * Convert a pending Razorpay payment (created at checkout) into a captured one,
 * then settle the linked invoice or activate the gym subscription.
 *
 * Idempotent AND race-safe: the pending→captured transition is a conditional
 * UPDATE (`WHERE status='pending'`), so if a replayed webhook and the browser
 * callback arrive together, exactly one wins the claim and applies the effects;
 * the loser is a no-op.
 */
export async function captureRazorpayPayment(orderId: string, paymentId: string): Promise<CaptureResult> {
  const pending = await db.query.payments.findFirst({ where: eq(payments.razorpayOrderId, orderId) });
  if (!pending) return { ok: false, error: "Unknown order" };
  if (pending.status === "captured") return { ok: true, kind: "noop" };

  // Atomically claim the pending row. Only one caller succeeds.
  const claimed = await db
    .update(payments)
    .set({ status: "captured", razorpayPaymentId: paymentId, reference: paymentId })
    .where(and(eq(payments.id, pending.id), eq(payments.status, "pending")))
    .returning();
  if (claimed.length === 0) return { ok: true, kind: "noop" };

  // Invoice settlement.
  if (pending.invoiceId) {
    await settleInvoiceAmount(pending.invoiceId, pending.amountPaise);
    const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, pending.invoiceId) });
    await recordCash({
      gymId: pending.gymId,
      direction: "in",
      source: "payment",
      refId: pending.invoiceId,
      amountPaise: pending.amountPaise,
      description: `Razorpay payment for ${invoice?.number ?? "invoice"}`,
    });
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
