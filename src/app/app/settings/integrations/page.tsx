import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plug } from "lucide-react";
import { requireGym } from "@/lib/auth";
import { gymIntegrationData } from "@/lib/queries/integrations";
import { can } from "@/lib/features";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { GymIntegrationsView } from "@/components/integrations/gym-integrations-view";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function GymIntegrationsPage() {
  const ctx = await requireGym();
  const rows = await gymIntegrationData(ctx.gym.id);
  const entitled = can(ctx.plan, "byo_credentials");

  return (
    <div className="space-y-6">
      <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader title="Integrations" description="Connect your own payment, messaging and email accounts." />
      {rows.length === 0 ? (
        <EmptyState icon={Plug} title="Nothing to set up" description="Your gym runs on GymHere's managed keys — no integrations require your own credentials right now." />
      ) : (
        <GymIntegrationsView rows={rows} entitled={entitled} />
      )}
    </div>
  );
}
