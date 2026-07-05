"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import { enquiries, gymAmenities, gymPhotos, gymSettings, gyms } from "@/lib/db/schema";
import { ensureDefaultStages } from "@/lib/queries/enquiries";

type Result = { ok: true } | { ok: false; error: string };

const settingsSchema = z.object({
  heroTagline: z.string().max(120).optional(),
  aboutText: z.string().max(1000).optional(),
  mapEmbedUrl: z.string().max(500).optional(),
  micrositePublished: z.boolean(),
});

export async function updateMicrositeSettings(input: z.input<typeof settingsSchema>): Promise<Result> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid settings" };
  const ctx = await requireGym();
  await db.update(gymSettings).set({
    heroTagline: parsed.data.heroTagline || null,
    aboutText: parsed.data.aboutText || null,
    mapEmbedUrl: parsed.data.mapEmbedUrl || null,
    micrositePublished: parsed.data.micrositePublished,
    updatedAt: new Date(),
  }).where(eq(gymSettings.gymId, ctx.gym.id));
  revalidatePath("/app/settings/microsite");
  revalidatePath(`/g/${ctx.gym.slug}`);
  return { ok: true };
}

export async function addPhoto(url: string, caption?: string): Promise<Result> {
  const ctx = await requireGym();
  if (!url.trim()) return { ok: false, error: "Image URL required" };
  const count = await db.select({ id: gymPhotos.id }).from(gymPhotos).where(eq(gymPhotos.gymId, ctx.gym.id));
  await db.insert(gymPhotos).values({ gymId: ctx.gym.id, url: url.trim(), caption: caption || null, sortOrder: count.length });
  revalidatePath("/app/settings/microsite");
  revalidatePath(`/g/${ctx.gym.slug}`);
  return { ok: true };
}

export async function deletePhoto(photoId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.delete(gymPhotos).where(and(eq(gymPhotos.gymId, ctx.gym.id), eq(gymPhotos.id, photoId)));
  revalidatePath("/app/settings/microsite");
  revalidatePath(`/g/${ctx.gym.slug}`);
  return { ok: true };
}

export async function addAmenity(name: string): Promise<Result> {
  const ctx = await requireGym();
  if (!name.trim()) return { ok: false, error: "Name required" };
  await db.insert(gymAmenities).values({ gymId: ctx.gym.id, name: name.trim() });
  revalidatePath("/app/settings/microsite");
  revalidatePath(`/g/${ctx.gym.slug}`);
  return { ok: true };
}

export async function deleteAmenity(amenityId: string): Promise<Result> {
  const ctx = await requireGym();
  await db.delete(gymAmenities).where(and(eq(gymAmenities.gymId, ctx.gym.id), eq(gymAmenities.id, amenityId)));
  revalidatePath("/app/settings/microsite");
  revalidatePath(`/g/${ctx.gym.slug}`);
  return { ok: true };
}

const enquirySchema = z.object({
  slug: z.string(),
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().max(300).optional(),
});

/** Public — the microsite enquiry form. Drops a lead into the gym's CRM tagged website. */
export async function submitMicrositeEnquiry(input: z.input<typeof enquirySchema>): Promise<Result> {
  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid enquiry" };
  const d = parsed.data;

  const gym = await db.query.gyms.findFirst({ where: eq(gyms.slug, d.slug) });
  if (!gym) return { ok: false, error: "Gym not found" };

  const stages = await ensureDefaultStages(gym.id);
  await db.insert(enquiries).values({
    gymId: gym.id,
    name: d.name,
    phone: d.phone,
    email: d.email || null,
    interest: d.message || null,
    source: "website",
    stageId: stages[0].id,
  });
  await logActivity({ gymId: gym.id, action: "enquiry.created", entity: "enquiry", summary: `${d.name} enquired via microsite` });
  return { ok: true };
}
