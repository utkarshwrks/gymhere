import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { differenceInMinutes, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";

/**
 * In/out punch: an open check-in (no check-out) today gets closed with a
 * duration; otherwise a new check-in is opened. Used by the biometric webhook
 * and the demo simulator, so a pair of punches produces an in→out record.
 */
export async function recordPunch(
  gymId: string,
  memberId: string,
  method: "manual" | "qr" | "biometric" = "biometric",
): Promise<{ direction: "in" | "out" }> {
  const open = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.gymId, gymId),
      eq(attendance.memberId, memberId),
      isNull(attendance.checkOutAt),
      gte(attendance.checkInAt, startOfDay(new Date())),
      lte(attendance.checkInAt, new Date()),
    ),
    orderBy: [desc(attendance.checkInAt)],
  });

  if (open) {
    const now = new Date();
    await db
      .update(attendance)
      .set({ checkOutAt: now, durationMins: Math.max(0, differenceInMinutes(now, open.checkInAt)) })
      .where(eq(attendance.id, open.id));
    return { direction: "out" };
  }

  await db.insert(attendance).values({ gymId, personType: "member", memberId, method });
  return { direction: "in" };
}
