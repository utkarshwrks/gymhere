import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireGym } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QrScanner } from "@/components/attendance/qr-scanner";

export const metadata: Metadata = { title: "Scan check-in" };
export const dynamic = "force-dynamic";

export default async function ScanPage() {
  await requireGym();
  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link href="/app/attendance" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Attendance
      </Link>
      <PageHeader title="QR check-in" description="Point the camera at a member's QR code to check them in." />
      <Card><CardContent className="pt-6"><QrScanner /></CardContent></Card>
    </div>
  );
}
