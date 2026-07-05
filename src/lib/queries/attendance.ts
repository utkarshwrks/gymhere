import { and, desc, eq, gte, lte } from "drizzle-orm";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { attendance, members } from "@/lib/db/schema";

export async function todayCheckinCount(gymId: string): Promise<number> {
  const rows = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(
      and(
        eq(attendance.gymId, gymId),
        eq(attendance.personType, "member"),
        gte(attendance.checkInAt, startOfDay(new Date())),
        lte(attendance.checkInAt, endOfDay(new Date())),
      ),
    );
  return rows.length;
}

export interface LogEntry {
  id: string;
  memberId: string | null;
  memberName: string;
  method: string;
  checkInAt: string;
}

/** Attendance log for a single day (defaults to today), newest first. */
export async function dailyLog(gymId: string, dateIso?: string): Promise<LogEntry[]> {
  const day = dateIso ? parseISO(dateIso) : new Date();
  const rows = await db
    .select({
      id: attendance.id,
      memberId: attendance.memberId,
      method: attendance.method,
      checkInAt: attendance.checkInAt,
      memberName: members.fullName,
    })
    .from(attendance)
    .leftJoin(members, eq(attendance.memberId, members.id))
    .where(
      and(
        eq(attendance.gymId, gymId),
        gte(attendance.checkInAt, startOfDay(day)),
        lte(attendance.checkInAt, endOfDay(day)),
      ),
    )
    .orderBy(desc(attendance.checkInAt));

  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: r.memberName ?? "Staff",
    method: r.method,
    checkInAt: r.checkInAt.toISOString(),
  }));
}
