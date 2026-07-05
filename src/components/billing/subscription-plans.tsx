"use client";

import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RazorpayButton } from "@/components/billing/razorpay-button";
import { startSubscriptionCheckout } from "@/lib/actions/billing";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SubPlan {
  key: string;
  name: string;
  pricePaise: number;
  memberCap: number | null;
  description: string | null;
}

export function SubscriptionPlans({
  plans,
  currentPlanKey,
  razorpayEnabled,
}: {
  plans: SubPlan[];
  currentPlanKey?: string;
  razorpayEnabled: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((p) => {
        const current = p.key === currentPlanKey;
        return (
          <Card key={p.key} className={cn(current && "border-primary")}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold">{p.name}</p>
                {current && <Badge>Current</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="tnum font-display text-2xl font-semibold">{formatMoney(p.pricePaise)}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-primary" />
                {p.memberCap ? `Up to ${p.memberCap} members` : "Unlimited members"}
              </p>
              {razorpayEnabled ? (
                <RazorpayButton
                  start={() => startSubscriptionCheckout(p.key)}
                  label={current ? "Renew" : "Choose plan"}
                  className="w-full"
                />
              ) : (
                <p className="text-xs text-muted-foreground">Add Razorpay test keys to enable checkout.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
