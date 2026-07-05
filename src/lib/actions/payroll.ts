"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { recordCash } from "@/lib/db/cashbook";
import { salaryRuns, salaryStructures, staffPayments } from "@/lib/db/schema";
import { toPaise } from "@/lib/format";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const runSchema = z.object({
  staffUserId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  workedDays: z.coerce.number().int().min(0).max(31),
  ptSessions: z.coerce.number().int().min(0).max(500).default(0),
  bonusRupees: z.coerce.number().min(0).default(0),
  advanceRupees: z.coerce.number().min(0).default(0),
});

/**
 * Monthly salary run: worked days × per-day rate + bonus + PT incentive − advance.
 * per-day = monthly base ÷ standard days.
 */
export async function runSalary(input: z.input<typeof runSchema>): Promise<Result<{ payablePaise: number }>> {
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  const ctx = await requireGym();

  const structure = await db.query.salaryStructures.findFirst({
    where: and(eq(salaryStructures.gymId, ctx.gym.id), eq(salaryStructures.staffUserId, d.staffUserId)),
  });
  if (!structure) return { ok: false, error: "Set a salary structure first." };

  const perDay = Math.round(structure.monthlyBasePaise / Math.max(1, structure.standardDays));
  const base = perDay * d.workedDays;
  const bonus = toPaise(d.bonusRupees);
  const ptIncentive = d.ptSessions * structure.ptIncentivePerSessionPaise;
  const advance = toPaise(d.advanceRupees);
  const payable = Math.max(0, base + bonus + ptIncentive - advance);

  await db.insert(salaryRuns).values({
    gymId: ctx.gym.id,
    staffUserId: d.staffUserId,
    month: d.month,
    workedDays: d.workedDays,
    perDayPaise: perDay,
    basePaise: base,
    bonusPaise: bonus,
    ptSessions: d.ptSessions,
    ptIncentivePaise: ptIncentive,
    advanceDeductionPaise: advance,
    payablePaise: payable,
    status: "finalized",
  });

  revalidatePath("/app/payroll");
  return { ok: true, data: { payablePaise: payable } };
}

export async function recordStaffPayment(input: { salaryRunId: string; staffUserId: string; amountRupees: number; method?: "cash" | "bank" | "upi" }): Promise<Result> {
  const ctx = await requireGym();
  const amount = toPaise(input.amountRupees);
  if (amount <= 0) return { ok: false, error: "Amount required" };

  await db.insert(staffPayments).values({ gymId: ctx.gym.id, staffUserId: input.staffUserId, salaryRunId: input.salaryRunId, amountPaise: amount, method: input.method ?? "cash" });
  await db.update(salaryRuns).set({ status: "paid" }).where(and(eq(salaryRuns.gymId, ctx.gym.id), eq(salaryRuns.id, input.salaryRunId)));
  await recordCash({ gymId: ctx.gym.id, direction: "out", source: "payroll", refId: input.salaryRunId, amountPaise: amount, description: "Salary payment" });

  revalidatePath("/app/payroll");
  return { ok: true };
}
