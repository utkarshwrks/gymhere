"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, QrCode, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { checkInMember } from "@/lib/actions/members";
import { formatDateTime, initials } from "@/lib/format";
import type { LogEntry } from "@/lib/queries/attendance";

interface MemberLite {
  id: string;
  fullName: string;
  phone: string;
  photoUrl: string | null;
}

export function AttendanceView({
  members,
  log,
  selectedDate,
  todayCount,
}: {
  members: MemberLite[];
  log: LogEntry[];
  selectedDate: string;
  todayCount: number;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  const matches = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return members
      .filter((m) => m.fullName.toLowerCase().includes(t) || m.phone.includes(t))
      .slice(0, 8);
  }, [q, members]);

  async function checkIn(m: MemberLite) {
    setBusy(m.id);
    const r = await checkInMember(m.id);
    setBusy(null);
    if (r.ok) {
      toast.success(`Checked in ${m.fullName}`);
      setQ("");
      router.refresh();
    } else toast.error(r.error);
  }

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Search a member and check them in, or review the daily log.">
        <Button asChild variant="outline"><Link href="/app/attendance/scan"><QrCode className="size-4" /> Scan QR</Link></Button>
        <Button asChild variant="outline"><Link href="/app/attendance/live">Live board</Link></Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Quick check-in</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone…" className="pl-8" autoFocus />
            </div>
            <div className="space-y-2">
              {q && matches.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No members match “{q}”.</p>}
              {matches.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {m.photoUrl && <AvatarImage src={m.photoUrl} alt={m.fullName} />}
                      <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{m.fullName}</p>
                      <p className="text-xs text-muted-foreground">{m.phone}</p>
                    </div>
                  </div>
                  <Button size="sm" disabled={busy === m.id} onClick={() => checkIn(m)}>
                    <Zap className="size-4" /> {busy === m.id ? "…" : "Check in"}
                  </Button>
                </div>
              ))}
              {!q && <p className="py-6 text-center text-sm text-muted-foreground">Start typing to find a member.</p>}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StatCard label={isToday ? "Today's check-ins" : "Check-ins this day"} value={todayCount} live={isToday} icon={CalendarCheck} />
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>Daily log</CardTitle>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => router.push(`/app/attendance?date=${e.target.value}`)}
                className="w-auto"
              />
            </CardHeader>
            <CardContent>
              {log.length === 0 ? (
                <EmptyState icon={CalendarCheck} title="No check-ins" description="No one has checked in on this day yet." />
              ) : (
                <ul className="divide-y">
                  {log.map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-2.5">
                      <span className="text-sm font-medium">{e.memberName}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{e.method}</span> · {formatDateTime(e.checkInAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
