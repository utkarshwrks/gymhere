"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plug, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { deleteTenantCreds, saveTenantCreds, testTenantCreds } from "@/lib/actions/integrations";
import { SERVICE_LABELS } from "@/lib/queries/integrations";
import type { GymServiceRow } from "@/lib/queries/integrations";
import type { IntegrationService } from "@/lib/credentials/resolver";

interface FieldSpec { name: string; label: string; secret?: boolean; placeholder?: string }

const FORMS: Record<string, FieldSpec[]> = {
  payments: [
    { name: "keyId", label: "Razorpay Key ID", placeholder: "rzp_live_..." },
    { name: "keySecret", label: "Key Secret", secret: true },
    { name: "webhookSecret", label: "Webhook Secret", secret: true },
  ],
  email: [
    { name: "apiKey", label: "Resend API Key", secret: true, placeholder: "re_..." },
    { name: "fromEmail", label: "From email", placeholder: "Gym <hello@yourgym.com>" },
  ],
  sms: [
    { name: "gatewayUrl", label: "Gateway URL", placeholder: "https://..." },
    { name: "user", label: "Username" },
    { name: "senderId", label: "DLT Sender ID", placeholder: "GYMHERE" },
  ],
  whatsapp: [
    { name: "instanceId", label: "Instance ID" },
    { name: "accessToken", label: "Access Token", secret: true },
  ],
};

export function GymIntegrationsView({ rows, entitled }: { rows: GymServiceRow[]; entitled: boolean }) {
  if (!entitled) {
    return (
      <EmptyState
        icon={Plug}
        title="Bring-your-own keys is a Pro feature"
        description="Upgrade to connect your own Razorpay, email and messaging accounts."
        action={<Button asChild><Link href="/app/settings/billing">Upgrade plan</Link></Button>}
      />
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((row) => (
        <ServiceCard key={row.service} row={row} />
      ))}
    </div>
  );
}

function ServiceCard({ row }: { row: GymServiceRow }) {
  const router = useRouter();
  const fields = FORMS[row.service] ?? [];
  const [pending, setPending] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    for (const f of fields) values[f.name] = String(fd.get(f.name) ?? "");
    setPending(true);
    const r = await saveTenantCreds(row.service as IntegrationService, values);
    setPending(false);
    if (r.ok) { toast.success("Saved — now test the connection"); router.refresh(); } else toast.error(r.error);
  }

  async function onTest() {
    setTesting(true);
    const r = await testTenantCreds(row.service as IntegrationService);
    setTesting(false);
    if (r.ok) toast.success("Connection verified"); else toast.error(r.error);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{SERVICE_LABELS[row.service]}</CardTitle>
        {row.credStatus === "verified" ? (
          <Badge variant="success"><CheckCircle2 className="size-3.5" /> Verified</Badge>
        ) : row.credStatus === "failed" ? (
          <Badge variant="destructive"><TriangleAlert className="size-3.5" /> Failed</Badge>
        ) : row.credStatus === "unverified" ? (
          <Badge variant="warning">Unverified</Badge>
        ) : (
          <Badge variant="muted">Not connected</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {row.keyHint && <p className="font-mono text-xs text-muted-foreground">Current: {row.keyHint}</p>}
        {row.credStatus === "failed" && row.error && <p className="text-xs text-destructive">{row.error}</p>}

        <form onSubmit={onSave} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={`${row.service}-${f.name}`}>{f.label}</Label>
              <Input id={`${row.service}-${f.name}`} name={f.name} type={f.secret ? "password" : "text"} placeholder={f.placeholder} autoComplete="off" />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Secrets are encrypted at rest and never shown again after saving.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : row.credStatus ? "Update keys" : "Save keys"}</Button>
            {row.credStatus && (
              <Button type="button" variant="outline" onClick={onTest} disabled={testing}>{testing ? "Testing…" : "Test connection"}</Button>
            )}
            {row.credStatus && (
              <ConfirmDialog
                title={`Remove ${SERVICE_LABELS[row.service]} keys?`}
                description="This gym will fall back to platform keys (if allowed) or lose this integration."
                confirmLabel="Remove"
                onConfirm={async () => { const r = await deleteTenantCreds(row.service as IntegrationService); if (r.ok) { toast.success("Removed"); router.refresh(); } else toast.error(r.error); }}
                trigger={<Button type="button" variant="ghost" size="sm">Remove</Button>}
              />
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
