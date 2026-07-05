import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireGym } from "@/lib/auth";
import { getInvoice } from "@/lib/queries/billing";
import { Button } from "@/components/ui/button";
import { ReceiptDownload } from "@/components/billing/receipt-pdf";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireGym();
  const data = await getInvoice(ctx.gym.id, id);
  if (!data) notFound();
  const { invoice, items, member } = data;

  const receiptData = {
    gymName: ctx.gym.name,
    number: invoice.number,
    memberName: member?.fullName ?? "Walk-in",
    issuedOn: formatDate(invoice.issuedOn),
    items: items.map((i) => ({ description: i.description, quantity: i.quantity, amountPaise: i.amountPaise })),
    subtotalPaise: invoice.subtotalPaise,
    discountPaise: invoice.discountPaise,
    taxPaise: invoice.taxPaise,
    totalPaise: invoice.totalPaise,
    paidPaise: invoice.amountPaidPaise,
    duePaise: invoice.duePaise,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm"><Link href={`/app/billing/${id}`}><ArrowLeft className="size-4" /> Invoice</Link></Button>
        <ReceiptDownload data={receiptData} />
      </div>

      <div className="rounded-lg border bg-card p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">{ctx.gym.name}</h1>
            <p className="text-sm text-muted-foreground">Payment receipt</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{invoice.number}</p>
            <p className="text-muted-foreground">{formatDate(invoice.issuedOn)}</p>
          </div>
        </div>

        <div className="my-6 border-t" />
        <p className="text-sm"><span className="text-muted-foreground">Billed to:</span> {member?.fullName ?? "Walk-in"}</p>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-right tnum">{it.quantity}</td>
                <td className="py-2 text-right tnum">{formatMoney(it.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tnum">{formatMoney(invoice.subtotalPaise)}</span></div>
          {invoice.discountPaise > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="tnum">− {formatMoney(invoice.discountPaise)}</span></div>}
          {invoice.taxPaise > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax</span><span className="tnum">{formatMoney(invoice.taxPaise)}</span></div>}
          <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span className="tnum">{formatMoney(invoice.totalPaise)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Paid</span><span className="tnum">{formatMoney(invoice.amountPaidPaise)}</span></div>
          <div className="flex justify-between font-semibold"><span>Due</span><span className="tnum">{formatMoney(invoice.duePaise)}</span></div>
        </div>

        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          Terms &amp; conditions: Fees once paid are non-refundable. This is a computer-generated receipt and needs no signature.
        </p>
      </div>
    </div>
  );
}
