import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "lucide-react";
import { requireGym } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRetention } from "@/lib/queries/retention";
import { fromNow } from "@/lib/format";

export const metadata: Metadata = { title: "Retention" };
export const dynamic = "force-dynamic";

export default async function RetentionPage() {
  const ctx = await requireGym();
  const rows = await getRetention(ctx.gym.id, 7);
  const irregular = rows.filter((r) => r.irregular);
  const absent = rows.filter((r) => r.daysSinceLastVisit === null || (r.daysSinceLastVisit ?? 0) >= 14);

  return (
    <div className="space-y-6">
      <PageHeader title="Retention" description="Catch members drifting away before they lapse." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard index={0} label="Tracked members" value={rows.length} icon="LineChart" />
        <StatCard index={1} label="Irregular (7d)" value={irregular.length} icon="UserX" />
        <StatCard index={2} label="Absent (14d+)" value={absent.length} icon="UserX" />
        <StatCard index={3} label="Regular" value={rows.length - irregular.length} icon="LineChart" />
      </div>

      <Card>
        <CardHeader><CardTitle>Irregular members</CardTitle></CardHeader>
        <CardContent>
          {irregular.length === 0 ? (
            <EmptyState icon={LineChart} title="Everyone's showing up" description="No active member has missed their window. Nice." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead>Days present (30d)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {irregular.map((r) => (
                  <TableRow key={r.memberId}>
                    <TableCell className="font-medium">
                      <Link href={`/app/members/${r.memberId}`} className="hover:underline">{r.name}</Link>
                      <p className="text-xs text-muted-foreground">{r.phone}</p>
                    </TableCell>
                    <TableCell>{r.lastVisit ? fromNow(r.lastVisit) : <span className="text-muted-foreground">Never</span>}</TableCell>
                    <TableCell className="tnum">{r.daysPresent}</TableCell>
                    <TableCell>
                      {r.daysSinceLastVisit === null || r.daysSinceLastVisit >= 14 ? (
                        <Badge variant="destructive">Absent</Badge>
                      ) : (
                        <Badge variant="warning">Irregular</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/app/members/${r.memberId}`}>Follow up</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Last visit shown for the trailing 30 days. These lists become broadcast segments in Phase 3.
        </p>
      )}
    </div>
  );
}
