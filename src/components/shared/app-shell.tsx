"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { resolveIcon, type IconName } from "@/components/shared/icon";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  /** Icon name resolved on the client (see icon.tsx) — Server Components can't pass components. */
  icon: IconName;
  /** Match nested routes too (default: exact + startsWith for non-root). */
  exact?: boolean;
}

function useActive(href: string, exact?: boolean) {
  const pathname = usePathname();
  if (exact) return pathname === href;
  if (href === "/app" || href === "/sa" || href === "/me") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function SideLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const active = useActive(item.href, item.exact);
  const Icon = resolveIcon(item.icon);
  const link = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="relative flex items-center">
        {active && (
          <span className="absolute -left-3 h-5 w-0.5 rounded-full bg-primary" />
        )}
        {Icon && <Icon className="size-4 shrink-0" />}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

export function AppShell({
  nav,
  brandHref = "/app",
  title,
  userSlot,
  banner,
  children,
}: {
  nav: NavItem[];
  brandHref?: string;
  title?: string;
  userSlot?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("gh-sidebar-collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem("gh-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  // Bottom bar shows the first five destinations on mobile.
  const mobileNav = nav.slice(0, 5);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-dvh bg-background">
        {/* Sidebar (desktop) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar md:flex transition-[width] duration-200",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
            {collapsed ? <Brand href={brandHref} compact /> : <Brand href={brandHref} />}
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav.map((item) => (
              <SideLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Collapse sidebar">
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-200", collapsed ? "md:pl-16" : "md:pl-60")}>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
            <div className="md:hidden">
              <Brand href={brandHref} compact />
            </div>
            {title && <h2 className="hidden font-display text-base font-semibold md:block">{title}</h2>}
            <div className="ml-auto flex items-center gap-1.5">
              <ThemeToggle />
              {userSlot}
            </div>
          </header>

          {banner}

          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 pb-24 md:px-6 md:pb-8">
            {children}
          </main>
        </div>

        {/* Bottom tab bar (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t bg-background/95 backdrop-blur md:hidden">
          {mobileNav.map((item) => (
            <MobileTab key={item.href} item={item} />
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}

function MobileTab({ item }: { item: NavItem }) {
  const active = useActive(item.href, item.exact);
  const Icon = resolveIcon(item.icon);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {Icon && <Icon className={cn("size-5", active && "text-primary")} />}
      <span className="truncate px-1">{item.label}</span>
    </Link>
  );
}
