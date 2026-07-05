import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Building2, Shield, User } from "lucide-react";
import { db } from "@/lib/db";
import { gyms, users } from "@/lib/db/schema";
import { isDemo, isConfigured } from "@/lib/env";
import { Brand } from "@/components/shared/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Demo credentials" };
export const dynamic = "force-dynamic";

export default async function DemoPage() {
  if (!isDemo) notFound();

  let superAdminEmail = "admin@gymhere.app";
  let gymRows: { name: string; slug: string; ownerEmail: string | null }[] = [];

  if (isConfigured.db) {
    try {
      const admin = await db.query.users.findFirst({ where: eq(users.role, "super_admin") });
      if (admin) superAdminEmail = admin.email;
      const gs = await db.select().from(gyms);
      gymRows = await Promise.all(gs.map(async (g) => {
        const owner = g.ownerUserId ? await db.query.users.findFirst({ where: eq(users.id, g.ownerUserId) }) : null;
        return { name: g.name, slug: g.slug, ownerEmail: owner?.email ?? null };
      }));
    } catch { /* fall back to defaults */ }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <Brand href="/" />
        <Button asChild variant="outline" size="sm"><Link href="/sign-in">Sign in</Link></Button>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Demo</Badge>
        <h1 className="mt-3 font-display text-3xl font-semibold">Explore GymHere</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          This is a seeded demo. Sign up in Clerk using one of the emails below to enter each role —
          our just-in-time provisioning links your login to the seeded account automatically.
        </p>

        <div className="mt-8 space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-2"><Shield className="size-4 text-primary" /><CardTitle>Super admin</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <code className="font-mono text-sm">{superAdminEmail}</code>
              <Badge variant="muted">/sa</Badge>
            </CardContent>
          </Card>

          {gymRows.map((g) => (
            <Card key={g.slug}>
              <CardHeader className="flex-row items-center gap-2"><Building2 className="size-4 text-primary" /><CardTitle>{g.name} — owner</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <code className="font-mono text-sm">{g.ownerEmail ?? "—"}</code>
                <div className="flex items-center gap-2">
                  <Link href={`/g/${g.slug}`} className="text-xs text-primary underline-offset-4 hover:underline">microsite</Link>
                  <Badge variant="muted">/app</Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="flex-row items-center gap-2"><User className="size-4 text-primary" /><CardTitle>Member</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Open a gym as its owner → Members → any member → “Invite to portal”, then sign up with that member&apos;s email to see the <Badge variant="muted">/me</Badge> portal.
            </CardContent>
          </Card>
        </div>

        {!isConfigured.db && (
          <p className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            No database is connected yet. Add <code className="rounded bg-muted px-1">DATABASE_URL</code> and run <code className="rounded bg-muted px-1">npm run seed:demo</code> to populate this demo.
          </p>
        )}
      </div>
    </div>
  );
}
