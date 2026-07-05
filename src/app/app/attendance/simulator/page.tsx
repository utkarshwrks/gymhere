import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendanceDevices } from "@/lib/db/schema";
import { listMembers } from "@/lib/queries/members";
import { PageHeader } from "@/components/shared/page-header";
import { DeviceSimulator } from "@/components/attendance/device-simulator";

export const metadata: Metadata = { title: "Device simulator" };
export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const ctx = await requireGym();
  const [devices, membersList] = await Promise.all([
    db.select().from(attendanceDevices).where(eq(attendanceDevices.gymId, ctx.gym.id)),
    listMembers(ctx.gym.id),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/app/attendance" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Attendance
      </Link>
      <PageHeader title="Biometric device simulator" description="Register devices and fire test punches (in/out toggle)." />
      <DeviceSimulator
        devices={devices.map((d) => ({ id: d.id, name: d.name, serial: d.serial }))}
        members={membersList.map((m) => ({ id: m.id, name: m.fullName }))}
      />
    </div>
  );
}
