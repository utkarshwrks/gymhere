import { db } from "./index";
import { activityLogs } from "./schema";

export type ActivityAction =
  | "member.created"
  | "member.renewed"
  | "member.frozen"
  | "member.unfrozen"
  | "member.cancelled"
  | "member.checked_in"
  | "member.weight_logged"
  | "plan.created"
  | "plan.updated"
  | "plan.archived"
  | "enquiry.created"
  | "enquiry.stage_changed"
  | "enquiry.converted"
  | "enquiry.followup_scheduled";

/** Append to the gym's activity feed. Never throws into the caller's happy path. */
export async function logActivity(input: {
  gymId: string;
  actorUserId?: string | null;
  action: ActivityAction;
  entity: string;
  entityId?: string;
  summary?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      gymId: input.gymId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      summary: input.summary,
      meta: input.meta ?? {},
    });
  } catch (err) {
    console.error("logActivity failed", err);
  }
}
