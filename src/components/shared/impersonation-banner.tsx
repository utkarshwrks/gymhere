"use client";

import { Eye, X } from "lucide-react";
import { stopImpersonation } from "@/lib/actions/super-admin";

export function ImpersonationBanner({ gymName }: { gymName: string }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-foreground px-4 py-2 text-sm text-background md:px-6">
      <span className="flex items-center gap-2">
        <Eye className="size-4" /> Viewing <strong>{gymName}</strong> as super admin
      </span>
      <button onClick={() => stopImpersonation()} className="inline-flex items-center gap-1 rounded px-2 py-0.5 hover:bg-background/20">
        <X className="size-3.5" /> Exit
      </button>
    </div>
  );
}
