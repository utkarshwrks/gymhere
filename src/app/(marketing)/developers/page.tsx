import type { Metadata } from "next";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/shared/fade-in";

export const metadata: Metadata = {
  title: "Developers",
  description: "The GymHere REST API — integrate gyms into your platform.",
};

const endpoints = [
  { method: "GET", path: "/v1/members", desc: "List members" },
  { method: "POST", path: "/v1/members", desc: "Create a member (write scope)" },
  { method: "GET", path: "/v1/members/{id}", desc: "Retrieve a member" },
  { method: "POST", path: "/v1/attendance", desc: "Check a member in (write scope)" },
  { method: "GET", path: "/v1/classes", desc: "List classes" },
  { method: "POST", path: "/v1/bookings", desc: "Book a class (write scope)" },
  { method: "GET", path: "/v1/plans", desc: "List membership plans" },
  { method: "GET", path: "/v1/invoices", desc: "List invoices" },
];

const errors = [
  { code: "401", meaning: "Invalid or revoked API key" },
  { code: "403", meaning: "Key lacks the required scope" },
  { code: "404", meaning: "Resource not found in your gym" },
  { code: "409", meaning: "Conflict (e.g. class full)" },
  { code: "422", meaning: "Validation error" },
  { code: "429", meaning: "Monthly rate limit exceeded" },
];

const plans = [
  { name: "Free", quota: "1,000 / mo" },
  { name: "Startup", quota: "50,000 / mo" },
  { name: "Scale", quota: "1,000,000 / mo" },
];

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm text-brand-offwhite">{children}</code>;
}

function Block({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-brand-offwhite">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <FadeIn>
        <div className="grid size-12 place-items-center rounded-md bg-primary/12 text-primary"><Terminal className="size-6" /></div>
        <Badge variant="outline" className="mt-6 border-primary/30 bg-primary/10 text-primary">API v1</Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold text-brand-offwhite">GymHere API</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A metered REST API for gym data. Create keys in your gym at{" "}
          <Code>Settings → API</Code> (Pro plan), then authenticate with a bearer token.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild variant="outline" className="border-white/20 bg-transparent text-brand-offwhite hover:bg-white/10 hover:text-brand-offwhite"><Link href="/api/v1/openapi.json" target="_blank">openapi.json</Link></Button>
          <Button asChild><Link href="/sign-up">Get an API key</Link></Button>
        </div>
      </FadeIn>

      <section className="mt-14 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-brand-offwhite">Authentication</h2>
        <p className="text-muted-foreground">Send your key as a bearer token on every request:</p>
        <Block>{`curl https://your-app.vercel.app/api/v1/members \\
  -H "Authorization: Bearer ghk_your_key_here"`}</Block>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-brand-offwhite">Endpoints</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-muted-foreground"><th className="p-3">Method</th><th className="p-3">Path</th><th className="p-3">Description</th></tr></thead>
            <tbody>
              {endpoints.map((e) => (
                <tr key={e.method + e.path} className="border-b border-white/5">
                  <td className="p-3"><Badge variant={e.method === "GET" ? "muted" : "default"}>{e.method}</Badge></td>
                  <td className="p-3 font-mono text-brand-offwhite">{e.path}</td>
                  <td className="p-3 text-muted-foreground">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-brand-offwhite">Example — create a member</h2>
        <Block>{`curl -X POST https://your-app.vercel.app/api/v1/members \\
  -H "Authorization: Bearer ghk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "full_name": "Ravi Kumar", "phone": "+919000000000" }'`}</Block>
        <p className="text-sm text-muted-foreground">Responses include <Code>X-RateLimit-Limit</Code>, <Code>X-RateLimit-Remaining</Code> and <Code>X-RateLimit-Reset</Code> headers.</p>
      </section>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-semibold text-brand-offwhite">Rate limits</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {plans.map((p) => (
                <tr key={p.name} className="border-b border-white/10"><td className="py-2 text-brand-offwhite">{p.name}</td><td className="py-2 text-right tnum text-muted-foreground">{p.quota}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-brand-offwhite">Error codes</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {errors.map((e) => (
                <tr key={e.code} className="border-b border-white/10"><td className="py-2 font-mono text-brand-offwhite">{e.code}</td><td className="py-2 text-right text-muted-foreground">{e.meaning}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 space-y-2">
        <h2 className="font-display text-2xl font-semibold text-brand-offwhite">Changelog</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li><Code>v1.0.0</Code> — Members, attendance, classes, bookings, plans and invoices. Bearer auth, monthly quotas, usage metering.</li>
        </ul>
      </section>
    </div>
  );
}
