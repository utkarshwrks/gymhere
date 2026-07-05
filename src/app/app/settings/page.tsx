import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { batches, holidays } from "@/lib/db/schema";
import { ensureDefaultStages } from "@/lib/queries/enquiries";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireGym();
  const [batchRows, holidayRows, stages] = await Promise.all([
    db.select().from(batches).where(eq(batches.gymId, ctx.gym.id)).orderBy(asc(batches.name)),
    db.select().from(holidays).where(eq(holidays.gymId, ctx.gym.id)).orderBy(asc(holidays.date)),
    ensureDefaultStages(ctx.gym.id),
  ]);

  return (
    <SettingsView
      gymName={ctx.gym.name}
      batches={batchRows.map((b) => ({ id: b.id, name: b.name, startTime: b.startTime, endTime: b.endTime }))}
      holidays={holidayRows.map((h) => ({ id: h.id, name: h.name, date: h.date }))}
      stages={stages.map((s) => ({ id: s.id, name: s.name, isTerminal: s.isTerminal }))}
    />
  );
}
