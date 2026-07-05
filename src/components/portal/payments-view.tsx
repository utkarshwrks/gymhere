"use client";

import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RazorpayButton } from "@/components/billing/razorpay-button";
import { startMyInvoiceCheckout, verifyMyPayment } from "@/lib/actions/member";
import { formatDateTime, formatMoney } from "@/lib/format";

interface Payment { id: string; amountPaise: number; method: string; createdAt: string }
interface DueInvoice { id: string; number: string; duePaise: number }

export function PaymentsView({
  payments,
  dueInvoices,
  razorpayEnabled,
  name,
}: {
  payments: Payment[];
  dueInvoices: DueInvoice[];
  razorpayEnabled: boolean;
  name: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Your payment history and anything outstanding." />

      {dueInvoices.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending dues</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dueInvoices.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{d.number}</p>
                  <p className="tnum text-sm text-destructive">{formatMoney(d.duePaise)} due</p>
                </div>
                {razorpayEnabled ? (
                  <RazorpayButton
                    start={() => startMyInvoiceCheckout(d.id)}
                    verify={verifyMyPayment}
                    label={`Pay ${formatMoney(d.duePaise)}`}
                    prefill={{ name }}
                    size="sm"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Pay at the front desk</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments yet" description="Your receipts will show up here." />
          ) : (
            <ul className="divide-y">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="capitalize text-sm">{p.method}</span>
                  <div className="text-right">
                    <p className="tnum font-medium">{formatMoney(p.amountPaise)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
