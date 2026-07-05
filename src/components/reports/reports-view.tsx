"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RevenueChart } from "@/components/dashboard/charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney, formatMoneyCompact } from "@/lib/format";
import type { ReportData } from "@/lib/queries/reports";

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView({ data }: { data: ReportData }) {
  const router = useRouter();
  const [from, setFrom] = React.useState(data.from);
  const [to, setTo] = React.useState(data.to);

  function apply() {
    router.push(`/app/reports?from=${from}&to=${to}`);
  }

  const maxAtt = Math.max(1, ...data.attendanceHeat.map((d) => d.count));

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Revenue, retention, cash book and GST — for any date range.">
        <div className="flex items-end gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
          <Button onClick={apply}>Apply</Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} label="Cash in" value={data.totalInPaise} format={formatMoneyCompact} />
        <StatCard index={1} label="Cash out" value={data.totalOutPaise} format={formatMoneyCompact} />
        <StatCard index={2} label="New members" value={data.newMembers} />
        <StatCard index={3} label="GST collected" value={data.gstCollectedPaise} format={formatMoneyCompact} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
          <CardContent>
            {data.revenueByMonth.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No revenue in range.</p> : <RevenueChart data={data.revenueByMonth} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Plan-wise members</CardTitle></CardHeader>
          <CardContent>
            {data.planSplit.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No active members.</p> : (
              <ul className="space-y-2">
                {data.planSplit.map((p) => (
                  <li key={p.plan} className="flex items-center justify-between text-sm"><span>{p.plan}</span><span className="tnum font-medium">{p.count}</span></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Enquiry funnel</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.enquiryFunnel.map((s) => (
                <li key={s.stage} className="flex items-center justify-between text-sm"><span>{s.stage}</span><span className="tnum font-medium">{s.count}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Attendance heat (by weekday)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              {data.attendanceHeat.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded bg-primary/80" style={{ height: `${8 + (d.count / maxAtt) * 96}px` }} />
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                  <span className="tnum text-[10px] text-muted-foreground">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Collections by staff</CardTitle>
          <Button size="sm" variant="outline" onClick={() => downloadCsv("collections.csv", data.collectionsByStaff.map((c) => ({ Staff: c.name, Amount: c.amountPaise / 100 })))}><Download className="size-4" /> CSV</Button>
        </CardHeader>
        <CardContent>
          {data.collectionsByStaff.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No collections in range.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead className="text-right">Collected</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.collectionsByStaff.map((c) => (
                  <TableRow key={c.name}><TableCell>{c.name}</TableCell><TableCell className="text-right tnum">{formatMoney(c.amountPaise)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Cash book / day book</CardTitle>
          <Button size="sm" variant="outline" onClick={() => downloadCsv("cashbook.csv", data.cashbook.map((e) => ({ Date: e.occurredAt, Source: e.source, Description: e.description, In: e.direction === "in" ? e.amountPaise / 100 : "", Out: e.direction === "out" ? e.amountPaise / 100 : "", Balance: e.balancePaise / 100 })))}><Download className="size-4" /> CSV</Button>
        </CardHeader>
        <CardContent>
          {data.cashbook.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No entries in range.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Source</TableHead><TableHead>Description</TableHead><TableHead className="text-right">In</TableHead><TableHead className="text-right">Out</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.cashbook.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(e.occurredAt)}</TableCell>
                    <TableCell className="capitalize">{e.source}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right tnum text-success">{e.direction === "in" ? formatMoney(e.amountPaise) : "—"}</TableCell>
                    <TableCell className="text-right tnum text-destructive">{e.direction === "out" ? formatMoney(e.amountPaise) : "—"}</TableCell>
                    <TableCell className="text-right tnum font-medium">{formatMoney(e.balancePaise)}</TableCell>
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
