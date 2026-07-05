"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/lib/actions/member";
import { cn } from "@/lib/utils";

export function ReviewForm({ gymName }: { gymName: string }) {
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function submit() {
    if (rating === 0) return toast.error("Pick a star rating.");
    setPending(true);
    const r = await submitReview({ rating, comment });
    setPending(false);
    if (r.ok) { toast.success("Thanks for your review!"); setDone(true); } else toast.error(r.error);
  }

  if (done) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Thanks — your review is awaiting {gymName}&apos;s approval.</CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Rate {gymName}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} stars`}>
              <Star className={cn("size-7 transition-colors", (hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
        <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell others what you love about the gym…" />
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>{pending ? "Submitting…" : "Submit review"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
