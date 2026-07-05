"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, Star } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { setReviewStatus, toggleReviewMicrosite } from "@/lib/actions/reviews";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Review { id: string; authorName: string; rating: number; comment: string | null; status: string; showOnMicrosite: boolean; createdAt: string }

export function ReviewsView({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const pending = reviews.filter((r) => r.status === "pending");
  const rest = reviews.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Approve member reviews and choose which show on your microsite." />

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Members can rate your gym from their portal — they'll appear here for approval." />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Awaiting moderation</h2>
              {pending.map((r) => <ReviewCard key={r.id} review={r} onDone={() => router.refresh()} />)}
            </section>
          )}
          {rest.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Moderated</h2>
              {rest.map((r) => <ReviewCard key={r.id} review={r} onDone={() => router.refresh()} />)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, onDone }: { review: Review; onDone: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">{review.authorName}</span>
            <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("size-4", i < review.rating ? "fill-primary text-primary" : "text-muted-foreground")} />)}</span>
            <Badge variant={review.status === "approved" ? "success" : review.status === "hidden" ? "muted" : "warning"} className="capitalize">{review.status}</Badge>
          </div>
          {review.comment && <p className="text-sm text-muted-foreground">“{review.comment}”</p>}
          <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {review.status === "approved" && (
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={review.showOnMicrosite} onCheckedChange={async (v) => { const r = await toggleReviewMicrosite(review.id, v); if (r.ok) { toast.success(v ? "Shown on microsite" : "Hidden from microsite"); onDone(); } else toast.error(r.error); }} /> Microsite
            </label>
          )}
          {review.status !== "approved" ? (
            <Button size="sm" onClick={async () => { const r = await setReviewStatus(review.id, "approved"); if (r.ok) { toast.success("Approved"); onDone(); } else toast.error(r.error); }}><Eye className="size-4" /> Approve</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={async () => { const r = await setReviewStatus(review.id, "hidden"); if (r.ok) { toast.success("Hidden"); onDone(); } else toast.error(r.error); }}><EyeOff className="size-4" /> Hide</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
