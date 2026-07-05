import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { isConfigured } from "@/lib/env";
import { AuthUnconfigured } from "@/components/shared/auth-unconfigured";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  if (!isConfigured.clerk) return <AuthUnconfigured />;
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-none bg-transparent",
        },
      }}
    />
  );
}
