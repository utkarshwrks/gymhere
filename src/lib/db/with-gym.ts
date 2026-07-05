import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "./index";

/**
 * Tenancy guard. Every gym-scoped query MUST go through withGym(gymId) so a
 * tenant can never read or write another tenant's rows. Direct table access in
 * route/action files is a review failure (BUILD-PLAN.md Appendix).
 *
 *   const gym = withGym(gymId);
 *   const rows = await gym.select(members);                // auto-filtered
 *   const one  = await gym.select(members, eq(members.id, id));
 *   await gym.insert(members, { fullName, phone, ... });   // gym_id injected
 */
type GymScopedTable = PgTable & { gymId: PgColumn };

export function withGym(gymId: string) {
  const scope = (table: GymScopedTable, extra?: SQL): SQL => {
    const base = eq(table.gymId, gymId);
    return extra ? (and(base, extra) as SQL) : base;
  };

  return {
    gymId,

    /** Filtered SELECT. Returns all rows for the gym, optionally narrowed. */
    select(table: GymScopedTable, extra?: SQL) {
      return db
        .select()
        .from(table as PgTable)
        .where(scope(table, extra));
    },

    /** WHERE condition scoped to this gym — for composing custom queries. */
    where(table: GymScopedTable, extra?: SQL): SQL {
      return scope(table, extra);
    },

    /** INSERT with gym_id injected. Returns inserted rows. */
    insert(
      table: GymScopedTable,
      values: Record<string, unknown> | Record<string, unknown>[],
    ) {
      const withGymId = Array.isArray(values)
        ? values.map((v) => ({ ...v, gymId }))
        : { ...values, gymId };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return db.insert(table).values(withGymId as any).returning();
    },

    /** UPDATE scoped to this gym. */
    update(table: GymScopedTable, values: Record<string, unknown>, extra?: SQL) {
      return db
        .update(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(values as any)
        .where(scope(table, extra))
        .returning();
    },

    /** DELETE scoped to this gym. */
    delete(table: GymScopedTable, extra?: SQL) {
      return db.delete(table).where(scope(table, extra)).returning();
    },
  };
}

export type GymScope = ReturnType<typeof withGym>;
