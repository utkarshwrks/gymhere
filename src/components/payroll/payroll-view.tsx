"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { recordStaffPayment, runSalary } from "@/lib/actions/payroll";
import { setSalaryStructure } from "@/lib/actions/staff";
import { formatMoney, toRupees } from "@/lib/format";

interface Structure { monthlyBasePaise: number; standardDays: number; ptIncentivePerSessionPaise: number }
interface StaffMember { userId: string; name: string; structure: Structure | null }
interface Run { id: string; staffUserId: string; month: string; workedDays: number; basePaise: number; bonusPaise: number; ptIncentivePaise: number; advanceDeductionPaise: number; payablePaise: number; status: string }

export function PayrollView({ staff, runs }: { staff: StaffMember[]; runs: Run[] }) {
  const router = useRouter();
  const nameByUser = new Map(staff.map((s) => [s.userId, s.name]));

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" description="Salary structures, monthly runs and payments." />

      <Card>
        <CardHeader><CardTitle>Team salaries</CardTitle></CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <EmptyState icon={Wallet} title="No staff" description="Add staff on the Staff page, then set salaries here." />
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <StaffPayRow key={s.userId} staff={s} onDone={() => router.refresh()} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {runs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Salary history</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Month</TableHead><TableHead className="text-right">Days</TableHead><TableHead className="text-right">Base</TableHead><TableHead className="text-right">Bonus</TableHead><TableHead className="text-right">PT</TableHead><TableHead className="text-right">Advance</TableHead><TableHead className="text-right">Payable</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{nameByUser.get(r.staffUserId) ?? "—"}</TableCell>
                    <TableCell>{r.month}</TableCell>
                    <TableCell className="text-right tnum">{r.workedDays}</TableCell>
                    <TableCell className="text-right tnum">{formatMoney(r.basePaise)}</TableCell>
                    <TableCell className="text-right tnum">{formatMoney(r.bonusPaise)}</TableCell>
                    <TableCell className="text-right tnum">{formatMoney(r.ptIncentivePaise)}</TableCell>
                    <TableCell className="text-right tnum">− {formatMoney(r.advanceDeductionPaise)}</TableCell>
                    <TableCell className="text-right tnum font-semibold">{formatMoney(r.payablePaise)}</TableCell>
                    <TableCell><Badge variant={r.status === "paid" ? "success" : "warning"} className="capitalize">{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {r.status !== "paid" && <PayButton runId={r.id} staffUserId={r.staffUserId} payablePaise={r.payablePaise} onDone={() => router.refresh()} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StaffPayRow({ staff, onDone }: { staff: StaffMember; onDone: () => void }) {
  const [structOpen, setStructOpen] = React.useState(false);
  const [runOpen, setRunOpen] = React.useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{staff.name}</p>
        <p className="text-xs text-muted-foreground">
          {staff.structure ? `Base ${formatMoney(staff.structure.monthlyBasePaise)}/mo · ${staff.structure.standardDays} days` : "No salary structure set"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setStructOpen(true)}>{staff.structure ? "Edit structure" : "Set structure"}</Button>
        <Button size="sm" disabled={!staff.structure} onClick={() => setRunOpen(true)}>Run salary</Button>
      </div>
      <StructureDialog open={structOpen} onOpenChange={setStructOpen} staff={staff} onDone={onDone} />
      {staff.structure && <RunDialog open={runOpen} onOpenChange={setRunOpen} staff={staff} onDone={onDone} />}
    </div>
  );
}

function StructureDialog({ open, onOpenChange, staff, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; staff: StaffMember; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await setSalaryStructure({ staffUserId: staff.userId, monthlyBaseRupees: Number(fd.get("base")), standardDays: Number(fd.get("days")), ptIncentivePerSessionRupees: Number(fd.get("pt") || 0) });
    setPending(false);
    if (r.ok) { toast.success("Structure saved"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Salary structure · {staff.name}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Monthly base (₹)</Label><Input name="base" type="number" min={0} required defaultValue={staff.structure ? toRupees(staff.structure.monthlyBasePaise) : ""} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Standard days</Label><Input name="days" type="number" min={1} max={31} required defaultValue={staff.structure?.standardDays ?? 26} /></div>
            <div className="space-y-1.5"><Label>PT incentive / session (₹)</Label><Input name="pt" type="number" min={0} defaultValue={staff.structure ? toRupees(staff.structure.ptIncentivePerSessionPaise) : 0} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save structure"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RunDialog({ open, onOpenChange, staff, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; staff: StaffMember; onDone: () => void }) {
  const s = staff.structure!;
  const [worked, setWorked] = React.useState(s.standardDays);
  const [pt, setPt] = React.useState(0);
  const [bonus, setBonus] = React.useState(0);
  const [advance, setAdvance] = React.useState(0);
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const [pending, setPending] = React.useState(false);

  const perDay = Math.round(s.monthlyBasePaise / Math.max(1, s.standardDays));
  const base = perDay * worked;
  const ptInc = pt * s.ptIncentivePerSessionPaise;
  const payable = Math.max(0, base + bonus * 100 + ptInc - advance * 100);

  async function run() {
    setPending(true);
    const r = await runSalary({ staffUserId: staff.userId, month, workedDays: worked, ptSessions: pt, bonusRupees: bonus, advanceRupees: advance });
    setPending(false);
    if (r.ok) { toast.success(`Salary run: ${formatMoney(r.data!.payablePaise)}`); onOpenChange(false); onDone(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Run salary · {staff.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Month</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Worked days</Label><Input type="number" min={0} max={31} value={worked} onChange={(e) => setWorked(Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>PT sessions</Label><Input type="number" min={0} value={pt} onChange={(e) => setPt(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Bonus (₹)</Label><Input type="number" min={0} value={bonus} onChange={(e) => setBonus(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Advance (₹)</Label><Input type="number" min={0} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} /></div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Base ({worked} × {formatMoney(perDay)})</span><span className="tnum">{formatMoney(base)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">PT incentive</span><span className="tnum">{formatMoney(ptInc)}</span></div>
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Payable</span><span className="tnum">{formatMoney(payable)}</span></div>
          </div>
        </div>
        <DialogFooter><Button onClick={run} disabled={pending}>{pending ? "Running…" : "Finalize run"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayButton({ runId, staffUserId, payablePaise, onDone }: { runId: string; staffUserId: string; payablePaise: number; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={async () => { setPending(true); const r = await recordStaffPayment({ salaryRunId: runId, staffUserId, amountRupees: payablePaise / 100 }); setPending(false); if (r.ok) { toast.success("Paid"); onDone(); } else toast.error(r.error); }}
    >
      Pay {formatMoney(payablePaise)}
    </Button>
  );
}
