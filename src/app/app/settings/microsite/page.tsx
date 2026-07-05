import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { gymAmenities, gymPhotos, gymSettings } from "@/lib/db/schema";
import { isConfigured } from "@/lib/env";
import { MicrositeEditor } from "@/components/microsite/microsite-editor";

export const metadata: Metadata = { title: "Microsite" };
export const dynamic = "force-dynamic";

export default async function MicrositeSettingsPage() {
  const ctx = await requireGym();
  const [settings, photos, amenities] = await Promise.all([
    db.query.gymSettings.findFirst({ where: eq(gymSettings.gymId, ctx.gym.id) }),
    db.select().from(gymPhotos).where(eq(gymPhotos.gymId, ctx.gym.id)).orderBy(asc(gymPhotos.sortOrder)),
    db.select().from(gymAmenities).where(eq(gymAmenities.gymId, ctx.gym.id)),
  ]);

  return (
    <MicrositeEditor
      slug={ctx.gym.slug}
      uploadEnabled={isConfigured.uploadthing}
      settings={{
        heroTagline: settings?.heroTagline ?? "",
        aboutText: settings?.aboutText ?? "",
        mapEmbedUrl: settings?.mapEmbedUrl ?? "",
        micrositePublished: settings?.micrositePublished ?? false,
      }}
      photos={photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption }))}
      amenities={amenities.map((a) => ({ id: a.id, name: a.name }))}
    />
  );
}
