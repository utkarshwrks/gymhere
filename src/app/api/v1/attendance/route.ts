import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { attendance, members } from "@/lib/db/schema";
import { withApiKey } from "@/lib/api/context";

export const dynamic = "force-dynamic";

const schema = z.object({
  member_id: z.string().uuid().optional(),
  qr_token: z.string().optional(),
}).refine((d) => d.member_id || d.qr_token, { message: "member_id or qr_token required" });

export async function POST(req: Request) {
  return withApiKey(req, { endpoint: "/v1/attendance", scope: "write" }, async (ctx) => {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return { status: 422, data: { error: parsed.error.issues[0]?.message ?? "Invalid body" } };

    const member = parsed.data.member_id
      ? await db.query.members.findFirst({ where: and(eq(members.gymId, ctx.gymId), eq(members.id, parsed.data.member_id)) })
      : await db.query.members.findFirst({ where: and(eq(members.gymId, ctx.gymId), eq(members.qrToken, parsed.data.qr_token!)) });
    if (!member) return { status: 404, data: { error: "Member not found" } };

    const [row] = await db.insert(attendance).values({ gymId: ctx.gymId, personType: "member", memberId: member.id, method: "qr" }).returning();
    return { status: 201, data: { id: row.id, member_id: member.id, checked_in_at: row.checkInAt.toISOString() } };
  });
}
