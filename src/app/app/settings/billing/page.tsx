import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireGym } from "@/lib/auth";
import { getPlatformPlans } from "@/lib/plans";
import { isConfigured } from "@/lib/env";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { SubscriptionPlans } from "@/components/billing/subscription-plans";
import { daysUntil } from "@/lib/format";

export const metadata: Metadata = { title: "Subscription & billing" };
export const dynamic = "force-dynamic";

export default async function GymBillingPage() {
  const ctx = await requireGym();
  const plans = await getPlatformPlans();
  const currentKey = plans.find((p) => p.id === ctx.plan?.id)?.key;

  const status = ctx.subscription?.status ?? "trialing";
  const trialDays = status === "trialing" && ctx.subscription?.trialEndsAt ? daysUntil(ctx.subscription.trialEndsAt) : null;

  return (
    <div className="space-y-6">
      <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader title="Subscription & billing" description="Your GymHere plan.">
        <Badge variant={status === "active" ? "success" : status === "trialing" ? "secondary" : "destructive"} className="capitalize">
          {status}{trialDays !== null ? ` · ${Math.max(0, trialDays)}d left` : ""}
        </Badge>
      </PageHeader>

      <SubscriptionPlans
        plans={plans.map((p) => ({ key: p.key, name: p.name, pricePaise: p.pricePaise, memberCap: p.memberCap, description: p.description }))}
        currentPlanKey={currentKey}
        razorpayEnabled={isConfigured.razorpay}
      />
    </div>
  );
}
