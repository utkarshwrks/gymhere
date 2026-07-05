"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Mail,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/shared/status-dot";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { WeightChart, type WeightPoint } from "@/components/members/weight-chart";
import {
  cancelMember,
  checkInMember,
  freezeMember,
  logWeight,
  renewMember,
  unfreezeMember,
  updateMemberNotes,
} from "@/lib/actions/members";
import { inviteMember } from "@/lib/actions/attendance";
import { deriveStatus, statusLabel, statusToTone } from "@/lib/membership";
import { formatDate, formatDateTime, formatMoney, initials } from "@/lib/format";

export interface ProfileMember {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dob: string | null;
  address: string | null;
  idProofNo: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  heightCm: string | null;
  weightKg: string | null;
  photoUrl: string | null;
  status: string;
  joinDate: string;
  notes: string | null;
  batchName: string | null;
}
export interface ProfileSub {
  id: string;
  planName: string;
  startDate: string;
  endDate: string;
  pricePaise: number;
  status: string;
}
type PlanOpt = { id: string; name: string; durationMonths: number; pricePaise: number };

export function MemberProfile({
  member,
  subscriptions,
  currentEndDate,
  attendance,
  weightLogs,
  plans,
}: {
  member: ProfileMember;
  subscriptions: ProfileSub[];
  currentEndDate: string | null;
  attendance: { checkInAt: string }[];
  weightLogs: { measuredAt: string; weightKg: string; bmi: string | null }[];
  plans: PlanOpt[];
}) {
  const status = deriveStatus(
    currentEndDate ? { endDate: currentEndDate, status: member.status } : null,
  );
  const bmi = member.heightCm && member.weightKg
    ? Math.round((Number(member.weightKg) / Math.pow(Number(member.heightCm) / 100, 2)) * 10) / 10
    : null;

  const weightPoints: WeightPoint[] = [...weightLogs]
    .reverse()
    .map((w) => ({ date: w.measuredAt, weight: Number(w.weightKg) }));

  return (
    <div className="space-y-6">
      <Link href="/app/members" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All members
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            {member.photoUrl && <AvatarImage src={member.photoUrl} alt={member.fullName} />}
            <AvatarFallback className="text-base">{initials(member.fullName)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold">{member.fullName}</h1>
              <StatusDot tone={statusToTone[status]} label={statusLabel[status]} />
            </div>
            <p className="text-sm text-muted-foreground">
              {member.phone}
              {member.email ? ` · ${member.email}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Member since {formatDate(member.joinDate)}
              {currentEndDate ? ` · expires ${formatDate(currentEndDate)}` : ""}
            </p>
          </div>
        </div>
        <MemberActions member={member} plans={plans} frozen={member.status === "frozen"} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-x-8 gap-y-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Gender" value={member.gender} capitalize />
              <Detail label="Date of birth" value={member.dob ? formatDate(member.dob) : null} />
              <Detail label="Batch" value={member.batchName} />
              <Detail label="Height" value={member.heightCm ? `${member.heightCm} cm` : null} />
              <Detail label="Weight" value={member.weightKg ? `${member.weightKg} kg` : null} />
              <Detail label="BMI" value={bmi ? String(bmi) : null} />
              <Detail label="ID proof" value={member.idProofNo} />
              <Detail label="Emergency contact" value={member.emergencyContactName} />
              <Detail label="Emergency phone" value={member.emergencyContactPhone} />
              <Detail label="Address" value={member.address} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership">
          <Card>
            <CardHeader><CardTitle>Membership history</CardTitle></CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No memberships yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.planName}</TableCell>
                        <TableCell>{formatDate(s.startDate)}</TableCell>
                        <TableCell>{formatDate(s.endDate)}</TableCell>
                        <TableCell className="tnum">{formatMoney(s.pricePaise)}</TableCell>
                        <TableCell><Badge variant="muted" className="capitalize">{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <EmptyState icon={CreditCard} title="Payments arrive in Phase 3" description="Invoices, receipts and the dues ledger will show here." />
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Recent check-ins</CardTitle></CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No check-ins recorded yet.</p>
              ) : (
                <ul className="divide-y">
                  {attendance.slice(0, 30).map((a, i) => (
                    <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="flex items-center gap-2"><Zap className="size-4 text-primary" /> Checked in</span>
                      <span className="text-muted-foreground">{formatDateTime(a.checkInAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Weight progress</CardTitle>
              <LogWeightDialog memberId={member.id} defaultHeight={member.heightCm} />
            </CardHeader>
            <CardContent>
              <WeightChart data={weightPoints} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <NotesEditor memberId={member.id} initial={member.notes ?? ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Detail({ label, value, capitalize }: { label: string; value: string | null; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={capitalize ? "capitalize" : undefined}>{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function MemberActions({ member, plans, frozen }: { member: ProfileMember; plans: PlanOpt[]; frozen: boolean }) {
  const router = useRouter();
  const [renewOpen, setRenewOpen] = React.useState(false);
  const [freezeOpen, setFreezeOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={async () => {
          const r = await checkInMember(member.id);
          if (r.ok) { toast.success("Checked in"); router.refresh(); } else toast.error(r.error);
        }}
      >
        <Zap className="size-4" /> Check in
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon"><MoreVertical className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenewOpen(true)}><RefreshCw className="size-4" /> Renew</DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              const r = await inviteMember(member.id);
              if (r.ok) toast.success("Portal invite sent"); else toast.error(r.error);
            }}
          >
            <Mail className="size-4" /> Invite to portal
          </DropdownMenuItem>
          {frozen ? (
            <DropdownMenuItem
              onClick={async () => {
                const r = await unfreezeMember(member.id);
                if (r.ok) { toast.success("Membership resumed"); router.refresh(); } else toast.error(r.error);
              }}
            >
              <PlayCircle className="size-4" /> Unfreeze
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setFreezeOpen(true)}><PauseCircle className="size-4" /> Freeze</DropdownMenuItem>
          )}
          <ConfirmDialog
            title={`Cancel ${member.fullName}'s membership?`}
            description="This marks the member inactive and closes their current membership."
            confirmLabel="Cancel membership"
            onConfirm={async () => {
              const r = await cancelMember({ memberId: member.id });
              if (r.ok) { toast.success("Membership cancelled"); router.refresh(); } else toast.error(r.error);
            }}
            trigger={
              <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                <XCircle className="size-4" /> Cancel membership
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <RenewDialog open={renewOpen} onOpenChange={setRenewOpen} memberId={member.id} plans={plans} />
      <FreezeDialog open={freezeOpen} onOpenChange={setFreezeOpen} memberId={member.id} />
    </div>
  );
}

function RenewDialog({ open, onOpenChange, memberId, plans }: { open: boolean; onOpenChange: (v: boolean) => void; memberId: string; plans: PlanOpt[] }) {
  const router = useRouter();
  const [planId, setPlanId] = React.useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    const r = await renewMember({ memberId, planId, startDate });
    setPending(false);
    if (r.ok) { toast.success("Membership renewed"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Renew membership</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {formatMoney(p.pricePaise)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={pending || !planId}>{pending ? "Renewing…" : "Renew"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FreezeDialog({ open, onOpenChange, memberId }: { open: boolean; onOpenChange: (v: boolean) => void; memberId: string }) {
  const router = useRouter();
  const [from, setFrom] = React.useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function run() {
    if (!to) return toast.error("Pick an end date.");
    setPending(true);
    const r = await freezeMember({ memberId, freezeStart: from, freezeEnd: to });
    setPending(false);
    if (r.ok) { toast.success("Membership frozen"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Freeze membership</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={pending}>{pending ? "Freezing…" : "Freeze"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogWeightDialog({ memberId, defaultHeight }: { memberId: string; defaultHeight: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await logWeight({
      memberId,
      weightKg: Number(fd.get("weightKg")),
      heightCm: fd.get("heightCm") ? Number(fd.get("heightCm")) : undefined,
    });
    setPending(false);
    if (r.ok) { toast.success("Weight logged"); setOpen(false); router.refresh(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Log weight</Button>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log weigh-in</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="w">Weight (kg)</Label><Input id="w" name="weightKg" type="number" step="0.1" required /></div>
            <div className="space-y-1.5"><Label htmlFor="h">Height (cm)</Label><Input id="h" name="heightCm" type="number" defaultValue={defaultHeight ?? ""} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NotesEditor({ memberId, initial }: { memberId: string; initial: string }) {
  const [notes, setNotes] = React.useState(initial);
  const [pending, setPending] = React.useState(false);

  async function save() {
    setPending(true);
    const r = await updateMemberNotes(memberId, notes);
    setPending(false);
    if (r.ok) toast.success("Notes saved"); else toast.error(r.error);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Notes & documents</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Injuries, preferences, follow-ups…" />
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save notes"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
