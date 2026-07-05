import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { tenantList } from "@/lib/queries/platform";
import { TenantsTable } from "@/components/super-admin/tenants-table";

export const metadata: Metadata = { title: "Gyms" };
export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await tenantList();
  return (
    <div className="space-y-6">
      <PageHeader title="Gyms" description="Every tenant on the platform. Suspend, reactivate or impersonate." />
      <TenantsTable tenants={tenants} />
    </div>
  );
}
