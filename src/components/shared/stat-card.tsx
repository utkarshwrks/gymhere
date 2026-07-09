"use client";

import * as React from "react";
import { animate, motion, useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { resolveIcon, type IconName } from "@/components/shared/icon";
import { formatMoneyCompact } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Named formatters so Server Components can pass a string instead of a function. */
const FORMATTERS = {
  money: formatMoneyCompact,
  number: (n: number) => Math.round(n).toLocaleString("en-IN"),
} satisfies Record<string, (n: number) => string>;

export type FormatKey = keyof typeof FORMATTERS;

function CountUp({
  value,
  format,
  duration = 0.9,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  React.useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = format ? format(v) : Math.round(v).toLocaleString("en-IN");
      },
    });
    return () => controls.stop();
  }, [inView, value, format, duration]);

  return (
    <span ref={ref} className="tnum">
      {format ? format(0) : "0"}
    </span>
  );
}

export interface StatCardProps {
  label: string;
  value: number;
  /** String key (from a Server Component) or a formatter function (client callers). */
  format?: FormatKey | ((n: number) => string);
  /** Icon name (from a Server Component) or a component (client callers). */
  icon?: IconName | LucideIcon;
  delta?: { value: string; positive?: boolean };
  live?: boolean;
  index?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  format,
  icon,
  delta,
  live,
  index = 0,
  className,
}: StatCardProps) {
  const Icon = resolveIcon(icon);
  const formatFn = typeof format === "string" ? FORMATTERS[format] : format;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 }}
    >
      <Card className={cn("gap-3 py-4 transition-transform hover:-translate-y-0.5", className)}>
        <div className="flex items-center justify-between px-4">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {live ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Live
            </span>
          ) : (
            Icon && <Icon className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-end justify-between gap-2 px-4">
          <div className="font-display text-2xl font-semibold tracking-tight">
            <CountUp value={value} format={formatFn} />
          </div>
          {delta && (
            <span
              className={cn(
                "mb-1 text-xs font-medium",
                delta.positive ? "text-success" : "text-muted-foreground",
              )}
            >
              {delta.value}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
