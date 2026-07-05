"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/auth";
import { logActivity } from "@/lib/db/activity";
import { attendance, members, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/messaging";
import { env } from "@/lib/env";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/** Check a member in by scanning their QR token (gym-side scanner). */
export async function checkInByToken(token: string): Promise<Result<{ name: string }>> {
  const ctx = await requireGym();
  const member = await db.query.members.findFirst({
    where: and(eq(members.gymId, ctx.gym.id), eq(members.qrToken, token.trim())),
  });
  if (!member) return { ok: false, error: "No member matches that code" };

  await db.insert(attendance).values({ gymId: ctx.gym.id, personType: "member", memberId: member.id, method: "qr" });
  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "member.checked_in", entity: "member", entityId: member.id, summary: `${member.fullName} checked in (QR)` });

  revalidatePath("/app/attendance");
  revalidatePath("/app");
  return { ok: true, data: { name: member.fullName } };
}

/** Invite a member to the portal — links a member-role user row by email so a
 * Clerk signup with that email claims it (JIT). */
export async function inviteMember(memberId: string): Promise<Result> {
  const ctx = await requireGym();
  const member = await db.query.members.findFirst({ where: and(eq(members.gymId, ctx.gym.id), eq(members.id, memberId)) });
  if (!member) return { ok: false, error: "Member not found" };
  if (!member.email) return { ok: false, error: "Add an email to the member first" };

  const existing = await db.query.users.findFirst({ where: eq(users.email, member.email) });
  let userId: string;
  if (existing) {
    // Never downgrade/steal a staff, owner, or other-gym account.
    if (existing.role !== "member" || (existing.gymId && existing.gymId !== ctx.gym.id)) {
      return { ok: false, error: "That email already belongs to another account." };
    }
    userId = existing.id;
    if (!existing.gymId) await db.update(users).set({ gymId: ctx.gym.id }).where(eq(users.id, existing.id));
  } else {
    const [created] = await db
      .insert(users)
      .values({ clerkId: `invite_${member.id.slice(0, 12)}`, email: member.email, name: member.fullName, role: "member", gymId: ctx.gym.id })
      .returning();
    userId = created.id;
  }
  await db.update(members).set({ userId, updatedAt: new Date() }).where(eq(members.id, member.id));

  await sendEmail({
    gymId: ctx.gym.id,
    to: member.email,
    memberId: member.id,
    subject: `Your ${ctx.gym.name} member portal`,
    body: `Hi ${member.fullName},\n\n${ctx.gym.name} has invited you to your member portal — view your plan, QR check-in code, payments and classes.\n\nSign up with this email: ${env.NEXT_PUBLIC_APP_URL}/sign-up\n\nSee you at the gym!`,
  });

  await logActivity({ gymId: ctx.gym.id, actorUserId: ctx.user.id, action: "member.created", entity: "member", entityId: member.id, summary: `Portal invite sent to ${member.fullName}` });
  revalidatePath(`/app/members/${memberId}`);
  return { ok: true };
}
