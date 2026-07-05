"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Bell, GripVertical, Phone, Plus, Upload, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  convertEnquiry,
  createEnquiry,
  importLeads,
  moveEnquiry,
  scheduleFollowup,
} from "@/lib/actions/enquiries";
import { fromNow } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface KStage {
  id: string;
  name: string;
  isWon: boolean;
  isTerminal: boolean;
}
export interface KEnquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  source: string;
  stageId: string;
  nextFollowupAt: string | null;
  followupDue: boolean;
  convertedMemberId: string | null;
}
type PlanOpt = { id: string; name: string };

export function KanbanBoard({
  stages,
  initial,
  plans,
}: {
  stages: KStage[];
  initial: Record<string, KEnquiry[]>;
  plans: PlanOpt[];
}) {
  const router = useRouter();
  const [board, setBoard] = React.useState(initial);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  React.useEffect(() => setBoard(initial), [initial]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const findCard = (id: string): { card: KEnquiry; stageId: string } | null => {
    for (const [stageId, list] of Object.entries(board)) {
      const card = list.find((c) => c.id === id);
      if (card) return { card, stageId };
    }
    return null;
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeCardId = String(active.id);
    const found = findCard(activeCardId);
    if (!found) return;

    // over.id is either a stage droppable id or another card id.
    const overStageId = board[String(over.id)] ? String(over.id) : findCard(String(over.id))?.stageId;
    if (!overStageId || overStageId === found.stageId) return;

    const prev = board;
    const card = { ...found.card, stageId: overStageId };
    setBoard((b) => {
      const next: Record<string, KEnquiry[]> = {};
      for (const [sid, list] of Object.entries(b)) next[sid] = list.filter((c) => c.id !== activeCardId);
      next[overStageId] = [card, ...(next[overStageId] ?? [])];
      return next;
    });

    const res = await moveEnquiry({ enquiryId: activeCardId, stageId: overStageId, sortOrder: 0 });
    if (!res.ok) {
      setBoard(prev);
      toast.error(res.error);
    } else {
      const stage = stages.find((s) => s.id === overStageId);
      if (stage?.isWon) toast.message(`${card.name} marked ${stage.name} — convert to a member?`);
    }
  }

  const activeCard = activeId ? findCard(activeId)?.card : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Enquiries" description="Work leads through your pipeline. Drag cards between stages.">
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="size-4" /> Import leads</Button>
        <Button onClick={() => setCaptureOpen(true)}><Plus className="size-4" /> New enquiry</Button>
      </PageHeader>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <Column key={stage.id} stage={stage} cards={board[stage.id] ?? []} plans={plans} />
          ))}
        </div>
        <DragOverlay>{activeCard ? <CardBody card={activeCard} dragging /> : null}</DragOverlay>
      </DndContext>

      <CaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} onDone={() => router.refresh()} />
      <ImportLeadsDialog open={importOpen} onOpenChange={setImportOpen} onDone={() => router.refresh()} />
    </div>
  );
}

function Column({ stage, cards, plans }: { stage: KStage; cards: KEnquiry[]; plans: PlanOpt[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", stage.isWon ? "bg-success" : stage.isTerminal ? "bg-muted-foreground" : "bg-primary")} />
          <span className="text-sm font-semibold">{stage.name}</span>
        </div>
        <Badge variant="muted">{cards.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
        )}
      >
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} plans={plans} />
        ))}
        {cards.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">Drop leads here</p>}
      </div>
    </div>
  );
}

