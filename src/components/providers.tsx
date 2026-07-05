"use client";

import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * App-wide providers. Clerk is wrapped only when configured so the demo builds
 * and runs without auth keys; adding keys (production key swap) activates it
 * with no code change. See BUILD-PLAN.md §2.
 */
export function Providers({
  clerkEnabled,
  children,
}: {
  clerkEnabled: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );

  if (clerkEnabled) {
    return (
      <ClerkProvider
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        appearance={{ variables: { colorPrimary: "#7aa30f" } }}
      >
        {inner}
      </ClerkProvider>
    );
  }
  return inner;
}
