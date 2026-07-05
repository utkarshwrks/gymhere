"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { batches, holidays } from "@/lib/db/schema";

type Result = { ok: true } | { ok: false; error: string };

const batchSchema = z.object({
  name: z.string().min(1).max(40),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function createBatch(input: z.input<typeof batchSchema>): Promise<Result> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid batch" };
  const ctx = await requireGym();
  await db.insert(batches).values({
    gymId: ctx.gym.id,
    name: parsed.data.name,
    startTime: parsed.data.startTime || null,
    endTime: parsed.data.endTime || null,
  });
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function deleteBatch(batchId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.delete(batches).where(and(eq(batches.gymId, ctx.gym.id), eq(batches.id, batchId)));
  revalidatePath("/app/settings");
  return { ok: true };
}

const holidaySchema = z.object({ name: z.string().min(1).max(60), date: z.string() });

export async function createHoliday(input: z.input<typeof holidaySchema>): Promise<Result> {
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid holiday" };
  const ctx = await requireGym();
  await db.insert(holidays).values({ gymId: ctx.gym.id, name: parsed.data.name, date: parsed.data.date });
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function deleteHoliday(holidayId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.delete(holidays).where(and(eq(holidays.gymId, ctx.gym.id), eq(holidays.id, holidayId)));
  revalidatePath("/app/settings");
  return { ok: true };
}
