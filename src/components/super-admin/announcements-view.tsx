"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createAnnouncement, toggleAnnouncement } from "@/lib/actions/super-admin";
import { formatDate } from "@/lib/format";

interface Announcement { id: string; title: string; body: string | null; isActive: boolean; createdAt: string }

export function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createAnnouncement(String(fd.get("title")), String(fd.get("body") || ""));
    setPending(false);
    if (r.ok) { toast.success("Announcement posted"); (e.target as HTMLFormElement).reset(); router.refresh(); } else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Post a banner shown to every gym admin." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>New announcement</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5"><Label>Title</Label><Input name="title" required placeholder="Scheduled maintenance Sunday" /></div>
              <div className="space-y-1.5"><Label>Details</Label><Textarea name="body" rows={3} /></div>
              <Button type="submit" disabled={pending}>{pending ? "Posting…" : "Post announcement"}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Posted</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Nothing posted" description="Announcements appear as a banner in every gym admin." />
            ) : announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2"><span className="font-medium">{a.title}</span>{a.isActive && <Badge variant="success">Live</Badge>}</div>
                  {a.body && <p className="mt-0.5 text-sm text-muted-foreground">{a.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                </div>
                <Switch checked={a.isActive} onCheckedChange={async (v) => { const r = await toggleAnnouncement(a.id, v); if (r.ok) router.refresh(); else toast.error(r.error); }} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
