import { db } from "@/lib/db";
import { outbox } from "@/lib/db/schema";
import { resolveEmailContext } from "@/lib/credentials/resolver";

function realKey(v: string): boolean {
  return !!v && !/_xxx$|^xxx$/i.test(v) && !v.includes("xxxx");
}

export interface OutgoingMessage {
  gymId: string;
  to: string;
  memberId?: string | null;
  subject?: string;
  body: string;
}

/**
 * Channel providers behind one interface. Email is real via Resend when
 * configured; SMS/WhatsApp use a DemoProvider that only writes to the outbox so
 * the delivery log works without a paid provider. Production swaps in a real
 * provider with no call-site changes.
 */
async function logOutbox(
  msg: OutgoingMessage,
  channel: "email" | "sms" | "whatsapp",
  status: "queued" | "sent" | "failed",
  provider: string,
  error?: string,
) {
  await db.insert(outbox).values({
    gymId: msg.gymId,
    channel,
    toAddress: msg.to,
    memberId: msg.memberId ?? null,
    subject: msg.subject ?? null,
    body: msg.body,
    status,
    provider,
    error: error ?? null,
    sentAt: status === "sent" ? new Date() : null,
  });
}

export async function sendEmail(msg: OutgoingMessage): Promise<{ ok: boolean; error?: string }> {
  const email = await resolveEmailContext(msg.gymId);
  if (!realKey(email.apiKey)) {
    // No real key (demo, or tenant-mode without verified creds) → log only.
    await logOutbox(msg, "email", "sent", "demo");
    return { ok: true };
  }
  const provider = email.source === "tenant" ? "resend (gym)" : "resend";
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(email.apiKey);
    const { error } = await resend.emails.send({
      from: email.fromEmail,
      to: msg.to,
      subject: msg.subject ?? "Message from your gym",
      text: msg.body,
    });
    if (error) {
      await logOutbox(msg, "email", "failed", provider, error.message);
      return { ok: false, error: error.message };
    }
    await logOutbox(msg, "email", "sent", provider);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed";
    await logOutbox(msg, "email", "failed", provider, message);
    return { ok: false, error: message };
  }
}

/** Demo providers: log to outbox only (no paid SMS/WhatsApp gateway). */
export async function sendSms(msg: OutgoingMessage): Promise<{ ok: boolean }> {
  await logOutbox(msg, "sms", "sent", "demo");
  return { ok: true };
}

export async function sendWhatsapp(msg: OutgoingMessage): Promise<{ ok: boolean }> {
  await logOutbox(msg, "whatsapp", "sent", "demo");
  return { ok: true };
}

export async function sendVia(
  channel: "email" | "sms" | "whatsapp",
  msg: OutgoingMessage,
): Promise<{ ok: boolean; error?: string }> {
  if (channel === "email") return sendEmail(msg);
  if (channel === "sms") return sendSms(msg);
  return sendWhatsapp(msg);
}

/** Fill {{name}}, {{expiry_date}}, {{due_amount}} etc. */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
