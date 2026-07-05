"use client";

import * as React from "react";
import { Check, MoreVertical, Pencil, Plus, Tags, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { archiveAddon, archivePlan, saveAddon, savePlan } from "@/lib/actions/plans";
import { formatMoney, toRupees } from "@/lib/format";

interface Plan {
  id: string;
  name: string;
  durationMonths: number;
  pricePaise: number;
  sessionsPerWeek: number | null;
  features: string[];
  description: string | null;
}
interface Addon {
  id: string;
  name: string;
  kind: string;
  pricePaise: number;
}

const ADDON_KINDS = [
  { value: "personal_training", label: "Personal training" },
  { value: "locker", label: "Locker" },
  { value: "diet_plan", label: "Diet plan" },
  { value: "other", label: "Other" },
];

export function PlanManager({
  plans,
  addons,
  activeCounts,
}: {
  plans: Plan[];
  addons: Addon[];
  activeCounts: Record<string, number>;
}) {
  const [planOpen, setPlanOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [addonOpen, setAddonOpen] = React.useState(false);

  function newPlan() {
    setEditing(null);
    setPlanOpen(true);
  }
  function editPlan(p: Plan) {
    setEditing(p);
    setPlanOpen(true);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Membership plans" description="The plans your members can buy. Add-ons attach extras like PT or lockers.">
        <Button onClick={newPlan}>
          <Plus className="size-4" /> New plan
        </Button>
      </PageHeader>

      {plans.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No plans yet"
          description="Create your first membership plan so you can start adding members."
          action={<Button onClick={newPlan}><Plus className="size-4" /> New plan</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="gap-4">
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.durationMonths} month{p.durationMonths > 1 ? "s" : ""}
                      {p.sessionsPerWeek ? ` · ${p.sessionsPerWeek}×/week` : ""}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => editPlan(p)}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <ConfirmDialog
                        title={`Archive ${p.name}?`}
                        description="Archived plans are hidden from new sign-ups. Existing members keep their membership."
                        confirmLabel="Archive plan"
                        onConfirm={async () => {
                          const r = await archivePlan(p.id);
                          if (r.ok) toast.success("Plan archived");
                          else toast.error(r.error);
                        }}
                        trigger={
                          <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="size-4" /> Archive
                          </DropdownMenuItem>
                        }
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="tnum font-display text-2xl font-semibold">{formatMoney(p.pricePaise)}</span>
                </div>

                {p.features.length > 0 && (
                  <ul className="space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="size-3.5 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-1.5 border-t pt-3 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  {activeCounts[p.id] ?? 0} active member{(activeCounts[p.id] ?? 0) === 1 ? "" : "s"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add-ons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Add-ons</h2>
            <p className="text-sm text-muted-foreground">Extras members can buy on top of a plan.</p>
          </div>
          <Button variant="outline" onClick={() => setAddonOpen(true)}>
            <Plus className="size-4" /> New add-on
          </Button>
        </div>
        {addons.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No add-ons yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{a.kind.replace("_", " ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tnum text-sm font-medium">{formatMoney(a.pricePaise)}</span>
                  <ConfirmDialog
                    title={`Remove ${a.name}?`}
                    confirmLabel="Remove"
                    onConfirm={async () => {
                      const r = await archiveAddon(a.id);
                      if (r.ok) toast.success("Add-on removed");
                      else toast.error(r.error);
                    }}
                    trigger={<Button variant="ghost" size="icon"><Trash2 className="size-4" /></Button>}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} plan={editing} />
      <AddonDialog open={addonOpen} onOpenChange={setAddonOpen} />
    </div>
  );
}

function PlanDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: Plan | null;
}) {
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await savePlan({
      id: plan?.id,
      name: String(fd.get("name") ?? ""),
      durationMonths: Number(fd.get("durationMonths") ?? 1),
      priceRupees: Number(fd.get("priceRupees") ?? 0),
      sessionsPerWeek: fd.get("sessionsPerWeek") ? Number(fd.get("sessionsPerWeek")) : undefined,
      features: String(fd.get("features") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      description: String(fd.get("description") ?? ""),
    });
    setPending(false);
    if (r.ok) {
      toast.success(plan ? "Plan updated" : "Plan created");
      onOpenChange(false);
    } else {
      toast.error(r.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Plan name</Label>
            <Input id="name" name="name" required defaultValue={plan?.name} placeholder="Quarterly" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="durationMonths">Duration (months)</Label>
              <Input id="durationMonths" name="durationMonths" type="number" min={1} required defaultValue={plan?.durationMonths ?? 3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priceRupees">Price (₹)</Label>
              <Input id="priceRupees" name="priceRupees" type="number" min={0} required defaultValue={plan ? toRupees(plan.pricePaise) : ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sessionsPerWeek">Sessions / week (optional)</Label>
            <Input id="sessionsPerWeek" name="sessionsPerWeek" type="number" min={0} defaultValue={plan?.sessionsPerWeek ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="features">Features (comma separated)</Label>
            <Input id="features" name="features" defaultValue={plan?.features.join(", ")} placeholder="Gym floor, Group classes, Locker" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={plan?.description ?? ""} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : plan ? "Save changes" : "Create plan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [pending, setPending] = React.useState(false);
  const [kind, setKind] = React.useState("personal_training");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await saveAddon({
      name: String(fd.get("name") ?? ""),
      kind: kind as "personal_training" | "locker" | "diet_plan" | "other",
      priceRupees: Number(fd.get("priceRupees") ?? 0),
    });
    setPending(false);
    if (r.ok) {
      toast.success("Add-on created");
      onOpenChange(false);
    } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New add-on</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="addon-name">Name</Label>
            <Input id="addon-name" name="name" required placeholder="Personal training (12 sessions)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADDON_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addon-price">Price (₹)</Label>
              <Input id="addon-price" name="priceRupees" type="number" min={0} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create add-on"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
