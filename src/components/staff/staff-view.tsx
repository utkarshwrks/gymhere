"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { addStaff, addTrainer, STAFF_PERMISSIONS, updateStaffPermissions } from "@/lib/actions/staff";

interface Staff { id: string; userId: string; name: string; email: string; role: string; designation: string | null; permissions: Record<string, boolean> }
interface Trainer { id: string; name: string; specialization: string | null }

export function StaffView({ staff, trainers }: { staff: Staff[]; trainers: Trainer[] }) {
  const router = useRouter();
  const [staffOpen, setStaffOpen] = React.useState(false);
  const [trainerOpen, setTrainerOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Staff & trainers" description="Team roles, permissions and trainer profiles.">
        <Button variant="outline" onClick={() => setTrainerOpen(true)}><Plus className="size-4" /> Trainer</Button>
        <Button onClick={() => setStaffOpen(true)}><Plus className="size-4" /> Staff</Button>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <EmptyState icon={UsersRound} title="No staff yet" description="Add staff and set what each person can access." />
          ) : (
            <div className="space-y-3">
              {staff.map((s) => (
                <StaffRow key={s.id} staff={s} onDone={() => router.refresh()} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Trainers</CardTitle></CardHeader>
        <CardContent>
          {trainers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No trainers yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trainers.map((t) => (
                <div key={t.id} className="rounded-lg border p-4">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.specialization ?? "Trainer"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddStaffDialog open={staffOpen} onOpenChange={setStaffOpen} onDone={() => router.refresh()} />
      <AddTrainerDialog open={trainerOpen} onOpenChange={setTrainerOpen} onDone={() => router.refresh()} />
    </div>
  );
}

function StaffRow({ staff, onDone }: { staff: Staff; onDone: () => void }) {
  const [perms, setPerms] = React.useState<Record<string, boolean>>(staff.permissions);
  const dirty = JSON.stringify(perms) !== JSON.stringify(staff.permissions);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{staff.name} {staff.role === "trainer" && <Badge variant="muted" className="ml-1">Trainer</Badge>}</p>
        <p className="text-xs text-muted-foreground">{staff.email}{staff.designation ? ` · ${staff.designation}` : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {STAFF_PERMISSIONS.map((p) => (
          <label key={p} className="flex items-center gap-1.5 text-sm capitalize">
            <Checkbox checked={!!perms[p]} onCheckedChange={(v) => setPerms((prev) => ({ ...prev, [p]: !!v }))} /> {p}
          </label>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty}
          onClick={async () => { const r = await updateStaffPermissions(staff.id, perms); if (r.ok) { toast.success("Permissions saved"); onDone(); } else toast.error(r.error); }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function AddStaffDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [role, setRole] = React.useState<"staff" | "trainer">("staff");
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await addStaff({ name: String(fd.get("name")), email: String(fd.get("email")), phone: String(fd.get("phone") || ""), designation: String(fd.get("designation") || ""), role });
    setPending(false);
    if (r.ok) { toast.success("Staff added"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add staff</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Name</Label><Input name="name" required /></div>
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="staff">Staff</SelectItem><SelectItem value="trainer">Trainer</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" /></div>
            <div className="space-y-1.5"><Label>Designation</Label><Input name="designation" placeholder="Front desk" /></div>
          </div>
          <p className="text-xs text-muted-foreground">They&apos;ll access the app when they sign up with this email.</p>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add staff"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddTrainerDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await addTrainer({ name: String(fd.get("name")), specialization: String(fd.get("spec") || ""), bio: String(fd.get("bio") || "") });
    setPending(false);
    if (r.ok) { toast.success("Trainer added"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add trainer</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input name="name" required /></div>
          <div className="space-y-1.5"><Label>Specialization</Label><Input name="spec" placeholder="Strength & conditioning" /></div>
          <div className="space-y-1.5"><Label>Bio</Label><Input name="bio" /></div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add trainer"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
