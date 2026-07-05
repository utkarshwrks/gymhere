import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env, isConfigured } from "@/lib/env";

/**
 * Clerk user lifecycle → users table sync. New sign-ups become gym_owner and
 * onboard a gym next; members are linked via invite (Phase 4).
 */
export async function POST(req: Request) {
  if (!isConfigured.clerk || !env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return NextResponse.json({ error: "Clerk not configured" }, { status: 503 });
  }

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let evt: ClerkEvent;
  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SIGNING_SECRET);
    evt = wh.verify(payload, headers) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created" || type === "user.updated") {
    const email =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
        ?.email_address ??
      data.email_addresses?.[0]?.email_address ??
      "";
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    const existing = await db.query.users.findFirst({
      where: eq(users.clerkId, data.id),
    });

    if (existing) {
      await db
        .update(users)
        .set({ email, name, imageUrl: data.image_url ?? null, updatedAt: new Date() })
        .where(eq(users.clerkId, data.id));
    } else {
      await db.insert(users).values({
        clerkId: data.id,
        email,
        name,
        imageUrl: data.image_url ?? null,
        role: "gym_owner",
      });
    }
  }

  if (type === "user.deleted" && data.id) {
    await db.delete(users).where(eq(users.clerkId, data.id));
  }

  return NextResponse.json({ ok: true });
}

interface ClerkEvent {
  type: string;
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    primary_email_address_id?: string | null;
    email_addresses?: { id: string; email_address: string }[];
  };
}
