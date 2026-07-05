"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plug } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setGlobalPolicy, forceRevert } from "@/lib/actions/integrations";
import { SERVICE_LABELS } from "@/lib/integrations/labels";
import type { SuperServiceRow, TenantCredRow } from "@/lib/queries/integrations";
import type { IntegrationService } from "@/lib/credentials/resolver";
import { cn } from "@/lib/utils";

export function SuperIntegrationsView({
  services,
  tenantRows,
  totalGyms,
}: {
  services: SuperServiceRow[];
  tenantRows: TenantCredRow[];
  totalGyms: number;
}) {
  const router = useRouter();

  async function save(service: IntegrationService, mode: "platform" | "tenant", fallback: boolean) {
    const r = await setGlobalPolicy({ service, mode, allowPlatformFallback: fallback });
    if (r.ok) { toast.success("Policy updated"); router.refresh(); } else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" description={`Decide, per service, whether gyms run on GymHere's shared keys or connect their own. ${totalGyms} gyms total.`} />

      <div className="grid gap-4 lg:grid-cols-2">
        {services.map((s) => (
          <Card key={s.service}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{SERVICE_LABELS[s.service]}</CardTitle>
              <Badge variant={s.mode === "tenant" ? "default" : "muted"} className="capitalize">{s.mode === "tenant" ? "Tenant-managed" : "Platform-managed"}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => save(s.service, "platform", s.allowPlatformFallback)}
                  className={cn("rounded-lg border p-3 text-left text-sm transition-colors", s.mode === "platform" ? "border-primary bg-primary/5" : "hover:bg-accent")}
                >
                  <p className="font-medium">Platform-managed</p>
                  <p className="text-xs text-muted-foreground">All gyms use GymHere keys</p>
                </button>
                <button
                  onClick={() => save(s.service, "tenant", s.allowPlatformFallback)}
                  className={cn("rounded-lg border p-3 text-left text-sm transition-colors", s.mode === "tenant" ? "border-primary bg-primary/5" : "hover:bg-accent")}
                >
                  <p className="font-medium">Tenant-managed</p>
                  <p className="text-xs text-muted-foreground">Each gym connects its own</p>
                </button>
              </div>

              <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>
                  <span className="font-medium">Allow platform fallback</span>
                  <span className="block text-xs text-muted-foreground">Gyms without their own keys still use platform keys</span>
                </span>
                <Switch checked={s.allowPlatformFallback} onCheckedChange={(v) => save(s.service, s.mode, v)} />
              </label>

              <p className="text-xs text-muted-foreground">
                {s.onPlatform} gym{s.onPlatform === 1 ? "" : "s"} on platform keys · {s.usingOwn} using their own
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Tenant credential status</CardTitle></CardHeader>
        <CardContent>
          {tenantRows.length === 0 ? (
            <EmptyState icon={Plug} title="No tenant credentials yet" description="When gyms connect their own keys, they'll appear here." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Gym</TableHead><TableHead>Service</TableHead><TableHead>Key</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {tenantRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.gymName}</TableCell>
                    <TableCell>{SERVICE_LABELS[r.service]}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.keyHint ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "verified" ? "success" : r.status === "failed" ? "destructive" : "warning"} className="capitalize">{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <ConfirmDialog
                        title="Force revert to platform keys?"
                        description="This immediately switches the gym back to GymHere's keys and disables their own — no redeploy needed."
                        confirmLabel="Force revert"
                        onConfirm={async () => { const res = await forceRevert(r.gymId, r.service as IntegrationService); if (res.ok) { toast.success("Reverted to platform keys"); router.refresh(); } else toast.error(res.error); }}
                        trigger={<Button size="sm" variant="outline">Force revert</Button>}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
