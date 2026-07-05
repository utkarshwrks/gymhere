"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Eye, MoreVertical, Upload, UserPlus, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusDot } from "@/components/shared/status-dot";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddMemberWizard } from "@/components/members/add-member-wizard";
import { checkInMember } from "@/lib/actions/members";
import { importMembers } from "@/lib/actions/member-import";
import { deriveStatus, statusLabel, statusToTone } from "@/lib/membership";
import { formatDate, initials } from "@/lib/format";

export interface MemberRowVM {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  planName: string | null;
  endDate: string | null;
  joinDate: string;
  subStatus: string | null;
}
interface PlanOpt {
  id: string;
  name: string;
  pricePaise: number;
  durationMonths: number;
}

function rowStatus(r: MemberRowVM) {
  return deriveStatus(r.endDate ? { endDate: r.endDate, status: r.subStatus ?? "active" } : null);
}

export function MembersView({
  rows,
  plans,
  batches,
  atCap,
  memberCap,
}: {
  rows: MemberRowVM[];
  plans: PlanOpt[];
  batches: { id: string; name: string }[];
  atCap: boolean;
  memberCap: number | null;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  function exportCsv() {
    const data = rows.map((r) => ({
      Name: r.fullName,
      Phone: r.phone,
      Email: r.email ?? "",
      Plan: r.planName ?? "",
      Status: statusLabel[rowStatus(r) === "none" ? "none" : rowStatus(r)],
      Expiry: r.endDate ?? "",
      Joined: r.joinDate,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: ColumnDef<MemberRowVM>[] = [
    {
      accessorKey: "fullName",
      header: "Member",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <Link href={`/app/members/${m.id}`} className="flex items-center gap-3">
            <Avatar className="size-8">
              {m.photoUrl && <AvatarImage src={m.photoUrl} alt={m.fullName} />}
              <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium leading-tight hover:underline">{m.fullName}</p>
              <p className="text-xs text-muted-foreground">{m.phone}</p>
            </div>
          </Link>
        );
      },
    },
    { accessorKey: "planName", header: "Plan", cell: ({ row }) => row.original.planName ?? <span className="text-muted-foreground">—</span> },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = rowStatus(row.original);
        return <StatusDot tone={statusToTone[s]} label={statusLabel[s]} />;
      },
    },
    {
      accessorKey: "endDate",
      header: "Expiry",
      cell: ({ row }) => (row.original.endDate ? formatDate(row.original.endDate) : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/app/members/${m.id}`}><Eye className="size-4" /> View profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const r = await checkInMember(m.id);
                    if (r.ok) { toast.success(`Checked in ${m.fullName}`); router.refresh(); }
                    else toast.error(r.error);
                  }}
                >
                  <Zap className="size-4" /> Check in
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={memberCap ? `${rows.length} of ${memberCap} members used` : `${rows.length} members`}
      >
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="size-4" /> Export
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="size-4" /> Import
        </Button>
        <Button onClick={() => (atCap ? toast.error(`Member cap reached (${memberCap}). Upgrade to add more.`) : setAddOpen(true))}>
          <UserPlus className="size-4" /> Add member
        </Button>
      </PageHeader>

      {atCap && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          You&apos;ve reached your plan&apos;s member cap ({memberCap}).{" "}
          <Link href="/pricing" className="font-medium underline-offset-4 hover:underline">Upgrade your plan</Link> to add more members.
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        searchKey="fullName"
        searchPlaceholder="Search by name, phone, plan…"
        emptyState={
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Add your first member or import a list from CSV to get started."
            action={<Button onClick={() => setAddOpen(true)}><UserPlus className="size-4" /> Add member</Button>}
          />
        }
        mobileCard={(m) => {
          const s = rowStatus(m);
          return (
            <Link href={`/app/members/${m.id}`} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  {m.photoUrl && <AvatarImage src={m.photoUrl} alt={m.fullName} />}
                  <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{m.fullName}</p>
                  <p className="text-xs text-muted-foreground">{m.planName ?? "No plan"}</p>
                </div>
              </div>
              <StatusDot tone={statusToTone[s]} label={statusLabel[s]} />
            </Link>
          );
        }}
      />

      <AddMemberWizard open={addOpen} onOpenChange={setAddOpen} plans={plans} batches={batches} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} plans={plans} />
    </div>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  plans,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: PlanOpt[];
}) {
  const router = useRouter();
  const [planId, setPlanId] = React.useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [parsed, setParsed] = React.useState<{ fullName: string; phone: string; email?: string }[]>([]);
  const [pending, setPending] = React.useState(false);
  const [fileName, setFileName] = React.useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data
          .map((r) => ({
            fullName: (r.Name ?? r.name ?? r.fullName ?? r["Full Name"] ?? "").trim(),
            phone: (r.Phone ?? r.phone ?? r.Mobile ?? r.mobile ?? "").trim(),
            email: (r.Email ?? r.email ?? "").trim(),
          }))
          .filter((r) => r.fullName || r.phone);
        setParsed(rows);
        toast.message(`Parsed ${rows.length} rows from ${file.name}`);
      },
      error: () => toast.error("Could not parse that CSV."),
    });
  }

  async function run() {
    if (!planId) return toast.error("Pick a plan for imported members.");
    if (parsed.length === 0) return toast.error("Upload a CSV first.");
    setPending(true);
    const res = await importMembers({ planId, startDate, rows: parsed });
    setPending(false);
    if (!res.ok) return toast.error(res.error ?? "Import failed");
    toast.success(`Imported ${res.created}, skipped ${res.skipped}`);
    if (res.errors.length) res.errors.slice(0, 3).forEach((e) => toast.warning(e));
    onOpenChange(false);
    setParsed([]);
    setFileName("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import members from CSV</DialogTitle>
          <DialogDescription>
            CSV with columns <code className="rounded bg-muted px-1">Name</code>, <code className="rounded bg-muted px-1">Phone</code>, and optional <code className="rounded bg-muted px-1">Email</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Assign plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>CSV file</Label>
            <Input type="file" accept=".csv,text/csv" onChange={onFile} />
            {fileName && <p className="text-xs text-muted-foreground">{fileName} — {parsed.length} valid rows</p>}
          </div>
          <a
            href={"data:text/csv;charset=utf-8," + encodeURIComponent("Name,Phone,Email\nAnanya Sharma,+919000000001,ananya@email.com")}
            download="members-template.csv"
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Download template
          </a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={pending || parsed.length === 0}>{pending ? "Importing…" : `Import ${parsed.length || ""}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
