import { db } from "./index";
import { cashbookEntries } from "./schema";

/**
 * Single source of truth for the cash book / day book. Every money movement —
 * member payments, POS sales, expenses, vendor + payroll payouts — records one
 * entry here so the day book reconciles.
 */
export async function recordCash(input: {
  gymId: string;
  direction: "in" | "out";
  source: "payment" | "pos" | "expense" | "payroll" | "vendor";
  refId?: string;
  amountPaise: number;
  description: string;
  occurredAt?: Date;
}): Promise<void> {
  if (input.amountPaise <= 0) return;
  await db.insert(cashbookEntries).values({
    gymId: input.gymId,
    direction: input.direction,
    source: input.source,
    refId: input.refId,
    amountPaise: input.amountPaise,
    description: input.description,
    occurredAt: input.occurredAt ?? new Date(),
  });
}
