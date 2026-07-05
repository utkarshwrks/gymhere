"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    // Demo: no external send. Wire to Resend/CRM in a later phase.
    await new Promise((r) => setTimeout(r, 600));
    setPending(false);
    (e.target as HTMLFormElement).reset();
    toast.success("Thanks! We'll be in touch within one business day.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required placeholder="Rohan Mehta" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gym">Gym name</Label>
          <Input id="gym" name="gym" placeholder="IronWorks Fitness" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@gym.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" placeholder="+91 90000 00000" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">How can we help?</Label>
        <Textarea id="message" name="message" rows={4} placeholder="Tell us about your gym…" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
