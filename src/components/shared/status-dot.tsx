import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "muted" | "info";

const toneClass: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
  info: "bg-primary",
};

/** Status = colored dot + label. Never a rainbow of pills. */
export function StatusDot({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={cn("size-2 shrink-0 rounded-full", toneClass[tone])} />
      {label}
    </span>
  );
}

export const memberStatusTone: Record<string, Tone> = {
  active: "success",
  frozen: "info",
  inactive: "muted",
  expired: "danger",
};

export const subscriptionStatusTone: Record<string, Tone> = {
  trialing: "info",
  active: "success",
  past_due: "warning",
  canceled: "muted",
  suspended: "danger",
};
