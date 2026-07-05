import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver (edge/serverless friendly).
 * DATABASE_URL may be absent in demo builds — the proxy below throws a clear
 * error only when a query is actually attempted, so `next build` never crashes
 * on an unconfigured DB.
 */
function createDb() {
  if (!env.DATABASE_URL) {
    return new Proxy({} as ReturnType<typeof realDb>, {
      get() {
        throw new Error(
          "DATABASE_URL is not set. Add a Neon connection string to .env.local.",
        );
      },
    });
  }
  return realDb();
}

function realDb() {
  const sql = neon(env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export const db = createDb();
export { schema };
export type Db = ReturnType<typeof realDb>;
