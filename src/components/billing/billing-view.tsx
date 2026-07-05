"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { createInvoice } from "@/lib/actions/invoices";
import { sendDueReminder } from "@/lib/actions/invoices";
import { formatDate, formatMoney, formatMoneyCompact } from "@/lib/format";
import type { InvoiceListRow } from "@/lib/queries/billing";

const statusVariant: Record<string, "success" | "warning" | "muted" | "destructive" | "secondary"> = {
  paid: "success",
  partial: "warning",
  sent: "secondary",
  draft: "muted",
  overdue: "destructive",
  cancelled: "muted",
};

interface MemberOpt { id: string; name: string }

export function BillingView({
  invoices,
  dues,
  members,
  totalDuePaise,
  collectedPaise,
}: {
  invoices: InvoiceListRow[];
  dues: InvoiceListRow[];
  members: MemberOpt[];
  totalDuePaise: number;
  collectedPaise: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const columns: ColumnDef<InvoiceListRow>[] = [
    {
      accessorKey: "number",
      header: "Invoice",
      cell: ({ row }) => (
        <Link href={`/app/billing/${row.original.id}`} className="font-medium hover:underline">
          {row.original.number}
        </Link>
      ),
    },
    { accessorKey: "memberName", header: "Member", cell: ({ row }) => row.original.memberName ?? <span className="text-muted-foreground">Walk-in</span> },
    { accessorKey: "totalPaise", header: "Total", cell: ({ row }) => <span className="tnum">{formatMoney(row.original.totalPaise)}</span> },
    { accessorKey: "duePaise", header: "Due", cell: ({ row }) => <span className="tnum">{row.original.duePaise > 0 ? formatMoney(row.original.duePaise) : "—"}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={statusVariant[row.original.status] ?? "muted"} className="capitalize">{row.original.status}</Badge> },
    { accessorKey: "issuedOn", header: "Issued", cell: ({ row }) => formatDate(row.original.issuedOn) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Invoices, payments and outstanding dues.">
        <Button asChild variant="outline"><Link href="/app/expenses">Expenses</Link></Button>
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New invoice</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard index={0} label="Invoices" value={invoices.length} icon={FileText} />
        <StatCard index={1} label="Collected" value={collectedPaise} format={formatMoneyCompact} icon={FileText} />
        <StatCard index={2} label="Outstanding" value={totalDuePaise} format={formatMoneyCompact} icon={FileText} />
        <StatCard index={3} label="Pending invoices" value={dues.length} icon={FileText} />
      </div>

      {dues.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 text-sm font-semibold">Pending dues</div>
          <ul className="divide-y">
            {dues.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <Link href={`/app/billing/${d.id}`} className="text-sm font-medium hover:underline">{d.number}</Link>
                  <span className="ml-2 text-xs text-muted-foreground">{d.memberName ?? "Walk-in"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-sm font-medium">{formatMoney(d.duePaise)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const r = await sendDueReminder(d.id);
                      if (r.ok) toast.success("Reminder sent"); else toast.error(r.error);
                    }}
                  >
                    <Mail className="size-4" /> Remind
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DataTable
        columns={columns}
        data={invoices}
        searchKey="number"
        searchPlaceholder="Search invoices…"
        emptyState={
          <EmptyState icon={FileText} title="No invoices yet" description="Raise your first invoice to start collecting payments." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New invoice</Button>} />
        }
      />

      <NewInvoiceDialog open={open} onOpenChange={setOpen} members={members} onDone={() => router.refresh()} />
    </div>
  );
}

interface LineItem { description: string; quantity: number; unitPriceRupees: number }

function NewInvoiceDialog({
  open,
  onOpenChange,
  members,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: MemberOpt[];
  onDone: () => void;
}) {
  const [memberId, setMemberId] = React.useState("");
  const [taxPercent, setTaxPercent] = React.useState(0);
  const [discount, setDiscount] = React.useState(0);
  const [items, setItems] = React.useState<LineItem[]>([{ description: "", quantity: 1, unitPriceRupees: 0 }]);
  const [pending, setPending] = React.useState(false);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPriceRupees, 0);
  const taxable = Math.max(0, subtotal - discount);
  const total = taxable + (taxable * taxPercent) / 100;

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function submit() {
    if (items.every((i) => !i.description)) return toast.error("Add at least one line item.");
    setPending(true);
    const r = await createInvoice({
      memberId: memberId || "",
      items: items.filter((i) => i.description),
      taxPercent,
      discountRupees: discount,
      markSent: true,
    });
    setPending(false);
    if (r.ok) { toast.success("Invoice created"); onOpenChange(false); setItems([{ description: "", quantity: 1, unitPriceRupees: 0 }]); onDone(); }
    else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Member (optional — leave blank for walk-in)</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Walk-in" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Line items</Label>
            {items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} className="flex-1" />
                <Input type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} className="w-16" />
                <Input type="number" min={0} placeholder="₹" value={it.unitPriceRupees || ""} onChange={(e) => setItem(i, { unitPriceRupees: Number(e.target.value) })} className="w-28" />
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unitPriceRupees: 0 }])}>
              <Plus className="size-4" /> Add line
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Discount (₹)</Label><Input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Tax (%)</Label><Input type="number" min={0} max={100} value={taxPercent || ""} onChange={(e) => setTaxPercent(Number(e.target.value))} /></div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tnum">{formatMoney(subtotal * 100)}</span></div>
            <div className="mt-1 flex justify-between font-semibold"><span>Total</span><span className="tnum">{formatMoney(Math.round(total * 100))}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>{pending ? "Creating…" : "Create invoice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
