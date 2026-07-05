import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { portalPayments } from "@/lib/queries/portal";
import { paymentsReady } from "@/lib/credentials/resolver";
import { PaymentsView } from "@/components/portal/payments-view";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function MemberPaymentsPage() {
  const ctx = await requireMember();
  const data = await portalPayments(ctx.gym.id, ctx.member.id);
  return <PaymentsView payments={data.payments} dueInvoices={data.dueInvoices} razorpayEnabled={await paymentsReady(ctx.gym.id)} name={ctx.member.fullName} />;
}
