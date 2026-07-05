import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getSessionUser } from "@/lib/auth";
import { getPlatformPlans } from "@/lib/plans";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Set up your gym" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (user?.gymId) redirect("/app");

  const plans = await getPlatformPlans();

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <Brand href="/" />
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Let&apos;s set up your gym
          </h1>
          <p className="mt-2 text-muted-foreground">
            Three quick steps and your 14-day trial begins.
          </p>
        </div>
        <OnboardingWizard plans={plans} uploadEnabled={isConfigured.uploadthing} />
      </div>
    </div>
  );
}
