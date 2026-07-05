import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { MyQr } from "@/components/portal/my-qr";

export const metadata: Metadata = { title: "My QR code" };
export const dynamic = "force-dynamic";

export default async function MyQrPage() {
  const ctx = await requireMember();
  return <MyQr token={ctx.member.qrToken} memberName={ctx.member.fullName} gymName={ctx.gym.name} />;
}
