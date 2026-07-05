import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { AnnouncementsView } from "@/components/super-admin/announcements-view";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return (
    <AnnouncementsView
      announcements={rows.map((a) => ({ id: a.id, title: a.title, body: a.body, isActive: a.isActive, createdAt: a.createdAt.toISOString() }))}
    />
  );
}
