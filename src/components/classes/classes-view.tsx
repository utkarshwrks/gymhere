"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { addSchedule, bookAppointment, bookClass, completeAppointment, createSessionPack, saveClass } from "@/lib/actions/classes";
import { formatDateTime, formatDate } from "@/lib/format";
import type { TimetableSlot } from "@/lib/queries/classes";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
interface ClassRow { id: string; name: string; capacity: number; durationMins: number; color: string; trainerName: string | null }
interface Opt { id: string; name: string }
interface Pack { id: string; name: string; memberName: string; total: number; used: number }
interface Appt { id: string; title: string; memberName: string; startAt: string; status: string }

export function ClassesView({
  timetable, classes, trainers, members, packs, appointments,
}: {
  timetable: TimetableSlot[];
  classes: ClassRow[];
  trainers: Opt[];
  members: Opt[];
  packs: Pack[];
  appointments: Appt[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Classes & PT" description="Weekly timetable, booking rosters and personal-training sessions." />
      <Tabs defaultValue="timetable">
        <TabsList className="flex-wrap">
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="pt">Personal training</TabsTrigger>
        </TabsList>
        <TabsContent value="timetable"><Timetable timetable={timetable} classes={classes} members={members} /></TabsContent>
        <TabsContent value="catalog"><Catalog classes={classes} trainers={trainers} /></TabsContent>
        <TabsContent value="pt"><PtTab packs={packs} appointments={appointments} members={members} trainers={trainers} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Timetable({ timetable, classes, members }: { timetable: TimetableSlot[]; classes: ClassRow[]; members: Opt[] }) {
  const router = useRouter();
  const [addFor, setAddFor] = React.useState<number | null>(null);
  const [roster, setRoster] = React.useState<TimetableSlot | null>(null);
  const byDay = (d: number) => timetable.filter((s) => s.dayOfWeek === d);

  return (
    <div className="space-y-4">
      {classes.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No classes yet" description="Create a class in the Catalog tab, then drop it onto the timetable." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {DAYS.map((day, d) => (
            <div key={day} className="rounded-lg border bg-card p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold">{day}</span>
                <button onClick={() => setAddFor(d)} className="text-muted-foreground hover:text-foreground" aria-label={`Add slot on ${day}`}><Plus className="size-4" /></button>
              </div>
              <div className="space-y-2">
                {byDay(d).length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">—</p>}
                {byDay(d).map((s) => (
                  <button key={s.scheduleId} onClick={() => setRoster(s)} className="w-full rounded-md border-l-2 bg-muted/40 p-2 text-left transition-colors hover:bg-muted" style={{ borderLeftColor: s.color }}>
                    <p className="text-xs font-semibold">{s.startTime}</p>
                    <p className="truncate text-sm">{s.className}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <Progress value={(s.bookedCount / s.capacity) * 100} className="h-1" />
                      <span className="tnum shrink-0 text-[10px] text-muted-foreground">{s.bookedCount}/{s.capacity}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddSlotDialog day={addFor} onOpenChange={(v) => !v && setAddFor(null)} classes={classes} onDone={() => router.refresh()} />
      {roster && <RosterDialog slot={roster} members={members} onOpenChange={(v) => !v && setRoster(null)} onDone={() => router.refresh()} />}
    </div>
  );
}

function AddSlotDialog({ day, onOpenChange, classes, onDone }: { day: number | null; onOpenChange: (v: boolean) => void; classes: ClassRow[]; onDone: () => void }) {
  const [classId, setClassId] = React.useState("");
  const [time, setTime] = React.useState("06:00");
  const [pending, setPending] = React.useState(false);
  async function run() {
    if (day === null || !classId) return;
    setPending(true);
    const r = await addSchedule({ classId, dayOfWeek: day, startTime: time });
    setPending(false);
    if (r.ok) { toast.success("Slot added"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={day !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add slot · {day !== null ? DAYS[day] : ""}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Pick a class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Start time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={run} disabled={pending || !classId}>{pending ? "Adding…" : "Add slot"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RosterDialog({ slot, members, onOpenChange, onDone }: { slot: TimetableSlot; members: Opt[]; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [memberId, setMemberId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  async function book() {
    if (!memberId) return;
    setPending(true);
    const r = await bookClass({ scheduleId: slot.scheduleId, memberId, bookingDate: slot.upcomingDate });
    setPending(false);
    if (r.ok) { toast.success("Booked"); setMemberId(""); onDone(); } else toast.error(r.error);
  }
  const full = slot.bookedCount >= slot.capacity;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{slot.className} · {DAYS[slot.dayOfWeek]} {slot.startTime}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{formatDate(slot.upcomingDate)} · {slot.bookedCount}/{slot.capacity} booked {full && <Badge variant="destructive" className="ml-1">Full</Badge>}</p>
          <div className="flex gap-2">
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Book a member" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={book} disabled={pending || full || !memberId}>Book</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Catalog({ classes, trainers }: { classes: ClassRow[]; trainers: Opt[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [trainerId, setTrainerId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await saveClass({ name: String(fd.get("name")), trainerId, capacity: Number(fd.get("capacity")), durationMins: Number(fd.get("duration")), color: String(fd.get("color") || "#b5f31d") });
    setPending(false);
    if (r.ok) { toast.success("Class created"); setOpen(false); router.refresh(); } else toast.error(r.error);
  }
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle>Class catalog</CardTitle><Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> New class</Button></CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No classes" description="Create classes like Yoga, HIIT or Zumba." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <div key={c.id} className="rounded-lg border-l-4 bg-card p-4" style={{ borderLeftColor: c.color }}>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.durationMins} min · cap {c.capacity}{c.trainerName ? ` · ${c.trainerName}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New class</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input name="name" required placeholder="Morning Yoga" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Capacity</Label><Input name="capacity" type="number" min={1} defaultValue={20} required /></div>
              <div className="space-y-1.5"><Label>Duration (min)</Label><Input name="duration" type="number" min={15} defaultValue={60} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Trainer</Label>
                <Select value={trainerId} onValueChange={setTrainerId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Colour</Label><Input name="color" type="color" defaultValue="#b5f31d" className="h-9 p-1" /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create class"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PtTab({ packs, appointments, members, trainers }: { packs: Pack[]; appointments: Appt[]; members: Opt[]; trainers: Opt[] }) {
  const router = useRouter();
  const [packOpen, setPackOpen] = React.useState(false);
  const [apptOpen, setApptOpen] = React.useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Session packs</CardTitle><Button size="sm" onClick={() => setPackOpen(true)}><Plus className="size-4" /> Sell pack</Button></CardHeader>
        <CardContent className="space-y-3">
          {packs.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No packs sold yet.</p> : packs.map((p) => (
            <div key={p.id} className="rounded-lg border p-3">
              <div className="flex justify-between"><span className="font-medium">{p.name}</span><span className="tnum text-sm">{p.total - p.used} left</span></div>
              <p className="text-xs text-muted-foreground">{p.memberName}</p>
              <Progress value={((p.total - p.used) / p.total) * 100} className="mt-2 h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Appointments</CardTitle><Button size="sm" onClick={() => setApptOpen(true)}><Plus className="size-4" /> Book</Button></CardHeader>
        <CardContent className="space-y-2">
          {appointments.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No appointments.</p> : appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.memberName} · {formatDateTime(a.startAt)}</p>
              </div>
              {a.status === "completed" ? <Badge variant="success">Done</Badge> : (
                <Button size="sm" variant="outline" onClick={async () => { const r = await completeAppointment(a.id); if (r.ok) { toast.success("Marked complete"); router.refresh(); } else toast.error(r.error); }}>
                  <CheckCircle2 className="size-4" /> Complete
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <PackDialog open={packOpen} onOpenChange={setPackOpen} members={members} onDone={() => router.refresh()} />
      <ApptDialog open={apptOpen} onOpenChange={setApptOpen} members={members} trainers={trainers} onDone={() => router.refresh()} />
    </div>
  );
}

function PackDialog({ open, onOpenChange, members, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; members: Opt[]; onDone: () => void }) {
  const [memberId, setMemberId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createSessionPack({ memberId, name: String(fd.get("name")), totalSessions: Number(fd.get("total")), priceRupees: Number(fd.get("price")) });
    setPending(false);
    if (r.ok) { toast.success("Pack sold"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Sell session pack</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Pack name</Label><Input name="name" required defaultValue="PT ×12" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Sessions</Label><Input name="total" type="number" min={1} defaultValue={12} required /></div>
            <div className="space-y-1.5"><Label>Price (₹)</Label><Input name="price" type="number" min={0} required /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending || !memberId}>{pending ? "Saving…" : "Sell pack"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApptDialog({ open, onOpenChange, members, trainers, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; members: Opt[]; trainers: Opt[]; onDone: () => void }) {
  const [memberId, setMemberId] = React.useState("");
  const [trainerId, setTrainerId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await bookAppointment({ memberId, trainerId, title: String(fd.get("title")), startAt: String(fd.get("startAt")), durationMins: Number(fd.get("duration") || 60) });
    setPending(false);
    if (r.ok) { toast.success("Appointment booked"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Book appointment</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Title / service</Label><Input name="title" required defaultValue="PT session" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>When</Label><Input name="startAt" type="datetime-local" required /></div>
            <div className="space-y-1.5"><Label>Trainer</Label>
              <Select value={trainerId} onValueChange={setTrainerId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending || !memberId}>{pending ? "Saving…" : "Book"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
