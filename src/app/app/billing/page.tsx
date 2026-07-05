import type { Metadata } from "next";
import { requireGym } from "@/lib/auth";
import { listInvoices, pendingDues } from "@/lib/queries/billing";
import { listMembers } from "@/lib/queries/members";
import { BillingView } from "@/components/billing/billing-view";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ctx = await requireGym();
  const [invoices, dues, membersList] = await Promise.all([
    listInvoices(ctx.gym.id),
    pendingDues(ctx.gym.id),
    listMembers(ctx.gym.id),
  ]);

  const totalDue = dues.reduce((s, d) => s + d.duePaise, 0);
  const collected = invoices.reduce((s, i) => s + (i.totalPaise - i.duePaise), 0);

  return (
    <BillingView
      invoices={invoices}
      dues={dues}
      members={membersList.map((m) => ({ id: m.id, name: m.fullName }))}
      totalDuePaise={totalDue}
      collectedPaise={collected}
    />
  );
}
