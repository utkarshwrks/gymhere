import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { batches, memberWeightLogs } from "@/lib/db/schema";
import { getMember, listPlansForGym } from "@/lib/queries/members";
import { MemberProfile } from "@/components/members/member-profile";

export const metadata: Metadata = { title: "Member profile" };
export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireGym();

  const detail = await getMember(ctx.gym.id, id);
  if (!detail) notFound();

  const [weightLogs, plans, batchRow] = await Promise.all([
    db
      .select()
      .from(memberWeightLogs)
      .where(and(eq(memberWeightLogs.gymId, ctx.gym.id), eq(memberWeightLogs.memberId, id)))
      .orderBy(desc(memberWeightLogs.measuredAt))
      .limit(60),
    listPlansForGym(ctx.gym.id),
    detail.member.batchId
      ? db.select().from(batches).where(eq(batches.id, detail.member.batchId)).limit(1)
      : Promise.resolve([]),
  ]);

  const m = detail.member;

  return (
    <MemberProfile
      member={{
        id: m.id,
        fullName: m.fullName,
        phone: m.phone,
        email: m.email,
        gender: m.gender,
        dob: m.dob,
        address: m.address,
        idProofNo: m.idProofNo,
        emergencyContactName: m.emergencyContactName,
        emergencyContactPhone: m.emergencyContactPhone,
        heightCm: m.heightCm,
        weightKg: m.weightKg,
        photoUrl: m.photoUrl,
        status: m.status,
        joinDate: m.joinDate,
        notes: m.notes,
        batchName: batchRow[0]?.name ?? null,
      }}
      subscriptions={detail.subscriptions.map((s) => ({
        id: s.id,
        planName: s.planName,
        startDate: s.startDate,
        endDate: s.endDate,
        pricePaise: s.pricePaise,
        status: s.status,
      }))}
      currentEndDate={detail.currentSub?.endDate ?? null}
      attendance={detail.recentAttendance.map((a) => ({ checkInAt: a.checkInAt.toISOString() }))}
      weightLogs={weightLogs.map((w) => ({
        measuredAt: w.measuredAt.toISOString(),
        weightKg: w.weightKg,
        bmi: w.bmi,
      }))}
      plans={plans.map((p) => ({ id: p.id, name: p.name, durationMonths: p.durationMonths, pricePaise: p.pricePaise }))}
    />
  );
}
