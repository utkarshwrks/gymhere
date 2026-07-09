"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { addSuperAdmin, removeSuperAdmin } from "@/lib/actions/super-admin";
import { formatDate } from "@/lib/format";
import type { SuperAdminRow } from "@/lib/queries/platform";

export function AdminsView({
  admins,
  currentUserId,
}: {
  admins: SuperAdminRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    const r = await addSuperAdmin(String(fd.get("email") ?? ""));
    setPending(false);
    if (r.ok) {
      toast.success("Super admin added");
      form.reset();
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Super admins" description="Everyone with full platform control. Add by email — they get access on their next sign-in." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add a super admin</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="admin@example.com" />
                <p className="text-xs text-muted-foreground">
                  If they already have an account it&apos;s promoted instantly; otherwise the role is
                  claimed when they first sign in with this email.
                </p>
              </div>
              <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add super admin"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Current super admins</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {admins.map((a) => {
              const isSelf = a.id === currentUserId;
              return (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 shrink-0 text-primary" />
                      <span className="truncate font-medium">{a.name || a.email}</span>
                      {isSelf && <Badge variant="muted">You</Badge>}
                      {a.pending && <Badge variant="warning">Pending sign-in</Badge>}
                    </div>
                    {a.name && <p className="truncate text-sm text-muted-foreground">{a.email}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">Added {formatDate(a.createdAt)}</p>
                  </div>
                  {!isSelf && (
                    <ConfirmDialog
                      title={`Remove ${a.name || a.email}?`}
                      description="They lose all platform access. If they own no gym they'll have nothing to sign in to."
                      confirmLabel="Remove access"
                      onConfirm={async () => { const r = await removeSuperAdmin(a.id); if (r.ok) { toast.success("Access removed"); router.refresh(); } else toast.error(r.error); }}
                      trigger={<Button variant="ghost" size="sm"><UserMinus className="size-4" /> Remove</Button>}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
