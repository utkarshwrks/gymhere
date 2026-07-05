import type { Metadata } from "next";
import { format, startOfMonth } from "date-fns";
import { requireGym } from "@/lib/auth";
import { getReports } from "@/lib/queries/reports";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const ctx = await requireGym();
  const sp = await searchParams;
  const from = sp.from ?? format(startOfMonth(new Date()), "yyyy-MM-dd");
  const to = sp.to ?? format(new Date(), "yyyy-MM-dd");

  const data = await getReports(ctx.gym.id, from, to);
  return <ReportsView data={data} />;
}
