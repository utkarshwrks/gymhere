import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImpersonateButton } from "@/components/super-admin/impersonate-button";
import { tenantDetail } from "@/lib/queries/platform";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Gym detail" };
export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await tenantDetail(id);
  if (!detail) notFound();
  const { gym, memberCount, subscriptions, invoices } = detail;

  return (
    <div className="space-y-6">
      <Link href="/sa/tenants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All gyms
      </Link>
      <PageHeader title={gym.name} description={`/g/${gym.slug}`}>
        <Badge variant={gym.status === "active" ? "success" : "destructive"} className="capitalize">{gym.status}</Badge>
        <ImpersonateButton gymId={gym.id} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard index={0} label="Members" value={memberCount} />
        <StatCard index={1} label="Subscriptions" value={subscriptions.length} />
        <StatCard index={2} label="Invoices" value={invoices.length} />
      </div>

      <Card>
        <CardHeader><CardTitle>Subscription history</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Trial ends</TableHead><TableHead>Started</TableHead></TableRow></TableHeader>
            <TableBody>
              {subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.plan}</TableCell>
                  <TableCell><Badge variant="muted" className="capitalize">{s.status}</Badge></TableCell>
                  <TableCell>{s.trialEndsAt ? formatDate(s.trialEndsAt) : "—"}</TableCell>
                  <TableCell>{formatDate(s.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent invoices</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No invoices.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.number}</TableCell>
                    <TableCell><Badge variant="muted" className="capitalize">{i.status}</Badge></TableCell>
                    <TableCell className="text-right tnum">{formatMoney(i.totalPaise)}</TableCell>
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
