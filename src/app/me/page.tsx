import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CreditCard, QrCode, Zap } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { portalHome } from "@/lib/queries/portal";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewForm } from "@/components/portal/review-form";
import { daysLeft, deriveStatus, statusLabel } from "@/lib/membership";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "My membership" };
export const dynamic = "force-dynamic";

export default async function MemberHome() {
  const ctx = await requireMember();
  const data = await portalHome(ctx.gym.id, ctx.member.id);

  const status = data.currentSub ? deriveStatus({ endDate: data.currentSub.endDate, status: data.currentSub.status }) : "none";
  const left = data.currentSub ? Math.max(0, daysLeft(data.currentSub.endDate)) : 0;
  const ringPct = data.currentSub ? Math.min(100, Math.max(0, (left / 30) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={`Hi, ${ctx.member.fullName.split(" ")[0]}`} description={`Your membership at ${ctx.gym.name}.`} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Plan card with expiry ring */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Your plan</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-5">
            <div className="relative size-24 shrink-0">
              <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${ringPct} 100`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="tnum font-display text-xl font-semibold">{left}</span>
                <span className="text-[10px] text-muted-foreground">days left</span>
              </div>
            </div>
            <div>
              <p className="font-display text-lg font-semibold">{data.currentSub?.planName ?? "No active plan"}</p>
              {data.currentSub && <p className="text-sm text-muted-foreground">Expires {formatDate(data.currentSub.endDate)}</p>}
              <Badge variant={status === "active" ? "success" : status === "expiring" ? "warning" : "muted"} className="mt-2">{statusLabel[status] ?? "—"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dues + next class */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center gap-2"><CreditCard className="size-4 text-primary" /><CardTitle>Dues</CardTitle></CardHeader>
            <CardContent>
              {data.duesPaise > 0 ? (
                <>
                  <p className="tnum font-display text-2xl font-semibold text-destructive">{formatMoney(data.duesPaise)}</p>
                  <Button asChild size="sm" className="mt-3"><Link href="/me/payments">Pay now</Link></Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">All settled. Nothing due.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center gap-2"><CalendarDays className="size-4 text-primary" /><CardTitle>Next class</CardTitle></CardHeader>
            <CardContent>
              {data.nextClass ? (
                <>
                  <p className="font-medium">{data.nextClass.className}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(data.nextClass.date)} · {data.nextClass.time}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No upcoming classes.</p>
                  <Button asChild size="sm" variant="outline" className="mt-3"><Link href="/me/classes">Browse classes</Link></Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/me/qr" icon={QrCode} label="My QR code" />
        <QuickLink href="/me/classes" icon={CalendarDays} label="Book a class" />
        <QuickLink href="/me/workouts" icon={Zap} label="Workout & diet" />
        <QuickLink href="/me/payments" icon={CreditCard} label="Payments" />
      </div>

      <ReviewForm gymName={ctx.gym.name} />
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof QrCode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <span className="grid size-9 place-items-center rounded-md bg-primary/12 text-foreground"><Icon className="size-4" /></span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
