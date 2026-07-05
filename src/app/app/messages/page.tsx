import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireGym } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactGroups, messageTemplates, outbox } from "@/lib/db/schema";
import { MessagesView } from "@/components/messages/messages-view";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const ctx = await requireGym();
  const [templates, groups, outboxRows] = await Promise.all([
    db.select().from(messageTemplates).where(eq(messageTemplates.gymId, ctx.gym.id)).orderBy(desc(messageTemplates.createdAt)),
    db.select().from(contactGroups).where(eq(contactGroups.gymId, ctx.gym.id)),
    db.select().from(outbox).where(eq(outbox.gymId, ctx.gym.id)).orderBy(desc(outbox.createdAt)).limit(100),
  ]);

  return (
    <MessagesView
      templates={templates.map((t) => ({ id: t.id, name: t.name, channel: t.channel, subject: t.subject, body: t.body }))}
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      outbox={outboxRows.map((o) => ({ id: o.id, channel: o.channel, to: o.toAddress, subject: o.subject, status: o.status, provider: o.provider, createdAt: o.createdAt.toISOString() }))}
    />
  );
}
