"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGymWithOwner } from "@/lib/actions/super-admin";

export interface PlanOption {
  key: string;
  name: string;
}

export function CreateGymDialog({ plans }: { plans: PlanOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [planKey, setPlanKey] = React.useState(plans[0]?.key ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createGymWithOwner({
      gymName: String(fd.get("gymName") ?? ""),
      ownerName: String(fd.get("ownerName") ?? ""),
      ownerEmail: String(fd.get("ownerEmail") ?? ""),
      city: String(fd.get("city") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      planKey,
    });
    setPending(false);
    if (r.ok) {
      toast.success("Gym created — the owner can sign in with that email.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4" /> Create gym</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a gym</DialogTitle>
          <DialogDescription>
            The owner signs in with this email and lands straight in their gym dashboard.
            The gym goes live on the selected plan — no payment required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gymName">Gym name</Label>
            <Input id="gymName" name="gymName" required placeholder="IronWorks Fitness" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input id="ownerName" name="ownerName" placeholder="Rohan Mehta" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownerEmail">Owner email</Label>
              <Input id="ownerEmail" name="ownerEmail" type="email" required placeholder="owner@example.com" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">City <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="city" name="city" placeholder="Pune" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="phone" name="phone" placeholder="+91 98000 00000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Platform plan</Label>
            <Select value={planKey} onValueChange={setPlanKey}>
              <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !planKey}>
              {pending ? "Creating…" : "Create gym"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
