import { and, asc, eq, gte, lte } from "drizzle-orm";
import { endOfDay } from "date-fns";
import { db } from "@/lib/db";
import { enquiries, enquiryFollowups, enquiryStages } from "@/lib/db/schema";

export type StageRow = typeof enquiryStages.$inferSelect;
export type EnquiryRow = typeof enquiries.$inferSelect;

const DEFAULT_STAGES = [
  { name: "New", sortOrder: 0, isTerminal: false, isWon: false },
  { name: "Contacted", sortOrder: 1, isTerminal: false, isWon: false },
  { name: "Trial", sortOrder: 2, isTerminal: false, isWon: false },
  { name: "Converted", sortOrder: 3, isTerminal: true, isWon: true },
  { name: "Lost", sortOrder: 4, isTerminal: true, isWon: false },
];

/** Seed the 5 default pipeline stages the first time a gym opens the CRM. */
export async function ensureDefaultStages(gymId: string): Promise<StageRow[]> {
  const existing = await db
    .select()
    .from(enquiryStages)
    .where(eq(enquiryStages.gymId, gymId))
    .orderBy(asc(enquiryStages.sortOrder));
  if (existing.length > 0) return existing;

  await db.insert(enquiryStages).values(DEFAULT_STAGES.map((s) => ({ ...s, gymId })));
  return db
    .select()
    .from(enquiryStages)
    .where(eq(enquiryStages.gymId, gymId))
    .orderBy(asc(enquiryStages.sortOrder));
}

export interface BoardEnquiry extends EnquiryRow {
  nextFollowupAt: string | null;
  followupDue: boolean;
}

export interface Board {
  stages: StageRow[];
  byStage: Record<string, BoardEnquiry[]>;
}

export async function getBoard(gymId: string): Promise<Board> {
  const stages = await ensureDefaultStages(gymId);
  const [enqRows, followups] = await Promise.all([
    db
      .select()
      .from(enquiries)
      .where(eq(enquiries.gymId, gymId))
      .orderBy(asc(enquiries.sortOrder), asc(enquiries.createdAt)),
    db
      .select()
      .from(enquiryFollowups)
      .where(and(eq(enquiryFollowups.gymId, gymId), eq(enquiryFollowups.done, false)))
      .orderBy(asc(enquiryFollowups.dueAt)),
  ]);

  const nextByEnquiry = new Map<string, Date>();
  for (const f of followups) {
    if (!nextByEnquiry.has(f.enquiryId)) nextByEnquiry.set(f.enquiryId, f.dueAt);
  }

  const now = new Date();
  const byStage: Record<string, BoardEnquiry[]> = {};
  for (const s of stages) byStage[s.id] = [];
  for (const e of enqRows) {
    const next = nextByEnquiry.get(e.id) ?? null;
    const item: BoardEnquiry = {
      ...e,
      nextFollowupAt: next ? next.toISOString() : null,
      followupDue: next ? next <= now : false,
    };
    (byStage[e.stageId] ??= []).push(item);
  }

  return { stages, byStage };
}

/** Count of follow-ups due today or overdue — drives the sidebar badge. */
export async function dueFollowupCount(gymId: string): Promise<number> {
  const rows = await db
    .select({ id: enquiryFollowups.id })
    .from(enquiryFollowups)
    .where(
      and(
        eq(enquiryFollowups.gymId, gymId),
        eq(enquiryFollowups.done, false),
        lte(enquiryFollowups.dueAt, endOfDay(new Date())),
        gte(enquiryFollowups.dueAt, new Date(0)),
      ),
    );
  return rows.length;
}

export async function getFollowupsForEnquiry(gymId: string, enquiryId: string) {
  return db
    .select()
    .from(enquiryFollowups)
    .where(and(eq(enquiryFollowups.gymId, gymId), eq(enquiryFollowups.enquiryId, enquiryId)))
    .orderBy(asc(enquiryFollowups.dueAt));
}
