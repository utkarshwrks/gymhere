import type { Metadata } from "next";
import { superIntegrationData } from "@/lib/queries/integrations";
import { SuperIntegrationsView } from "@/components/super-admin/integrations-view";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function SaIntegrationsPage() {
  const data = await superIntegrationData();
  return <SuperIntegrationsView services={data.services} tenantRows={data.tenantRows} totalGyms={data.totalGyms} />;
}
