import type { Metadata } from "next";
import { QrCode } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "My membership" };
export const dynamic = "force-dynamic";

export default function MemberHome() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My membership"
        description="Your plan, payments, check-ins and class bookings."
      />
      <EmptyState
        icon={QrCode}
        title="Your member portal is on the way"
        description="Your plan card, personal QR check-in, payment history and class booking arrive in Phase 4."
      />
    </div>
  );
}
