import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireGym } from "@/lib/auth";
import { getLiveBoard } from "@/lib/actions/devices";
import { PageHeader } from "@/components/shared/page-header";
import { LiveBoard } from "@/components/attendance/live-board";

export const metadata: Metadata = { title: "Live attendance" };
export const dynamic = "force-dynamic";

export default async function LiveBoardPage() {
  await requireGym();
  const initial = await getLiveBoard();
  return (
    <div className="space-y-6">
      <Link href="/app/attendance" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Attendance
      </Link>
      <PageHeader title="Live attendance board" description="Everyone currently on the floor, colour-coded by membership status.">
        <Link href="/app/attendance/simulator" className="text-sm text-primary underline-offset-4 hover:underline">Device simulator →</Link>
      </PageHeader>
      <LiveBoard initial={initial} />
    </div>
  );
}
