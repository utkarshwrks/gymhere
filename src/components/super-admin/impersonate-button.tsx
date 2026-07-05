"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startImpersonation } from "@/lib/actions/super-admin";

export function ImpersonateButton({ gymId }: { gymId: string }) {
  return (
    <Button variant="outline" onClick={() => startImpersonation(gymId)}>
      <Eye className="size-4" /> Impersonate
    </Button>
  );
}
