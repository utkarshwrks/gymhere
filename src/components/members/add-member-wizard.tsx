"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMember, type AddMemberInput } from "@/lib/actions/members";
import { computeBmi } from "@/lib/membership";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlanOpt {
  id: string;
  name: string;
  pricePaise: number;
  durationMonths: number;
}
interface BatchOpt {
  id: string;
  name: string;
}

interface WizardForm {
  fullName: string;
  phone: string;
  email: string;
  gender?: "male" | "female" | "other";
  dob: string;
  address: string;
  idProofNo: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  heightCm?: number;
  weightKg?: number;
  batchId: string;
  photoUrl: string;
  planId: string;
  startDate: string;
}

const STEPS = ["Personal", "Contact", "Health", "Plan"];
const today = () => new Date().toISOString().slice(0, 10);

export function AddMemberWizard({
  open,
  onOpenChange,
  plans,
  batches,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: PlanOpt[];
  batches: BatchOpt[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<WizardForm>({
    fullName: "",
    phone: "",
    email: "",
    gender: undefined,
    dob: "",
    address: "",
    idProofNo: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    heightCm: undefined,
    weightKg: undefined,
    batchId: "",
    photoUrl: "",
    planId: plans[0]?.id ?? "",
    startDate: today(),
  });

  function set<K extends keyof WizardForm>(k: K, v: WizardForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const bmi =
    form.heightCm && form.weightKg
      ? computeBmi(Number(form.heightCm), Number(form.weightKg))
      : null;

  const canNext =
    step === 0 ? String(form.fullName).trim().length >= 2 : step === 1 ? String(form.phone).trim().length >= 6 : true;

  function reset() {
    setStep(0);
    setForm((f) => ({ ...f, fullName: "", phone: "", email: "", dob: "", address: "", idProofNo: "", emergencyContactName: "", emergencyContactPhone: "", heightCm: undefined, weightKg: undefined, photoUrl: "", batchId: "", startDate: today() }));
  }

  async function submit() {
    if (!form.planId) {
      toast.error("Create a membership plan first.");
      return;
    }
    setPending(true);
    const r = await addMember(form as AddMemberInput);
    setPending(false);
    if (r.ok) {
      toast.success(`${form.fullName} added`);
      onOpenChange(false);
      reset();
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  i < step && "bg-primary text-primary-foreground",
                  i === step && "bg-foreground text-background",
                  i > step && "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="min-h-[220px]"
          >
            {step === 0 && (
              <div className="space-y-4">
                <Field label="Full name">
                  <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Ananya Sharma" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Gender">
                    <Select value={form.gender ?? ""} onValueChange={(v) => set("gender", v as WizardForm["gender"])}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Date of birth">
                    <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
                  </Field>
                </div>
                <Field label="ID proof number (optional)">
                  <Input value={form.idProofNo} onChange={(e) => set("idProofNo", e.target.value)} placeholder="Aadhaar / PAN / DL" />
                </Field>
                <Field label="Photo URL (optional)">
                  <Input value={form.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} placeholder="https://…" />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone">
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 90000 00000" />
                  </Field>
                  <Field label="Email (optional)">
                    <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="member@email.com" />
                  </Field>
                </div>
                <Field label="Address (optional)">
                  <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Emergency contact">
                    <Input value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} placeholder="Name" />
                  </Field>
                  <Field label="Emergency phone">
                    <Input value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} placeholder="+91 …" />
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Height (cm)">
                    <Input type="number" value={form.heightCm ?? ""} onChange={(e) => set("heightCm", e.target.value ? Number(e.target.value) : undefined)} placeholder="170" />
                  </Field>
                  <Field label="Weight (kg)">
                    <Input type="number" value={form.weightKg ?? ""} onChange={(e) => set("weightKg", e.target.value ? Number(e.target.value) : undefined)} placeholder="68" />
                  </Field>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Auto BMI</p>
                  <p className="tnum font-display text-2xl font-semibold">{bmi ?? "—"}</p>
                </div>
                {batches.length > 0 && (
                  <Field label="Batch (optional)">
                    <Select value={form.batchId || ""} onValueChange={(v) => set("batchId", v)}>
                      <SelectTrigger><SelectValue placeholder="Assign a time-slot batch" /></SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Field label="Membership plan">
                  <Select value={form.planId} onValueChange={(v) => set("planId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} · {formatMoney(p.pricePaise)} · {p.durationMonths}mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Start date">
                  <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </Field>
                {plans.length === 0 && (
                  <p className="text-sm text-destructive">No plans yet — create one on the Plans page first.</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={pending || plans.length === 0}>
              {pending ? <><Loader2 className="size-4 animate-spin" /> Adding…</> : "Add member"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
