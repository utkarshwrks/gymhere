import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { tenantList } from "@/lib/queries/platform";
import { getPlatformPlans } from "@/lib/plans";
import { TenantsTable } from "@/components/super-admin/tenants-table";
import { CreateGymDialog } from "@/components/super-admin/create-gym-dialog";

export const metadata: Metadata = { title: "Gyms" };
export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const [tenants, plans] = await Promise.all([tenantList(), getPlatformPlans()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Gyms" description="Every tenant on the platform. Create, suspend, reactivate, impersonate or delete.">
        <CreateGymDialog plans={plans.map((p) => ({ key: p.key, name: p.name }))} />
      </PageHeader>
      <TenantsTable tenants={tenants} />
    </div>
  );
}
