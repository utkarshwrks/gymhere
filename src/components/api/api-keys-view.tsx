"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createApiKey, revokeApiKey, rotateApiKey } from "@/lib/actions/api-keys";
import { fromNow } from "@/lib/format";

interface ApiKey { id: string; name: string; prefix: string; isActive: boolean; lastUsedAt: string | null; usedThisMonth: number }

export function ApiKeysView({ hasAccess, keys }: { hasAccess: boolean; keys: ApiKey[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [revealed, setRevealed] = React.useState<string | null>(null);

  if (!hasAccess) {
    return (
      <EmptyState
        icon={KeyRound}
        title="API access is a Pro feature"
        description="Upgrade to the Pro plan to create API keys and integrate your gym with other platforms."
        action={<Button asChild><Link href="/app/settings/billing">Upgrade plan</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New key</Button>
      </div>

      {keys.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys yet" description="Create a key to start calling the GymHere API." action={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New key</Button>} />
      ) : (
        <Card>
          <CardHeader><CardTitle>Your keys</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    <Badge variant={k.isActive ? "success" : "muted"}>{k.isActive ? "Active" : "Revoked"}</Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{k.prefix}</p>
                  <p className="text-xs text-muted-foreground">{k.usedThisMonth} calls this month{k.lastUsedAt ? ` · last used ${fromNow(k.lastUsedAt)}` : ""}</p>
                </div>
                {k.isActive && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={async () => { const r = await rotateApiKey(k.id); if (r.ok) { setRevealed(r.data!.raw); router.refresh(); } else toast.error(r.error); }}>
                      <RefreshCw className="size-4" /> Rotate
                    </Button>
                    <ConfirmDialog
                      title={`Revoke ${k.name}?`}
                      description="Any integration using this key will stop working immediately."
                      confirmLabel="Revoke"
                      onConfirm={async () => { const r = await revokeApiKey(k.id); if (r.ok) { toast.success("Key revoked"); router.refresh(); } else toast.error(r.error); }}
                      trigger={<Button size="sm" variant="outline">Revoke</Button>}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(raw) => { setRevealed(raw); router.refresh(); }} />
      <RevealDialog raw={revealed} onClose={() => setRevealed(null)} />
    </div>
  );
}

function CreateKeyDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (raw: string) => void }) {
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createApiKey(String(fd.get("name")));
    setPending(false);
    if (r.ok) { onOpenChange(false); onCreated(r.data!.raw); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New API key</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Key name</Label><Input name="name" required placeholder="Production integration" /></div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create key"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevealDialog({ raw, onClose }: { raw: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!raw} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy your API key</DialogTitle>
          <DialogDescription>This is shown once. Store it securely — you won&apos;t see it again.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
          <code className="flex-1 break-all font-mono text-sm">{raw}</code>
          <Button size="icon" variant="ghost" onClick={() => { if (raw) { navigator.clipboard.writeText(raw); toast.success("Copied"); } }}><Copy className="size-4" /></Button>
        </div>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
