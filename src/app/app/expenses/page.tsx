import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseTypes, expenses } from "@/lib/db/schema";
import { ExpensesView } from "@/components/expenses/expenses-view";

export const metadata: Metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const ctx = await requireGym();
  const [rows, types] = await Promise.all([
    db.select().from(expenses).where(eq(expenses.gymId, ctx.gym.id)).orderBy(desc(expenses.spentOn)),
    db.select().from(expenseTypes).where(eq(expenseTypes.gymId, ctx.gym.id)),
  ]);
  const typeName = new Map(types.map((t) => [t.id, t.name]));

  return (
    <ExpensesView
      expenses={rows.map((e) => ({ id: e.id, title: e.title, amountPaise: e.amountPaise, spentOn: e.spentOn, method: e.method, type: e.expenseTypeId ? typeName.get(e.expenseTypeId) ?? null : null }))}
      types={types.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
