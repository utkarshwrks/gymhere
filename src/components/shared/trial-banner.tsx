import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Trial status strip shown under the topbar while a gym is on its 14-day trial.
 */
export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 3;
  return (
    <div className="border-b bg-primary/10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between md:px-6">
        <p className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="font-medium">
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial`
              : "Your free trial has ended"}
          </span>
          {urgent && daysLeft > 0 && (
            <span className="text-muted-foreground">— add a plan to keep going.</span>
          )}
        </p>
        <Link
          href="/pricing"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          See plans →
        </Link>
      </div>
    </div>
  );
}
