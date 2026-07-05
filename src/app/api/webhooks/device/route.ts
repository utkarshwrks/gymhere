import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceDevices, gymSettings, members } from "@/lib/db/schema";
import { recordPunch } from "@/lib/attendance-core";

export const dynamic = "force-dynamic";

/**
 * Biometric/access-control device webhook (ESSL-style). Payload is signed with
 * the gym's device secret; the device is identified by serial. Each punch is an
 * in/out toggle for the matched member (matched by qr token).
 *
 *   headers: x-device-signature = HMAC_SHA256(rawBody, deviceSecret)
 *   body: { serial, punches: [{ token, ts? }] }
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: DevicePayload;
  try {
    payload = JSON.parse(raw) as DevicePayload;
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  if (!payload.serial) return NextResponse.json({ error: "Missing serial" }, { status: 400 });

  const device = await db.query.attendanceDevices.findFirst({
    where: and(eq(attendanceDevices.serial, payload.serial), eq(attendanceDevices.isActive, true)),
  });
  if (!device) return NextResponse.json({ error: "Unknown device" }, { status: 404 });

  const settings = await db.query.gymSettings.findFirst({ where: eq(gymSettings.gymId, device.gymId) });
  if (!settings?.deviceSecret) return NextResponse.json({ error: "Device not provisioned" }, { status: 400 });

  const signature = req.headers.get("x-device-signature") ?? "";
  const expected = crypto.createHmac("sha256", settings.deviceSecret).update(raw).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const results: { token: string; direction?: string; error?: string }[] = [];
  for (const punch of payload.punches ?? []) {
    const member = await db.query.members.findFirst({
      where: and(eq(members.gymId, device.gymId), eq(members.qrToken, punch.token)),
    });
    if (!member) {
      results.push({ token: punch.token, error: "no match" });
      continue;
    }
    const r = await recordPunch(device.gymId, member.id, "biometric");
    results.push({ token: punch.token, direction: r.direction });
  }

  return NextResponse.json({ ok: true, results });
}

interface DevicePayload {
  serial: string;
  punches?: { token: string; ts?: string }[];
}
