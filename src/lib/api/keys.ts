import crypto from "node:crypto";

/** Raw API keys look like `ghk_<40 hex>`. Only the SHA-256 hash is stored. */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = crypto.randomBytes(20).toString("hex");
  const raw = `ghk_${secret}`;
  return { raw, hash: hashKey(raw), prefix: displayPrefix(raw) };
}

export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function displayPrefix(raw: string): string {
  return `${raw.slice(0, 12)}…${raw.slice(-4)}`;
}
