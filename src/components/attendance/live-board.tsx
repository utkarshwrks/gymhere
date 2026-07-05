"use client";

import * as React from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { StatusDot } from "@/components/shared/status-dot";
import { Badge } from "@/components/ui/badge";
import { getLiveBoard, type LiveRow } from "@/lib/actions/devices";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneBorder: Record<string, string> = {
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-destructive",
  info: "border-l-primary",
  muted: "border-l-muted-foreground",
};

export function LiveBoard({ initial }: { initial: LiveRow[] }) {
  const [rows, setRows] = React.useState(initial);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const poll = setInterval(async () => {
      try {
        setRows(await getLiveBoard());
      } catch { /* ignore transient errors */ }
    }, 8000);
    const clock = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-medium">Live · {rows.length} on the floor</span>
        </div>
        <span className="text-xs text-muted-foreground" suppressHydrationWarning>Auto-refreshing every 8s</span>
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed py-24 text-center text-muted-foreground">
          No members currently checked in.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <div key={r.memberId} className={cn("flex items-center gap-3 rounded-lg border border-l-4 bg-card p-4", toneBorder[r.tone])} data-tick={tick}>
              <span className="grid size-10 place-items-center rounded-full bg-muted text-sm font-medium">{initials(r.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">in {formatDistanceToNowStrict(new Date(r.checkInAt))}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusDot tone={r.tone} label={r.label} />
                {r.hasDues && <Badge variant="destructive">Dues</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