function DraggableCard({ card, plans }: { card: KEnquiry; plans: PlanOpt[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <CardBody card={card} plans={plans} dragHandle={{ ...listeners, ...attributes }} />
    </div>
  );
}

function CardBody({
  card,
  plans,
  dragHandle,
  dragging,
}: {
  card: KEnquiry;
  plans?: PlanOpt[];
  dragHandle?: Record<string, unknown>;
  dragging?: boolean;
}) {
  const router = useRouter();
  const [followOpen, setFollowOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);

  return (
    <div className={cn("rounded-md border bg-card p-3 shadow-xs", dragging && "shadow-md")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{card.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" /> {card.phone}</p>
        </div>
        <div className="flex items-center gap-1">
          {!dragging && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Lead actions">⋯</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFollowOpen(true)}><Bell className="size-4" /> Schedule follow-up</DropdownMenuItem>
                {!card.convertedMemberId && (
                  <DropdownMenuItem onClick={() => setConvertOpen(true)}><UserCheck className="size-4" /> Convert to member</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing" {...dragHandle} aria-label="Drag">
            <GripVertical className="size-4" />
          </button>
        </div>
      </div>
      {card.interest && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{card.interest}</p>}
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline" className="capitalize">{card.source.replace("_", " ")}</Badge>
        {card.convertedMemberId && <Badge variant="success">Converted</Badge>}
        {card.nextFollowupAt && (
          <span className={cn("flex items-center gap-1 text-[11px]", card.followupDue ? "text-destructive" : "text-muted-foreground")}>
            <Bell className="size-3" /> {fromNow(card.nextFollowupAt)}
          </span>
        )}
      </div>

      {!dragging && (
        <>
          <FollowupDialog open={followOpen} onOpenChange={setFollowOpen} enquiryId={card.id} onDone={() => router.refresh()} />
          <ConvertDialog open={convertOpen} onOpenChange={setConvertOpen} enquiryId={card.id} plans={plans ?? []} onDone={() => router.refresh()} />
        </>
      )}
    </div>
  );
}

function CaptureDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  const [source, setSource] = React.useState("walk_in");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await createEnquiry({
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      interest: String(fd.get("interest") ?? ""),
      source: source as "walk_in" | "phone" | "website" | "referral" | "social" | "other",
    });
    setPending(false);
    if (r.ok) { toast.success("Enquiry added"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New enquiry</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="e-name">Name</Label><Input id="e-name" name="name" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="e-phone">Phone</Label><Input id="e-phone" name="phone" required /></div>
            <div className="space-y-1.5"><Label htmlFor="e-email">Email</Label><Input id="e-email" name="email" type="email" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="e-interest">Interested in</Label><Input id="e-interest" name="interest" placeholder="Weight training" /></div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add enquiry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FollowupDialog({ open, onOpenChange, enquiryId, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; enquiryId: string; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await scheduleFollowup({ enquiryId, dueAt: String(fd.get("dueAt")), note: String(fd.get("note") ?? "") });
    setPending(false);
    if (r.ok) { toast.success("Follow-up scheduled"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Schedule follow-up</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="f-due">When</Label><Input id="f-due" name="dueAt" type="datetime-local" required /></div>
          <div className="space-y-1.5"><Label htmlFor="f-note">Note</Label><Input id="f-note" name="note" placeholder="Call back about trial" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Schedule"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({ open, onOpenChange, enquiryId, plans, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; enquiryId: string; plans: PlanOpt[]; onDone: () => void }) {
  const [planId, setPlanId] = React.useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [pending, setPending] = React.useState(false);

  async function run() {
    if (!planId) return toast.error("Pick a plan.");
    setPending(true);
    const r = await convertEnquiry({ enquiryId, planId, startDate });
    setPending(false);
    if (r.ok) { toast.success("Lead converted to member"); onOpenChange(false); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to member</DialogTitle>
          <DialogDescription>Creates a member from this lead and closes the enquiry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={pending || plans.length === 0}>{pending ? "Converting…" : "Convert"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportLeadsDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [rows, setRows] = React.useState<{ name: string; phone: string; email?: string; interest?: string }[]>([]);
  const [pending, setPending] = React.useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = res.data
          .map((r) => ({
            name: (r.Name ?? r.name ?? "").trim(),
            phone: (r.Phone ?? r.phone ?? r.Mobile ?? "").trim(),
            email: (r.Email ?? r.email ?? "").trim(),
            interest: (r.Interest ?? r.interest ?? "").trim(),
          }))
          .filter((r) => r.name && r.phone);
        setRows(parsed);
        toast.message(`Parsed ${parsed.length} leads`);
      },
    });
  }

  async function run() {
    setPending(true);
    const r = await importLeads({ rows, source: "other" });
    setPending(false);
    if (r.ok) { toast.success(`Imported ${r.created} leads`); onOpenChange(false); setRows([]); onDone(); }
    else toast.error(r.error ?? "Import failed");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import leads (tele-calling)</DialogTitle>
          <DialogDescription>CSV with columns Name, Phone, optional Email and Interest.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept=".csv,text/csv" onChange={onFile} />
          {rows.length > 0 && <p className="text-xs text-muted-foreground">{rows.length} valid leads ready.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={pending || rows.length === 0}>{pending ? "Importing…" : "Import"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
