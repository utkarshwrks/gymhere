import { KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shown in place of Clerk's forms when auth keys aren't set (demo builds).
 * Adding Clerk keys to .env.local (the production key swap) activates real auth.
 */
export function AuthUnconfigured() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-1 grid size-10 place-items-center rounded-md bg-primary/12">
          <KeyRound className="size-5" />
        </div>
        <CardTitle>Authentication not configured</CardTitle>
        <CardDescription>
          This build is running in demo mode without auth keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Add your Clerk keys to <code className="rounded bg-muted px-1 py-0.5">.env.local</code>{" "}
          to enable sign in and sign up:
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...`}
        </pre>
      </CardContent>
    </Card>
  );
}
