import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes } from "@/lib/db/schema";
import { withApiKey } from "@/lib/api/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApiKey(req, { endpoint: "/v1/classes", scope: "read" }, async (ctx) => {
    const rows = await db.select().from(classes).where(eq(classes.gymId, ctx.gymId));
    return {
      status: 200,
      data: { object: "list", count: rows.length, data: rows.map((c) => ({ id: c.id, name: c.name, capacity: c.capacity, duration_mins: c.durationMins })) },
    };
  });
}
