import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { ProfileForm } from "@/components/portal/profile-form";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function MemberProfilePage() {
  const ctx = await requireMember();
  const m = ctx.member;
  return <ProfileForm member={{ phone: m.phone, email: m.email, address: m.address, emergencyContactName: m.emergencyContactName, emergencyContactPhone: m.emergencyContactPhone }} />;
}
