import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { withGym } from "@/lib/db/with-gym";
import { attendance, enquiries, gyms, invoices, memberSubscriptions, members, membershipPlans } from "@/lib/db/schema";

/**
 * Tenant-isolation audit. Uses gym A's scope to attempt to read/write gym B's
 * rows and asserts every attempt is denied (0 rows). Run: npm run test:isolation
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const gymRows = await db.select().from(gyms).limit(2);
  if (gymRows.length < 2) throw new Error("Need at least 2 gyms — run `npm run seed:demo` first.");
  const [gymA, gymB] = gymRows;
  const scopeA = withGym(gymA.id);

  const memberB = await db.query.members.findFirst({ where: eq(members.gymId, gymB.id) });
  if (!memberB) throw new Error("Gym B has no members to test against — seed demo data first.");

  const checks: { name: string; pass: boolean }[] = [];
  const record = (name: string, pass: boolean) => checks.push({ name, pass });

  // --- Reads: gym A must not see gym B's rows ---
  record("read members", (await scopeA.select(members, eq(members.id, memberB.id))).length === 0);
  record("read subscriptions", (await scopeA.select(memberSubscriptions, eq(memberSubscriptions.memberId, memberB.id))).length === 0);
  record("read invoices", (await scopeA.select(invoices, eq(invoices.memberId, memberB.id))).length === 0);
  record("read attendance", (await scopeA.select(attendance, eq(attendance.memberId, memberB.id))).length === 0);
  record("read enquiries", (await scopeA.select(enquiries, eq(enquiries.gymId, gymB.id))).length === 0);
  record("read plans", (await scopeA.select(membershipPlans, eq(membershipPlans.gymId, gymB.id))).length === 0);

  // --- Writes: gym A must not mutate gym B's rows ---
  const beforePhone = memberB.phone;
  const updated = await scopeA.update(members, { phone: "+910000000000" }, eq(members.id, memberB.id));
  record("update member (blocked)", updated.length === 0);
  const stillSame = await db.query.members.findFirst({ where: eq(members.id, memberB.id) });
  record("member unchanged", stillSame?.phone === beforePhone);

  const deleted = await scopeA.delete(members, eq(members.id, memberB.id));
  record("delete member (blocked)", deleted.length === 0);
  const stillExists = await db.query.members.findFirst({ where: eq(members.id, memberB.id) });
  record("member still exists", !!stillExists);

  const passed = checks.filter((c) => c.pass).length;
  console.log(`\nTenant isolation: ${passed}/${checks.length} passed\n`);
  for (const c of checks) console.log(`  ${c.pass ? "✓" : "✗"} ${c.name}`);

  if (passed !== checks.length) {
    console.error("\n❌ Tenant isolation FAILED");
    process.exit(1);
  }
  console.log("\n✅ All cross-tenant access denied");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
