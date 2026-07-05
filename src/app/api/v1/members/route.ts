import { format } from "date-fns";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { memberSubscriptions, members, membershipPlans } from "@/lib/db/schema";
import { computeEndDate } from "@/lib/membership";
import { randomToken } from "@/lib/slug";
import { withApiKey } from "@/lib/api/context";

export const dynamic = "force-dynamic";

function serialize(m: typeof members.$inferSelect) {
  return { id: m.id, full_name: m.fullName, phone: m.phone, email: m.email, status: m.status, join_date: m.joinDate, qr_token: m.qrToken };
}

export async function GET(req: Request) {
  return withApiKey(req, { endpoint: "/v1/members", scope: "read" }, async (ctx) => {
    const rows = await db.select().from(members).where(eq(members.gymId, ctx.gymId)).orderBy(desc(members.createdAt)).limit(200);
    return { status: 200, data: { object: "list", count: rows.length, data: rows.map(serialize) } };
  });
}

const createSchema = z.object({
  full_name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional(),
  plan_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
});

export async function POST(req: Request) {
  return withApiKey(req, { endpoint: "/v1/members", scope: "write" }, async (ctx) => {
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return { status: 422, data: { error: parsed.error.issues[0]?.message ?? "Invalid body" } };
    const d = parsed.data;

    const [member] = await db.insert(members).values({
      gymId: ctx.gymId,
      fullName: d.full_name,
      phone: d.phone,
      email: d.email ?? null,
      status: "active",
      qrToken: randomToken("ghm"),
      joinDate: d.start_date ?? format(new Date(), "yyyy-MM-dd"),
    }).returning();

    if (d.plan_id) {
      const plan = await db.query.membershipPlans.findFirst({ where: eq(membershipPlans.id, d.plan_id) });
      if (plan && plan.gymId === ctx.gymId) {
        const start = d.start_date ?? format(new Date(), "yyyy-MM-dd");
        await db.insert(memberSubscriptions).values({
          gymId: ctx.gymId, memberId: member.id, planId: plan.id, planName: plan.name,
          startDate: start, endDate: format(computeEndDate(start, plan.durationMonths), "yyyy-MM-dd"),
          pricePaise: plan.pricePaise, status: "active",
        });
      }
    }

    return { status: 201, data: serialize(member) };
  });
}
