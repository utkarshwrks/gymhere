import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { salaryRuns, salaryStructures, staffProfiles, users } from "@/lib/db/schema";
import { PayrollView } from "@/components/payroll/payroll-view";

export const metadata: Metadata = { title: "Payroll" };
export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const ctx = await requireGym();
  const [profiles, structures, runs] = await Promise.all([
    db.select({ userId: staffProfiles.userId, name: users.name, email: users.email }).from(staffProfiles).innerJoin(users, eq(staffProfiles.userId, users.id)).where(eq(staffProfiles.gymId, ctx.gym.id)),
    db.select().from(salaryStructures).where(eq(salaryStructures.gymId, ctx.gym.id)),
    db.select({ id: salaryRuns.id, staffUserId: salaryRuns.staffUserId, month: salaryRuns.month, workedDays: salaryRuns.workedDays, basePaise: salaryRuns.basePaise, bonusPaise: salaryRuns.bonusPaise, ptIncentivePaise: salaryRuns.ptIncentivePaise, advanceDeductionPaise: salaryRuns.advanceDeductionPaise, payablePaise: salaryRuns.payablePaise, status: salaryRuns.status }).from(salaryRuns).where(eq(salaryRuns.gymId, ctx.gym.id)).orderBy(desc(salaryRuns.createdAt)),
  ]);

  const structByUser = new Map(structures.map((s) => [s.staffUserId, s]));

  return (
    <PayrollView
      staff={profiles.map((p) => ({
        userId: p.userId,
        name: p.name ?? p.email,
        structure: structByUser.get(p.userId)
          ? { monthlyBasePaise: structByUser.get(p.userId)!.monthlyBasePaise, standardDays: structByUser.get(p.userId)!.standardDays, ptIncentivePerSessionPaise: structByUser.get(p.userId)!.ptIncentivePerSessionPaise }
          : null,
      }))}
      runs={runs.map((r) => ({ ...r }))}
    />
  );
}
