"use client";

import * as React from "react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

/** Sign-out row — isolated so useClerk() only runs when Clerk is mounted. */
function SignOutItem() {
  const clerk = useClerk();
  return (
    <DropdownMenuItem
      variant="destructive"
      onClick={() => clerk.signOut({ redirectUrl: "/" })}
    >
      <LogOut className="size-4" /> Sign out
    </DropdownMenuItem>
  );
}

export function UserMenu({
  name,
  email,
  imageUrl,
  roleLabel,
  clerkEnabled,
  settingsHref,
}: {
  name: string;
  email: string;
  imageUrl?: string | null;
  roleLabel?: string;
  clerkEnabled: boolean;
  settingsHref?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
          <AvatarFallback>{initials(name || email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{name || "User"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          {roleLabel && (
            <p className="mt-1 text-[11px] uppercase tracking-wide text-primary">{roleLabel}</p>
          )}
        </DropdownMenuLabel>
        {settingsHref && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={settingsHref}>
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {clerkEnabled && (
          <>
            <DropdownMenuSeparator />
            <SignOutItem />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
