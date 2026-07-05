"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoField } from "@/components/onboarding/logo-field";
import { completeOnboarding, type OnboardingInput } from "@/lib/actions/onboarding";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlatformPlan } from "@/lib/plans";

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York"];
const STEPS = ["Gym details", "Business settings", "Choose your plan"];

export function OnboardingWizard({
  plans,
  uploadEnabled,
}: {
  plans: PlatformPlan[];
  uploadEnabled: boolean;
}) {
  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<OnboardingInput>({
    gymName: "",
    logoUrl: "",
    city: "",
    phone: "",
    currency: "INR",
    timezone: "Asia/Kolkata",
    gstEnabled: false,
    gstNumber: "",
    planKey: "growth",
  });

  function set<K extends keyof OnboardingInput>(key: K, val: OnboardingInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const canNext = step === 0 ? form.gymName.trim().length >= 2 : true;

  async function submit(planKey: OnboardingInput["planKey"]) {
    setPending(true);
    const res = await completeOnboarding({ ...form, planKey });
    // On success the action redirects; only errors return here.
    if (res && !res.ok) {
      toast.error(res.error);
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-xs font-semibold transition-colors",
                  i < step && "bg-primary text-primary-foreground",
                  i === step && "bg-foreground text-background",
                  i > step && "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden text-sm font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="gymName">Gym name</Label>
                <Input
                  id="gymName"
                  value={form.gymName}
                  onChange={(e) => set("gymName", e.target.value)}
                  placeholder="IronWorks Fitness"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Logo</Label>
                <LogoField
                  value={form.logoUrl ?? ""}
                  onChange={(url) => set("logoUrl", url)}
                  uploadEnabled={uploadEnabled}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Pune" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98220 00000" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                      <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Charge GST on invoices</p>
                  <p className="text-xs text-muted-foreground">Adds a GST field to billing and reports.</p>
                </div>
                <Switch checked={form.gstEnabled} onCheckedChange={(v) => set("gstEnabled", v)} />
              </div>

              {form.gstEnabled && (
                <div className="space-y-1.5">
                  <Label htmlFor="gstNumber">GSTIN</Label>
                  <Input id="gstNumber" value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} placeholder="27ABCDE1234F1Z5" />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {plans.map((plan) => {
                const selected = form.planKey === plan.key;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => set("planKey", plan.key as OnboardingInput["planKey"])}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors",
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent",
                    )}
                  >
                    <div>
                      <p className="font-display font-semibold">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.memberCap ? `Up to ${plan.memberCap} members` : "Unlimited members"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tnum font-semibold">{formatMoney(plan.pricePaise)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                      {selected && <span className="text-xs font-medium text-primary">Selected</span>}
                    </div>
                  </button>
                );
              })}
              <p className="pt-1 text-center text-xs text-muted-foreground">
                14-day free trial. No card required — you won&apos;t be charged today.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft className="size-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={() => submit(form.planKey)} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Starting trial…
              </>
            ) : (
              <>Start 14-day trial <ArrowRight className="size-4" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
