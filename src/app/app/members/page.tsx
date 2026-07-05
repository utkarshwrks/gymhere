import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { batches } from "@/lib/db/schema";
import { listMembers, listPlansForGym } from "@/lib/queries/members";
import { atMemberCap, memberCap } from "@/lib/features";
import { MembersView, type MemberRowVM } from "@/components/members/members-view";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const ctx = await requireGym();

  const [membersList, plans, batchRows] = await Promise.all([
    listMembers(ctx.gym.id),
    listPlansForGym(ctx.gym.id),
    db.select().from(batches).where(eq(batches.gymId, ctx.gym.id)),
  ]);

  const rows: MemberRowVM[] = membersList.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    phone: m.phone,
    email: m.email,
    photoUrl: m.photoUrl,
    planName: m.currentSub?.planName ?? null,
    endDate: m.currentSub?.endDate ?? null,
    joinDate: m.joinDate,
    frozen: m.status === "frozen" || m.currentSub?.status === "frozen",
  }));

  const cap = memberCap(ctx.plan);

  return (
    <MembersView
      rows={rows}
      plans={plans.map((p) => ({ id: p.id, name: p.name, pricePaise: p.pricePaise, durationMonths: p.durationMonths }))}
      batches={batchRows.map((b) => ({ id: b.id, name: b.name }))}
      atCap={atMemberCap(ctx.plan, rows.length)}
      memberCap={cap}
    />
  );
}
