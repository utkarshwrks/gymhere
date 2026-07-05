"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RazorpayButton } from "@/components/billing/razorpay-button";
import { recordInvoicePayment } from "@/lib/actions/invoices";
import { startInvoiceCheckout } from "@/lib/actions/billing";
import { formatDate, formatDateTime, formatMoney, toRupees } from "@/lib/format";

interface InvoiceVM {
  id: string;
  number: string;
  status: string;
  subtotalPaise: number;
  discountPaise: number;
  taxPercent: string;
  taxPaise: number;
  totalPaise: number;
  amountPaidPaise: number;
  duePaise: number;
  issuedOn: string;
  notes: string | null;
}
interface Item { id: string; description: string; quantity: number; unitPricePaise: number; amountPaise: number }
interface Payment { id: string; amountPaise: number; method: string; createdAt: string }

const statusVariant: Record<string, "success" | "warning" | "muted" | "destructive" | "secondary"> = {
  paid: "success", partial: "warning", sent: "secondary", draft: "muted", overdue: "destructive", cancelled: "muted",
};

export function InvoiceDetail({
  invoice,
  items,
  payments,
  memberName,
  memberContact,
  razorpayEnabled,
}: {
  invoice: InvoiceVM;
  items: Item[];
  payments: Payment[];
  memberName: string | null;
  memberContact: { email?: string; phone?: string };
  razorpayEnabled: boolean;
}) {
  const [payOpen, setPayOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <Link href="/app/billing" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Billing
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{invoice.number}</h1>
            <Badge variant={statusVariant[invoice.status] ?? "muted"} className="capitalize">{invoice.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {memberName ?? "Walk-in"} · Issued {formatDate(invoice.issuedOn)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline"><Link href={`/app/billing/${invoice.id}/receipt`}><Printer className="size-4" /> Receipt</Link></Button>
          {invoice.duePaise > 0 && invoice.status !== "cancelled" && (
            <>
              <Button variant="outline" onClick={() => setPayOpen(true)}>Record payment</Button>
              {razorpayEnabled && (
                <RazorpayButton
                  start={() => startInvoiceCheckout(invoice.id)}
                  label="Collect online"
                  prefill={{ name: memberName ?? undefined, email: memberContact.email, contact: memberContact.phone }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell className="text-right tnum">{it.quantity}</TableCell>
                    <TableCell className="text-right tnum">{formatMoney(it.unitPricePaise)}</TableCell>
                    <TableCell className="text-right tnum">{formatMoney(it.amountPaise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <Row label="Subtotal" value={formatMoney(invoice.subtotalPaise)} />
              {invoice.discountPaise > 0 && <Row label="Discount" value={`− ${formatMoney(invoice.discountPaise)}`} />}
              {invoice.taxPaise > 0 && <Row label={`Tax (${Number(invoice.taxPercent)}%)`} value={formatMoney(invoice.taxPaise)} />}
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span className="tnum">{formatMoney(invoice.totalPaise)}</span></div>
              <Row label="Paid" value={formatMoney(invoice.amountPaidPaise)} />
              <div className="flex justify-between font-semibold text-foreground"><span>Due</span><span className="tnum">{formatMoney(invoice.duePaise)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <ul className="divide-y">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="capitalize">{p.method}</span>
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

      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} invoiceId={invoice.id} duePaise={invoice.duePaise} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="tnum">{value}</span></div>;
}

function RecordPaymentDialog({ open, onOpenChange, invoiceId, duePaise }: { open: boolean; onOpenChange: (v: boolean) => void; invoiceId: string; duePaise: number }) {
  const router = useRouter();
  const [amount, setAmount] = React.useState(toRupees(duePaise));
  const [method, setMethod] = React.useState<"cash" | "upi" | "card" | "bank">("cash");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => setAmount(toRupees(duePaise)), [duePaise, open]);

  async function run() {
    setPending(true);
    const r = await recordInvoicePayment({ invoiceId, amountRupees: amount, method });
    setPending(false);
    if (r.ok) { toast.success("Payment recorded"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Amount (₹)</Label><Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Partial payments are allowed — the balance stays as dues.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={pending || amount <= 0}>{pending ? "Saving…" : "Record"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
