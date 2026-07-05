import crypto from "node:crypto";
import { env, isDemo } from "@/lib/env";

/**
 * AES-256-GCM at-rest encryption for tenant credentials. The key comes from
 * CREDENTIALS_ENCRYPTION_KEY (32-byte hex or base64). In demo without a key we
 * fall back to a deterministic dev key so the flow is exercisable — set a real
 * key in production (`openssl rand -hex 32`).
 */
function getKey(): Buffer {
  const raw = env.CREDENTIALS_ENCRYPTION_KEY;
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
    return crypto.createHash("sha256").update(raw).digest();
  }
  // The deterministic dev key is only acceptable in demo. In production a missing
  // key must fail loudly rather than silently encrypt with a source-tree key.
  if (!isDemo) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is required in production (openssl rand -hex 32).");
  }
  return crypto.createHash("sha256").update("gymhere-demo-insecure-key").digest();
}

/** Encrypt a string → `iv:tag:ciphertext` (all base64). */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB, tagB, dataB] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}

export function encryptJson(obj: Record<string, string>): string {
  return encryptSecret(JSON.stringify(obj));
}

export function decryptJson(payload: string): Record<string, string> {
  return JSON.parse(decryptSecret(payload)) as Record<string, string>;
}

/** Mask a value for display, e.g. `rzp_live_••••4F2A`. Never reveals the whole
 * string, even for short values. */
export function maskHint(value: string): string {
  if (value.length <= 12) return `••••${value.slice(-2)}`;
  return `${value.slice(0, 8)}••••${value.slice(-4)}`;
}
