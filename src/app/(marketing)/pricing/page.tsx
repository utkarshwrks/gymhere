import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/shared/fade-in";
import { getPlatformPlans, PLAN_HIGHLIGHTS } from "@/lib/plans";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple per-month plans with a 14-day free trial. No card required.",
};

export default async function PricingPage() {
  const plans = await getPlatformPlans();

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <FadeIn>
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pricing</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-brand-offwhite sm:text-5xl">
            One plan per gym. No surprises.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Every tier includes a 14-day free trial — no card needed. Prices are
            per month, billed to your gym.
          </p>
        </div>
      </FadeIn>

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const popular = plan.key === "growth";
          const highlights = PLAN_HIGHLIGHTS[plan.key] ?? [];
          return (
            <FadeIn key={plan.id} delay={i * 0.06}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-7",
                  popular
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-white/10 bg-white/[0.02]",
                )}
              >
                {popular && (
                  <Badge className="absolute -top-3 left-7">Most popular</Badge>
                )}
                <h2 className="font-display text-xl font-semibold text-brand-offwhite">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="tnum font-display text-4xl font-semibold text-brand-offwhite">
                    {formatMoney(plan.pricePaise)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.memberCap ? `Up to ${plan.memberCap.toLocaleString("en-IN")} members` : "Unlimited members"}
                </p>

                <Button asChild className="mt-6" variant={popular ? "default" : "outline"}>
                  <Link href="/sign-up">Start 14-day trial</Link>
                </Button>

                <ul className="mt-7 space-y-3 text-sm">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          );
        })}
      </div>

      <FadeIn delay={0.1}>
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Need multi-location, SSO or a custom API volume?{" "}
          <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
            Talk to us
          </Link>
          .
        </p>
      </FadeIn>
    </div>
  );
}
