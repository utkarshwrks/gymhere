"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBatch, createHoliday, deleteBatch, deleteHoliday } from "@/lib/actions/settings";
import { renameStage } from "@/lib/actions/enquiries";
import { formatDate } from "@/lib/format";

interface Batch { id: string; name: string; startTime: string | null; endTime: string | null }
interface Holiday { id: string; name: string; date: string }
interface Stage { id: string; name: string; isTerminal: boolean }

export function SettingsView({
  batches,
  holidays,
  stages,
  gymName,
}: {
  batches: Batch[];
  holidays: Holiday[];
  stages: Stage[];
  gymName: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description={`Configure ${gymName}.`} />

      {/* Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Time-slot batches</CardTitle>
          <CardDescription>Assign members to a slot (e.g. 6–7 AM) and filter lists by batch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const r = await createBatch({
                name: String(fd.get("name")),
                startTime: String(fd.get("startTime") || ""),
                endTime: String(fd.get("endTime") || ""),
              });
              if (r.ok) { toast.success("Batch added"); (e.target as HTMLFormElement).reset(); router.refresh(); }
              else toast.error(r.error);
            }}
          >
            <div className="space-y-1.5"><Label>Name</Label><Input name="name" required placeholder="Morning 6–7 AM" /></div>
            <div className="space-y-1.5"><Label>Start</Label><Input name="startTime" type="time" /></div>
            <div className="space-y-1.5"><Label>End</Label><Input name="endTime" type="time" /></div>
            <Button type="submit"><Plus className="size-4" /> Add</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {batches.length === 0 && <p className="text-sm text-muted-foreground">No batches yet.</p>}
            {batches.map((b) => (
              <span key={b.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
                <Clock className="size-3.5 text-muted-foreground" />
                {b.name}
                <button
                  onClick={async () => { const r = await deleteBatch(b.id); if (r.ok) { toast.success("Removed"); router.refresh(); } }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete batch"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader>
          <CardTitle>Holiday calendar</CardTitle>
          <CardDescription>Holidays are excluded from absence and retention math.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const r = await createHoliday({ name: String(fd.get("name")), date: String(fd.get("date")) });
              if (r.ok) { toast.success("Holiday added"); (e.target as HTMLFormElement).reset(); router.refresh(); }
              else toast.error(r.error);
            }}
          >
            <div className="space-y-1.5"><Label>Occasion</Label><Input name="name" required placeholder="Diwali" /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input name="date" type="date" required /></div>
            <Button type="submit"><Plus className="size-4" /> Add</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {holidays.length === 0 && <p className="text-sm text-muted-foreground">No holidays yet.</p>}
            {holidays.map((h) => (
              <span key={h.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
                {h.name} · {formatDate(h.date)}
                <button
                  onClick={async () => { const r = await deleteHoliday(h.id); if (r.ok) { toast.success("Removed"); router.refresh(); } }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete holiday"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enquiry stages */}
      <Card>
        <CardHeader>
          <CardTitle>Enquiry pipeline stages</CardTitle>
          <CardDescription>Rename your CRM stages to match how you sell.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stages.map((s) => (
            <StageRow key={s.id} stage={s} onDone={() => router.refresh()} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StageRow({ stage, onDone }: { stage: Stage; onDone: () => void }) {
  const [name, setName] = React.useState(stage.name);
  const [pending, setPending] = React.useState(false);
  const dirty = name.trim() !== stage.name && name.trim().length > 0;

  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
      {stage.isTerminal && <span className="text-xs text-muted-foreground">terminal</span>}
      <Button
        size="sm"
        variant="outline"
        disabled={!dirty || pending}
        onClick={async () => {
          setPending(true);
          const r = await renameStage({ stageId: stage.id, name: name.trim() });
          setPending(false);
          if (r.ok) { toast.success("Stage renamed"); onDone(); } else toast.error(r.error);
        }}
      >
        Save
      </Button>
    </div>
  );
}
