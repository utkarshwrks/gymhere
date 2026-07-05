import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gyms } from "@/lib/db/schema";
import { logActivity } from "@/lib/db/activity";
import { getRetention } from "@/lib/queries/retention";
import { env, isConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly retention sweep (Vercel Cron). Flags irregular members per gym and
 * records a summary in the activity feed; Phase 3 turns these into reminders.
 * Authorized by CRON_SECRET when set (Vercel injects it automatically).
 */
export async function GET(req: Request) {
  if (env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!isConfigured.db) {
    return NextResponse.json({ ok: true, skipped: "db not configured" });
  }

  const allGyms = await db.select({ id: gyms.id }).from(gyms);
  let totalIrregular = 0;

  for (const gym of allGyms) {
    const rows = await getRetention(gym.id, 7);
    const irregular = rows.filter((r) => r.irregular);
    totalIrregular += irregular.length;
    if (irregular.length > 0) {
      await logActivity({
        gymId: gym.id,
        action: "member.checked_in",
        entity: "retention",
        summary: `${irregular.length} irregular member(s) flagged`,
        meta: { irregular: irregular.length, scannedAt: new Date().toISOString() },
      });
    }
  }

  return NextResponse.json({ ok: true, gyms: allGyms.length, totalIrregular });
}
