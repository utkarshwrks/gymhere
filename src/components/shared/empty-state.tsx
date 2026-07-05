import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Designed empty state — never a blank table. Line-art icon in a lime-tinted
 * frame + a clear CTA slot.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-foreground">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-display font-semibold">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
