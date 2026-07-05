import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberReviews } from "@/lib/db/schema";
import { ReviewsView } from "@/components/reviews/reviews-view";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const ctx = await requireGym();
  const rows = await db.select().from(memberReviews).where(eq(memberReviews.gymId, ctx.gym.id)).orderBy(desc(memberReviews.createdAt));
  return (
    <ReviewsView
      reviews={rows.map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, comment: r.comment, status: r.status, showOnMicrosite: r.showOnMicrosite, createdAt: r.createdAt.toISOString() }))}
    />
  );
}
