"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMyProfile } from "@/lib/actions/member";

interface Profile { phone: string; email: string | null; address: string | null; emergencyContactName: string | null; emergencyContactPhone: string | null }

export function ProfileForm({ member }: { member: Profile }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await updateMyProfile({
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      address: String(fd.get("address") || ""),
      emergencyContactName: String(fd.get("ecn") || ""),
      emergencyContactPhone: String(fd.get("ecp") || ""),
    });
    setPending(false);
    if (r.ok) { toast.success("Profile updated"); router.refresh(); } else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Keep your contact details up to date." />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" defaultValue={member.phone} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" defaultValue={member.email ?? ""} /></div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Textarea name="address" rows={2} defaultValue={member.address ?? ""} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Emergency contact</Label><Input name="ecn" defaultValue={member.emergencyContactName ?? ""} /></div>
              <div className="space-y-1.5"><Label>Emergency phone</Label><Input name="ecp" defaultValue={member.emergencyContactPhone ?? ""} /></div>
            </div>
            <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
