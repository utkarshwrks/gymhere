import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import {
  gymAmenities,
  gymPhotos,
  gymSettings,
  gyms,
  memberReviews,
  membershipPlans,
  trainers,
} from "@/lib/db/schema";

export interface Microsite {
  published: boolean;
  gym: { name: string; slug: string; logoUrl: string | null };
  settings: { heroTagline: string | null; aboutText: string | null; mapEmbedUrl: string | null; city: string | null; phone: string | null; email: string | null };
  photos: { id: string; url: string; caption: string | null }[];
  amenities: { id: string; name: string }[];
  plans: { id: string; name: string; pricePaise: number; durationMonths: number; features: string[] }[];
  trainers: { id: string; name: string; specialization: string | null; photoUrl: string | null }[];
  reviews: { id: string; authorName: string; rating: number; comment: string | null }[];
}

export async function getMicrosite(slug: string): Promise<Microsite | null> {
  if (!isConfigured.db) return null;
  const gym = await db.query.gyms.findFirst({ where: eq(gyms.slug, slug) });
  if (!gym) return null;

  const settings = await db.query.gymSettings.findFirst({ where: eq(gymSettings.gymId, gym.id) });
  const published = settings?.micrositePublished ?? false;

  const [photos, amenities, plans, trainerRows, reviews] = await Promise.all([
    db.select().from(gymPhotos).where(eq(gymPhotos.gymId, gym.id)).orderBy(asc(gymPhotos.sortOrder)),
    db.select().from(gymAmenities).where(eq(gymAmenities.gymId, gym.id)),
    db.select().from(membershipPlans).where(and(eq(membershipPlans.gymId, gym.id), eq(membershipPlans.isArchived, false))).orderBy(asc(membershipPlans.sortOrder)),
    db.select().from(trainers).where(eq(trainers.gymId, gym.id)),
    db.select().from(memberReviews).where(and(eq(memberReviews.gymId, gym.id), eq(memberReviews.status, "approved"), eq(memberReviews.showOnMicrosite, true))),
  ]);

  return {
    published,
    gym: { name: gym.name, slug: gym.slug, logoUrl: gym.logoUrl },
    settings: {
      heroTagline: settings?.heroTagline ?? null,
      aboutText: settings?.aboutText ?? null,
      mapEmbedUrl: settings?.mapEmbedUrl ?? null,
      city: settings?.city ?? null,
      phone: settings?.phone ?? null,
      email: settings?.email ?? null,
    },
    photos: photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption })),
    amenities: amenities.map((a) => ({ id: a.id, name: a.name })),
    plans: plans.map((p) => ({ id: p.id, name: p.name, pricePaise: p.pricePaise, durationMonths: p.durationMonths, features: (p.features ?? []) as string[] })),
    trainers: trainerRows.map((t) => ({ id: t.id, name: t.name, specialization: t.specialization, photoUrl: t.photoUrl })),
    reviews: reviews.map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, comment: r.comment })),
  };
}
