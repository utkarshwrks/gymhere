import type { Metadata } from "next";
import { requireGym } from "@/lib/auth";
import { listMembers } from "@/lib/queries/members";
import { dailyLog, todayCheckinCount } from "@/lib/queries/attendance";
import { AttendanceView } from "@/components/attendance/attendance-view";

export const metadata: Metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await requireGym();
  const { date } = await searchParams;
  const selectedDate = date ?? new Date().toISOString().slice(0, 10);

  const [membersList, log, todayCount] = await Promise.all([
    listMembers(ctx.gym.id),
    dailyLog(ctx.gym.id, selectedDate),
    todayCheckinCount(ctx.gym.id),
  ]);

  return (
    <AttendanceView
      members={membersList.map((m) => ({ id: m.id, fullName: m.fullName, phone: m.phone, photoUrl: m.photoUrl }))}
      log={log}
      selectedDate={selectedDate}
      todayCount={date && date !== new Date().toISOString().slice(0, 10) ? log.length : todayCount}
    />
  );
}
