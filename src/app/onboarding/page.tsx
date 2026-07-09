import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { getSessionUser } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Account setup" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role === "super_admin") redirect("/sa");
  if (user.gymId) redirect("/app");

  // Super-admin-only signup model: an owner without a gym is waiting to be provisioned.
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <Brand href="/" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <UserMenu
            name={user.name ?? ""}
            email={user.email}
            imageUrl={user.imageUrl}
            roleLabel="Pending setup"
            clerkEnabled={isConfigured.clerk}
          />
        </div>
      </header>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:py-28">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="size-7" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Your account isn&apos;t linked to a gym yet
        </h1>
        <p className="mt-3 text-muted-foreground">
          Gyms on GymHere are set up by a platform admin. Once yours is created and
          linked to <span className="font-medium text-foreground">{user.email}</span>,
          sign in again and you&apos;ll land straight in your gym dashboard.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Already expecting access? Ask your platform admin to confirm your email, then reload.
        </p>
      </div>
    </div>
  );
}
