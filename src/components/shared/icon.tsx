"use client";

import {
  Boxes,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Home,
  IndianRupee,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Plug,
  QrCode,
  Receipt,
  ShieldCheck,
  Star,
  Tags,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Server Components can't pass function references (Lucide icon components) as
 * props to Client Components. So config lives on the server as a string name and
 * the client resolves it here. Add new icons to this map before using them.
 */
export const ICONS = {
  Boxes,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Home,
  IndianRupee,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Plug,
  QrCode,
  Receipt,
  ShieldCheck,
  Star,
  Tags,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  Users,
  UsersRound,
  Wallet,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Resolve either a string name (from a Server Component) or a direct component. */
export function resolveIcon(icon: IconName | LucideIcon | undefined): LucideIcon | undefined {
  if (!icon) return undefined;
  return typeof icon === "string" ? ICONS[icon] : icon;
}
