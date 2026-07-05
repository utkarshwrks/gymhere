"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createTemplate, sendBroadcast } from "@/lib/actions/comms";
import { formatDateTime } from "@/lib/format";

interface Template { id: string; name: string; channel: string; subject: string | null; body: string }
interface Group { id: string; name: string }
interface OutboxRow { id: string; channel: string; to: string; subject: string | null; status: string; provider: string | null; createdAt: string }

const SEGMENTS = [
  { value: "all", label: "All members" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "irregular", label: "Irregular" },
  { value: "pending_dues", label: "Pending dues" },
];

export function MessagesView({ templates, groups, outbox }: { templates: Template[]; groups: Group[]; outbox: OutboxRow[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Broadcasts, templates and delivery log." />
      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="outbox">Outbox</TabsTrigger>
        </TabsList>
        <TabsContent value="compose"><Compose templates={templates} groups={groups} /></TabsContent>
        <TabsContent value="templates"><Templates templates={templates} /></TabsContent>
        <TabsContent value="outbox"><Outbox outbox={outbox} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Compose({ templates, groups }: { templates: Template[]; groups: Group[] }) {
  const router = useRouter();
  const [segment, setSegment] = React.useState("active");
  const [groupId, setGroupId] = React.useState("");
  const [channel, setChannel] = React.useState<"email" | "sms" | "whatsapp">("email");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("Hi {{name}}, ");
  const [pending, setPending] = React.useState(false);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (t) { setChannel(t.channel as typeof channel); setSubject(t.subject ?? ""); setBody(t.body); }
  }

  async function send() {
    if (!body.trim()) return toast.error("Write a message.");
    setPending(true);
    const r = await sendBroadcast({ segment: segment as "active", groupId, channel, subject, body });
    setPending(false);
    if (r.ok) { toast.success(`Broadcast queued to ${r.data?.sent ?? 0} recipients`); router.refresh(); } else toast.error(r.error);
  }

  return (
    <Card>
      <CardHeader><CardTitle>New broadcast</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Audience</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                {groups.length > 0 && <SelectItem value="group">Custom group…</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {segment === "group" && (
            <div className="space-y-1.5"><Label>Group</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder="Group" /></SelectTrigger>
                <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
            </Select>
          </div>
          {templates.length > 0 && (
            <div className="space-y-1.5"><Label>From template</Label>
              <Select value="" onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        {channel === "email" && (
          <div className="space-y-1.5"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        )}
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{"{{name}}"}</code> to personalise. SMS/WhatsApp are logged to the outbox in demo mode.</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={send} disabled={pending}><Send className="size-4" /> {pending ? "Sending…" : "Send broadcast"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Templates({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [channel, setChannel] = React.useState<"email" | "sms" | "whatsapp">("email");
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createTemplate({ name: String(fd.get("name")), channel, subject: String(fd.get("subject") || ""), body: String(fd.get("body")) });
    setPending(false);
    if (r.ok) { toast.success("Template saved"); (e.target as HTMLFormElement).reset(); router.refresh(); } else toast.error(r.error);
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>New template</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Name</Label><Input name="name" required placeholder="Renewal reminder" /></div>
              <div className="space-y-1.5"><Label>Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Subject</Label><Input name="subject" placeholder="Time to renew, {{name}}" /></div>
            <div className="space-y-1.5"><Label>Body</Label><Textarea name="body" rows={4} required defaultValue="Hi {{name}}, your membership expires on {{expiry_date}}." /></div>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save template"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Saved templates</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No templates yet.</p> : templates.map((t) => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between"><span className="font-medium">{t.name}</span><Badge variant="muted" className="capitalize">{t.channel}</Badge></div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Outbox({ outbox }: { outbox: OutboxRow[] }) {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  async function runReminders() {
    setRunning(true);
    try {
      const res = await fetch("/api/cron/reminders");
      const json = await res.json();
      toast.success(`Reminders run — queued ${json.queued ?? 0}`);
      router.refresh();
    } catch {
      toast.error("Could not run reminders");
    } finally {
      setRunning(false);
    }
  }
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Delivery log</CardTitle>
        <Button size="sm" variant="outline" onClick={runReminders} disabled={running}>{running ? "Running…" : "Run daily reminders"}</Button>
      </CardHeader>
      <CardContent>
        {outbox.length === 0 ? (
          <EmptyState icon={Megaphone} title="Nothing sent yet" description="Broadcasts and reminders will appear here with their delivery status." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>To</TableHead><TableHead>Channel</TableHead><TableHead>Subject</TableHead><TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
            <TableBody>
              {outbox.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="max-w-[160px] truncate">{o.to}</TableCell>
                  <TableCell className="capitalize">{o.channel}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{o.subject ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{o.provider ?? "—"}</TableCell>
                  <TableCell><Badge variant={o.status === "sent" ? "success" : o.status === "failed" ? "destructive" : "muted"} className="capitalize">{o.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
