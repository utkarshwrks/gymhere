import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { classBookings, classSchedules, classes, members } from "@/lib/db/schema";
import { withApiKey } from "@/lib/api/context";

export const dynamic = "force-dynamic";

const schema = z.object({
  schedule_id: z.string().uuid(),
  member_id: z.string().uuid(),
  booking_date: z.string(),
});

export async function POST(req: Request) {
  return withApiKey(req, { endpoint: "/v1/bookings", scope: "write" }, async (ctx) => {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return { status: 422, data: { error: parsed.error.issues[0]?.message ?? "Invalid body" } };
    const d = parsed.data;

    const schedule = await db.query.classSchedules.findFirst({ where: and(eq(classSchedules.gymId, ctx.gymId), eq(classSchedules.id, d.schedule_id)) });
    if (!schedule) return { status: 404, data: { error: "Schedule not found" } };
    const klass = await db.query.classes.findFirst({ where: eq(classes.id, schedule.classId) });
    if (!klass) return { status: 404, data: { error: "Class not found" } };

    const member = await db.query.members.findFirst({ where: and(eq(members.gymId, ctx.gymId), eq(members.id, d.member_id)) });
    if (!member) return { status: 404, data: { error: "Member not found" } };

    const booked = await db.select({ id: classBookings.id }).from(classBookings).where(and(eq(classBookings.gymId, ctx.gymId), eq(classBookings.scheduleId, d.schedule_id), eq(classBookings.bookingDate, d.booking_date), eq(classBookings.status, "booked")));
    if (booked.length >= klass.capacity) return { status: 409, data: { error: "Class is full" } };

    const [row] = await db.insert(classBookings).values({ gymId: ctx.gymId, scheduleId: d.schedule_id, memberId: d.member_id, bookingDate: d.booking_date, status: "booked" }).returning();
    return { status: 201, data: { id: row.id, schedule_id: d.schedule_id, member_id: d.member_id, booking_date: d.booking_date } };
  });
}
