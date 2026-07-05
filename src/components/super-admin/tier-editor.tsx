"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { savePlatformPlan } from "@/lib/actions/super-admin";
import { ALL_FEATURES } from "@/lib/features";
import { formatMoney, toRupees } from "@/lib/format";

export interface EditablePlan {
  id: string;
  key: string;
  name: string;
  pricePaise: number;
  memberCap: number | null;
  description: string | null;
  features: Record<string, boolean>;
}

export function TierEditor({ plans }: { plans: EditablePlan[] }) {
  const [editing, setEditing] = React.useState<EditablePlan | null>(null);
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="SaaS tiers" description="Prices, member caps and feature flags — changes apply live via can().">
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> New tier</Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.memberCap ? `${p.memberCap} members` : "Unlimited"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
              </div>
              <p className="tnum font-display text-2xl font-semibold">{formatMoney(p.pricePaise)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_FEATURES.filter((f) => p.features[f.key]).map((f) => (
                  <Badge key={f.key} variant="muted">{f.label}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlanDialog open={open} onOpenChange={setOpen} plan={editing} />
    </div>
  );
}

function PlanDialog({ open, onOpenChange, plan }: { open: boolean; onOpenChange: (v: boolean) => void; plan: EditablePlan | null }) {
  const router = useRouter();
  const [unlimited, setUnlimited] = React.useState(plan ? plan.memberCap === null : false);
  const [features, setFeatures] = React.useState<Record<string, boolean>>(plan?.features ?? {});
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setUnlimited(plan ? plan.memberCap === null : false);
    setFeatures(plan?.features ?? {});
  }, [plan, open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await savePlatformPlan({
      id: plan?.id,
      key: String(fd.get("key")),
      name: String(fd.get("name")),
      priceRupees: Number(fd.get("price")),
      memberCap: Number(fd.get("cap") || 0),
      unlimited,
      description: String(fd.get("desc") || ""),
      features,
    });
    setPending(false);
    if (r.ok) { toast.success("Tier saved"); onOpenChange(false); router.refresh(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{plan ? `Edit ${plan.name}` : "New tier"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Key</Label><Input name="key" required defaultValue={plan?.key} placeholder="starter" /></div>
            <div className="space-y-1.5"><Label>Name</Label><Input name="name" required defaultValue={plan?.name} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Price (₹/mo)</Label><Input name="price" type="number" min={0} required defaultValue={plan ? toRupees(plan.pricePaise) : ""} /></div>
            <div className="space-y-1.5"><Label>Member cap</Label><Input name="cap" type="number" min={0} defaultValue={plan?.memberCap ?? 100} disabled={unlimited} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={unlimited} onCheckedChange={setUnlimited} /> Unlimited members</label>
          <div className="space-y-1.5"><Label>Description</Label><Input name="desc" defaultValue={plan?.description ?? ""} /></div>
          <div className="space-y-2">
            <Label>Feature flags</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_FEATURES.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!features[f.key]} onCheckedChange={(v) => setFeatures((prev) => ({ ...prev, [f.key]: !!v }))} /> {f.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save tier"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
