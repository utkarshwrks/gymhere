import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { withApiKey } from "@/lib/api/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApiKey(req, { endpoint: "/v1/invoices", scope: "read" }, async (ctx) => {
    const rows = await db.select().from(invoices).where(eq(invoices.gymId, ctx.gymId)).orderBy(desc(invoices.createdAt)).limit(200);
    return {
      status: 200,
      data: { object: "list", count: rows.length, data: rows.map((i) => ({ id: i.id, number: i.number, member_id: i.memberId, status: i.status, total_paise: i.totalPaise, due_paise: i.duePaise, issued_on: i.issuedOn })) },
    };
  });
}
