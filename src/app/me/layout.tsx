import { redirect } from "next/navigation";
import { CalendarDays, CreditCard, Dumbbell, Home, QrCode, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { UserMenu } from "@/components/shared/user-menu";
import { getMemberContext, getSessionUser } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const nav: NavItem[] = [
  { href: "/me", label: "Home", icon: Home, exact: true },
  { href: "/me/qr", label: "My QR", icon: QrCode },
  { href: "/me/classes", label: "Classes", icon: CalendarDays },
  { href: "/me/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/me/payments", label: "Payments", icon: CreditCard },
  { href: "/me/profile", label: "Profile", icon: User },
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "member") redirect(user.role === "super_admin" ? "/sa" : "/app");

  const ctx = await getMemberContext();
  if (!ctx) redirect("/sign-in");

  return (
    <AppShell
      nav={nav}
      brandHref="/me"
      title={ctx.gym.name}
      userSlot={
        <UserMenu
          name={ctx.user.name ?? ctx.member.fullName}
          email={ctx.user.email}
          imageUrl={ctx.user.imageUrl}
          roleLabel="Member"
          clerkEnabled={isConfigured.clerk}
          settingsHref="/me/profile"
        />
      }
    >
      {children}
    </AppShell>
  );
}
