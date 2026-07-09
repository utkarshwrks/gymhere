"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CircleCheck, Eye, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteGym, setGymStatus, startImpersonation } from "@/lib/actions/super-admin";
import type { TenantRow } from "@/lib/queries/platform";

export function TenantsTable({ tenants }: { tenants: TenantRow[] }) {
  const router = useRouter();

  const columns: ColumnDef<TenantRow>[] = [
    {
      accessorKey: "name",
      header: "Gym",
      cell: ({ row }) => (
        <Link href={`/sa/tenants/${row.original.id}`} className="font-medium hover:underline">{row.original.name}</Link>
      ),
    },
    { accessorKey: "tier", header: "Tier", cell: ({ row }) => <Badge variant="muted">{row.original.tier}</Badge> },
    { accessorKey: "subStatus", header: "Subscription", cell: ({ row }) => <span className="capitalize text-muted-foreground">{row.original.subStatus}</span> },
    { accessorKey: "memberCount", header: "Members", cell: ({ row }) => <span className="tnum">{row.original.memberCount}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusDot tone={row.original.status === "active" ? "success" : "danger"} label={row.original.status === "active" ? "Active" : "Suspended"} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link href={`/sa/tenants/${t.id}`}><Eye className="size-4" /> View</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={() => startImpersonation(t.id)}><Eye className="size-4" /> Impersonate</DropdownMenuItem>
                {t.status === "active" ? (
                  <ConfirmDialog
                    title={`Suspend ${t.name}?`}
                    description="The gym's team will see a suspension notice and be blocked until reactivated."
                    confirmLabel="Suspend"
                    onConfirm={async () => { const r = await setGymStatus(t.id, "suspended"); if (r.ok) { toast.success("Gym suspended"); router.refresh(); } else toast.error(r.error); }}
                    trigger={<DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}><Ban className="size-4" /> Suspend</DropdownMenuItem>}
                  />
                ) : (
                  <DropdownMenuItem onClick={async () => { const r = await setGymStatus(t.id, "active"); if (r.ok) { toast.success("Gym reactivated"); router.refresh(); } else toast.error(r.error); }}>
                    <CircleCheck className="size-4" /> Reactivate
                  </DropdownMenuItem>
                )}
                <ConfirmDialog
                  title={`Delete ${t.name}?`}
                  description="This permanently deletes the gym and ALL its data — members, billing, attendance, staff and the owner account. This cannot be undone."
                  confirmLabel="Delete permanently"
                  onConfirm={async () => { const r = await deleteGym(t.id); if (r.ok) { toast.success("Gym deleted"); router.refresh(); } else toast.error(r.error); }}
                  trigger={<DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="size-4" /> Delete</DropdownMenuItem>}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable columns={columns} data={tenants} searchKey="name" searchPlaceholder="Search gyms…" />
  );
}
