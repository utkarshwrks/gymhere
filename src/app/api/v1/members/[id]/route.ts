import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { withApiKey } from "@/lib/api/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withApiKey(req, { endpoint: "/v1/members/:id", scope: "read" }, async (ctx) => {
    const m = await db.query.members.findFirst({ where: and(eq(members.gymId, ctx.gymId), eq(members.id, id)) });
    if (!m) return { status: 404, data: { error: "Member not found" } };
    return { status: 200, data: { id: m.id, full_name: m.fullName, phone: m.phone, email: m.email, status: m.status, join_date: m.joinDate, qr_token: m.qrToken } };
  });
}
