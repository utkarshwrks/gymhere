import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getTimetable } from "@/lib/queries/classes";
import { portalClasses } from "@/lib/queries/portal";
import { MemberClasses } from "@/components/portal/member-classes";

export const metadata: Metadata = { title: "Classes" };
export const dynamic = "force-dynamic";

export default async function MemberClassesPage() {
  const ctx = await requireMember();
  const [timetable, mine] = await Promise.all([getTimetable(ctx.gym.id), portalClasses(ctx.gym.id, ctx.member.id)]);
  return <MemberClasses timetable={timetable} myBookings={mine.myBookings} />;
}
