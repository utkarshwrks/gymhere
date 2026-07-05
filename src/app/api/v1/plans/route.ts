import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { membershipPlans } from "@/lib/db/schema";
import { withApiKey } from "@/lib/api/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApiKey(req, { endpoint: "/v1/plans", scope: "read" }, async (ctx) => {
    const rows = await db.select().from(membershipPlans).where(and(eq(membershipPlans.gymId, ctx.gymId), eq(membershipPlans.isArchived, false)));
    return {
      status: 200,
      data: { object: "list", count: rows.length, data: rows.map((p) => ({ id: p.id, name: p.name, price_paise: p.pricePaise, duration_months: p.durationMonths, sessions_per_week: p.sessionsPerWeek })) },
    };
  });
}
