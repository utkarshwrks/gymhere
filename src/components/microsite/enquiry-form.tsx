"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitMicrositeEnquiry } from "@/lib/actions/microsite";

export function MicrositeEnquiryForm({ slug }: { slug: string }) {
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await submitMicrositeEnquiry({
      slug,
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
    });
    setPending(false);
    if (r.ok) { setDone(true); toast.success("Thanks! We'll be in touch."); }
    else toast.error(r.error);
  }

  if (done) {
    return <p className="rounded-lg border border-primary/30 bg-primary/10 p-6 text-center text-sm">Thanks for reaching out — the team will call you shortly.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="name" required placeholder="Your name" />
        <Input name="phone" required placeholder="Phone" />
      </div>
      <Input name="email" type="email" placeholder="Email (optional)" />
      <Textarea name="message" rows={3} placeholder="What are you looking for?" />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Sending…" : "Send enquiry"}</Button>
    </form>
  );
}
