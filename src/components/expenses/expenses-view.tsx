"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createExpense, createExpenseType } from "@/lib/actions/expenses";
import { formatDate, formatMoney, formatMoneyCompact } from "@/lib/format";

interface Expense { id: string; title: string; amountPaise: number; spentOn: string; method: string; type: string | null }
interface Opt { id: string; name: string }

export function ExpensesView({ expenses, types }: { expenses: Expense[]; types: Opt[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const total = expenses.reduce((s, e) => s + e.amountPaise, 0);

  return (
    <div className="space-y-6">
      <Link href="/app/billing" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Billing
      </Link>
      <PageHeader title="Expenses" description="Track everything the gym spends.">
        <NewTypeButton onDone={() => router.refresh()} />
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New expense</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard index={0} label="Total spent" value={total} format={formatMoneyCompact} icon={Wallet} />
        <StatCard index={1} label="Entries" value={expenses.length} icon={Wallet} />
        <StatCard index={2} label="Categories" value={types.length} icon={Wallet} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {expenses.length === 0 ? (
            <EmptyState icon={Wallet} title="No expenses yet" description="Log rent, salaries, utilities and more to see where money goes." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground">{e.type ?? "—"}</TableCell>
                    <TableCell>{formatDate(e.spentOn)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{e.method}</TableCell>
                    <TableCell className="text-right tnum">{formatMoney(e.amountPaise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ExpenseDialog open={open} onOpenChange={setOpen} types={types} onDone={() => router.refresh()} />
    </div>
  );
}

function NewTypeButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>Category</Button>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent" />
        <DialogFooter><Button onClick={async () => { const r = await createExpenseType(name); if (r.ok) { toast.success("Category added"); setName(""); setOpen(false); onDone(); } else toast.error(r.error); }}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({ open, onOpenChange, types, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; types: Opt[]; onDone: () => void }) {
  const [typeId, setTypeId] = React.useState("");
  const [method, setMethod] = React.useState<"cash" | "upi" | "card" | "bank">("cash");
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createExpense({ title: String(fd.get("title")), amountRupees: Number(fd.get("amount")), spentOn: String(fd.get("date")), expenseTypeId: typeId, method, note: String(fd.get("note") || "") });
    setPending(false);
    if (r.ok) { toast.success("Expense added"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input name="title" required placeholder="November rent" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Amount (₹)</Label><Input name="amount" type="number" min={0} required /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Mode</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Note</Label><Input name="note" /></div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add expense"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
