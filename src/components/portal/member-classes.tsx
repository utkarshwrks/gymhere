"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bookClassMe, cancelBookingMe } from "@/lib/actions/member";
import { formatDate } from "@/lib/format";
import type { TimetableSlot } from "@/lib/queries/classes";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MemberClasses({
  timetable,
  myBookings,
}: {
  timetable: TimetableSlot[];
  myBookings: { id: string; scheduleId: string; bookingDate: string }[];
}) {
  const router = useRouter();
  const bookingBySlot = new Map(myBookings.map((b) => [`${b.scheduleId}:${b.bookingDate}`, b.id]));

  return (
    <div className="space-y-6">
      <PageHeader title="Classes" description="Book your spot in this week's classes." />
      {timetable.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No classes scheduled" description="Check back soon — your gym hasn't published a timetable yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {timetable.map((s) => {
            const bookingId = bookingBySlot.get(`${s.scheduleId}:${s.upcomingDate}`);
            const full = s.bookedCount >= s.capacity;
            return (
              <Card key={s.scheduleId}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.className}</p>
                    <Badge variant="muted">{DAYS[s.dayOfWeek]} {s.startTime}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(s.upcomingDate)} · {s.bookedCount}/{s.capacity} booked</p>
                  {bookingId ? (
                    <Button variant="outline" size="sm" className="w-full" onClick={async () => { const r = await cancelBookingMe(bookingId); if (r.ok) { toast.success("Booking cancelled"); router.refresh(); } else toast.error(r.error); }}>Cancel booking</Button>
                  ) : (
                    <Button size="sm" className="w-full" disabled={full} onClick={async () => { const r = await bookClassMe(s.scheduleId, s.upcomingDate); if (r.ok) { toast.success("Booked!"); router.refresh(); } else toast.error(r.error); }}>{full ? "Full" : "Book"}</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
