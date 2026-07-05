import type { Metadata } from "next";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/shared/fade-in";

export const metadata: Metadata = {
  title: "Developers",
  description: "The GymHere REST API — integrate gyms into your platform.",
};

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <FadeIn>
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-primary/12 text-primary">
          <Terminal className="size-6" />
        </div>
        <Badge variant="outline" className="mt-6 border-primary/30 bg-primary/10 text-primary">
          Coming with the Pro plan
        </Badge>
        <h1 className="mt-4 font-display text-4xl font-semibold text-brand-offwhite">
          The GymHere API
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          A metered REST API with keys, scopes and per-plan rate limits so
          wellness apps, aggregators and booking platforms can integrate gyms&apos;
          data. Full reference, OpenAPI spec and curl snippets land soon.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link href="/sign-up">Start free trial</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 bg-transparent text-brand-offwhite hover:bg-white/10 hover:text-brand-offwhite">
            <Link href="/contact">Request early access</Link>
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}
