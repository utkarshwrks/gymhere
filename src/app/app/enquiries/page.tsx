import type { Metadata } from "next";
import { requireGym } from "@/lib/auth";
import { getBoard } from "@/lib/queries/enquiries";
import { listPlansForGym } from "@/lib/queries/members";
import { KanbanBoard, type KEnquiry } from "@/components/enquiries/kanban-board";

export const metadata: Metadata = { title: "Enquiries" };
export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const ctx = await requireGym();
  const [board, plans] = await Promise.all([getBoard(ctx.gym.id), listPlansForGym(ctx.gym.id)]);

  const initial: Record<string, KEnquiry[]> = {};
  for (const [stageId, list] of Object.entries(board.byStage)) {
    initial[stageId] = list.map((e) => ({
      id: e.id,
      name: e.name,
      phone: e.phone,
      email: e.email,
      interest: e.interest,
      source: e.source,
      stageId: e.stageId,
      nextFollowupAt: e.nextFollowupAt,
      followupDue: e.followupDue,
      convertedMemberId: e.convertedMemberId,
    }));
  }

  return (
    <KanbanBoard
      stages={board.stages.map((s) => ({ id: s.id, name: s.name, isWon: s.isWon, isTerminal: s.isTerminal }))}
      initial={initial}
      plans={plans.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
