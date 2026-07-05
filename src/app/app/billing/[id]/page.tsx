import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireGym } from "@/lib/auth";
import { getInvoice } from "@/lib/queries/billing";
import { paymentsReady } from "@/lib/credentials/resolver";
import { InvoiceDetail } from "@/components/billing/invoice-detail";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireGym();
  const data = await getInvoice(ctx.gym.id, id);
  if (!data) notFound();

  const { invoice, items, payments, member } = data;

  return (
    <InvoiceDetail
      invoice={{
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        subtotalPaise: invoice.subtotalPaise,
        discountPaise: invoice.discountPaise,
        taxPercent: invoice.taxPercent,
        taxPaise: invoice.taxPaise,
        totalPaise: invoice.totalPaise,
        amountPaidPaise: invoice.amountPaidPaise,
        duePaise: invoice.duePaise,
        issuedOn: invoice.issuedOn,
        notes: invoice.notes,
      }}
      items={items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPricePaise: i.unitPricePaise, amountPaise: i.amountPaise }))}
      payments={payments.map((p) => ({ id: p.id, amountPaise: p.amountPaise, method: p.method, createdAt: p.createdAt.toISOString() }))}
      memberName={member?.fullName ?? null}
      memberContact={{ email: member?.email ?? undefined, phone: member?.phone ?? undefined }}
      razorpayEnabled={await paymentsReady(ctx.gym.id)}
    />
  );
}
