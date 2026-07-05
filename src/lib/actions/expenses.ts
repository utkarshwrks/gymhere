"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { recordCash } from "@/lib/db/cashbook";
import { expenseTypes, expenses } from "@/lib/db/schema";
import { toPaise } from "@/lib/format";

type Result = { ok: true } | { ok: false; error: string };

export async function createExpenseType(name: string, groupName?: string): Promise<Result> {
  const ctx = await requireGym();
  if (!name.trim()) return { ok: false, error: "Name required" };
  await db.insert(expenseTypes).values({ gymId: ctx.gym.id, name: name.trim(), groupName: groupName || null });
  revalidatePath("/app/expenses");
  return { ok: true };
}

const expenseSchema = z.object({
  title: z.string().min(1).max(120),
  amountRupees: z.coerce.number().min(0.01),
  spentOn: z.string(),
  expenseTypeId: z.string().uuid().optional().or(z.literal("")),
  method: z.enum(["cash", "upi", "card", "bank"]).default("cash"),
  note: z.string().max(240).optional(),
});

export async function createExpense(input: z.input<typeof expenseSchema>): Promise<Result> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid expense" };
  const data = parsed.data;
  const ctx = await requireGym();

  const [expense] = await db.insert(expenses).values({
    gymId: ctx.gym.id,
    title: data.title,
    amountPaise: toPaise(data.amountRupees),
    spentOn: data.spentOn,
    expenseTypeId: data.expenseTypeId || null,
    method: data.method,
    note: data.note || null,
  }).returning();

  await recordCash({ gymId: ctx.gym.id, direction: "out", source: "expense", refId: expense.id, amountPaise: expense.amountPaise, description: data.title });

  revalidatePath("/app/expenses");
  return { ok: true };
}
