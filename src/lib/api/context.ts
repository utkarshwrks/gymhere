import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/db";
import { apiKeys, apiPlans, apiUsageLogs } from "@/lib/db/schema";
import { hashKey } from "@/lib/api/keys";

export interface ApiKeyContext {
  apiKeyId: string;
  gymId: string;
  scopes: string[];
  quota: number;
  used: number;
}

type ApiKeyRow = typeof apiKeys.$inferSelect;

async function authenticate(req: Request): Promise<ApiKeyRow | null> {
  const header = req.headers.get("authorization") ?? "";
  const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!raw.startsWith("ghk_")) return null;
  const key = await db.query.apiKeys.findFirst({ where: eq(apiKeys.keyHash, hashKey(raw)) });
  if (!key || !key.isActive) return null;
  return key;
}

async function monthlyUsage(apiKeyId: string): Promise<number> {
  const rows = await db
    .select({ id: apiUsageLogs.id })
    .from(apiUsageLogs)
    .where(and(eq(apiUsageLogs.apiKeyId, apiKeyId), gte(apiUsageLogs.createdAt, startOfMonth(new Date()))));
  return rows.length;
}

async function logUsage(gymId: string, apiKeyId: string, endpoint: string, method: string, status: number, ms: number) {
  try {
    await db.insert(apiUsageLogs).values({ gymId, apiKeyId, endpoint, method, status, durationMs: ms });
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKeyId));
  } catch { /* metering must never break the response */ }
}

function withRateHeaders(res: NextResponse, quota: number, remaining: number): NextResponse {
  res.headers.set("X-RateLimit-Limit", String(quota));
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  res.headers.set("X-RateLimit-Reset", String(Math.floor(endOfMonth(new Date()).getTime() / 1000)));
  return res;
}

export interface HandlerResult {
  status: number;
  data: unknown;
}

/**
 * Wrap a public API route: authenticate the Bearer key, enforce the monthly
 * quota (429 + headers when exceeded), run the handler, and meter the call.
 */
export async function withApiKey(
  req: Request,
  opts: { endpoint: string; scope: "read" | "write" },
  handler: (ctx: ApiKeyContext) => Promise<HandlerResult>,
): Promise<NextResponse> {
  const started = Date.now();
  const method = req.method;

  const key = await authenticate(req);
  if (!key) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }
  if (opts.scope === "write" && !key.scopes.includes("write")) {
    await logUsage(key.gymId, key.id, opts.endpoint, method, 403, Date.now() - started);
    return NextResponse.json({ error: "This key lacks the write scope" }, { status: 403 });
  }

  const plan = key.apiPlanId ? await db.query.apiPlans.findFirst({ where: eq(apiPlans.id, key.apiPlanId) }) : null;
  const quota = plan?.monthlyQuota ?? 1000;
  const used = await monthlyUsage(key.id);

  if (used >= quota) {
    await logUsage(key.gymId, key.id, opts.endpoint, method, 429, Date.now() - started);
    return withRateHeaders(NextResponse.json({ error: "Monthly rate limit exceeded" }, { status: 429 }), quota, 0);
  }

  const ctx: ApiKeyContext = { apiKeyId: key.id, gymId: key.gymId, scopes: key.scopes, quota, used };
  let result: HandlerResult;
  try {
    result = await handler(ctx);
  } catch (err) {
    console.error("API handler error", err);
    result = { status: 500, data: { error: "Internal error" } };
  }

  await logUsage(key.gymId, key.id, opts.endpoint, method, result.status, Date.now() - started);
  return withRateHeaders(NextResponse.json(result.data as object, { status: result.status }), quota, quota - used - 1);
}
