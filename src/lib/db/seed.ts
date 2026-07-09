import "../../../scripts/load-env";
import { addDays, format, subDays } from "date-fns";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import {
  attendance,
  enquiries,
  enquiryStages,
  gymSettings,
  gymSubscriptions,
  gyms,
  integrationPolicies,
  memberSubscriptions,
  members,
  membershipPlans,
  platformPlans,
  users,
} from "./schema";
import { computeEndDate } from "@/lib/membership";
import { slugify, randomToken } from "@/lib/slug";

/**
 * Seed: 3 platform plans, a super admin, and a demo gym populated with sample
 * plans, members, attendance and leads so the app looks alive for testing.
 * Idempotent — safe to re-run.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed. Set it in .env.local.");
  }
  console.log("Seeding GymHere…");

  // --- Platform plans ---
  const planRows: { key: string; name: string; pricePaise: number; memberCap: number | null; sortOrder: number; description: string; features: Record<string, boolean> }[] = [
    { key: "starter", name: "Starter", pricePaise: 99_900, memberCap: 100, sortOrder: 1, description: "For a single studio finding its feet.", features: { classes: true, microsite: true, reports_advanced: false, api_access: false, whatsapp: false, pos: false, payroll: false } },
    { key: "growth", name: "Growth", pricePaise: 249_900, memberCap: 500, sortOrder: 2, description: "For a busy gym scaling members and staff.", features: { classes: true, microsite: true, reports_advanced: true, api_access: false, whatsapp: true, pos: true, payroll: true, byo_credentials: true } },
    { key: "pro", name: "Pro", pricePaise: 499_900, memberCap: null, sortOrder: 3, description: "Unlimited members, API access and every module.", features: { classes: true, microsite: true, reports_advanced: true, api_access: true, whatsapp: true, pos: true, payroll: true, byo_credentials: true } },
  ];
  for (const p of planRows) {
    const existing = await db.query.platformPlans.findFirst({ where: eq(platformPlans.key, p.key) });
    if (existing) await db.update(platformPlans).set(p).where(eq(platformPlans.key, p.key));
    else await db.insert(platformPlans).values(p);
  }
  console.log("  ✓ 3 platform plans");

  // --- Default integration policies (platform-managed for every service) ---
  for (const service of ["payments", "sms", "whatsapp", "email", "storage"] as const) {
    const has = await db.query.integrationPolicies.findFirst({ where: and(isNull(integrationPolicies.gymId), eq(integrationPolicies.service, service)) });
    if (!has) await db.insert(integrationPolicies).values({ gymId: null, service, mode: "platform", allowPlatformFallback: true });
  }
  console.log("  ✓ integration policies (platform)");

  // --- Super admin ---
  // Set DEMO_ADMIN_EMAIL / DEMO_OWNER_EMAIL to YOUR email so that signing up
  // with it (Clerk) claims the seeded row via just-in-time provisioning.
  const superEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@gymhere.app";
  let superAdmin = await db.query.users.findFirst({ where: eq(users.email, superEmail) });
  if (!superAdmin) {
    [superAdmin] = await db.insert(users).values({ clerkId: "seed_super_admin", email: superEmail, name: "Platform Admin", role: "super_admin" }).returning();
  }
  console.log(`  ✓ super admin (${superEmail})`);

  // --- Demo gym ---
  const growth = await db.query.platformPlans.findFirst({ where: eq(platformPlans.key, "growth") });
  const gymName = "IronWorks Fitness";
  const slug = slugify(gymName);
  let gym = await db.query.gyms.findFirst({ where: eq(gyms.slug, slug) });
  const ownerEmail = process.env.DEMO_OWNER_EMAIL ?? "owner@ironworks.demo";

  if (!gym) {
    let owner = await db.query.users.findFirst({ where: eq(users.email, ownerEmail) });
    if (!owner) {
      [owner] = await db.insert(users).values({ clerkId: "seed_owner_ironworks", email: ownerEmail, name: "Rohan Mehta", role: "gym_owner" }).returning();
    }
    [gym] = await db.insert(gyms).values({ slug, name: gymName, ownerUserId: owner.id, status: "active" }).returning();
    await db.update(users).set({ gymId: gym.id }).where(eq(users.id, owner.id));
    await db.insert(gymSettings).values({ gymId: gym.id, currency: "INR", timezone: "Asia/Kolkata", city: "Pune", phone: "+91 98220 00000", email: ownerEmail });
    await db.insert(gymSubscriptions).values({ gymId: gym.id, planId: growth!.id, status: "trialing", trialEndsAt: addDays(new Date(), 14) });
    console.log(`  ✓ demo gym "${gymName}" (trialing)`);
  }

  // --- Sample data for the demo gym (only if no plans yet) ---
  const existingPlans = await db.query.membershipPlans.findFirst({ where: eq(membershipPlans.gymId, gym.id) });
  if (existingPlans) {
    console.log("  • demo gym already has sample data — skipping");
    console.log("Done.");
    return;
  }

  const gymPlans = [
    { name: "Monthly", durationMonths: 1, pricePaise: 150_000, sessionsPerWeek: 6, features: ["Gym floor", "Locker"], sortOrder: 1 },
    { name: "Quarterly", durationMonths: 3, pricePaise: 400_000, sessionsPerWeek: 6, features: ["Gym floor", "Group classes", "Locker"], sortOrder: 2 },
    { name: "Annual", durationMonths: 12, pricePaise: 1_200_000, sessionsPerWeek: 7, features: ["Gym floor", "Group classes", "Locker", "1 PT review"], sortOrder: 3 },
  ];
  const insertedPlans = await db.insert(membershipPlans).values(gymPlans.map((p) => ({ gymId: gym!.id, ...p }))).returning();
  const planByName = new Map(insertedPlans.map((p) => [p.name, p]));
  console.log("  ✓ 3 membership plans");

  // Enquiry stages
  await db.insert(enquiryStages).values([
    { gymId: gym.id, name: "New", sortOrder: 0, isTerminal: false, isWon: false },
    { gymId: gym.id, name: "Contacted", sortOrder: 1, isTerminal: false, isWon: false },
    { gymId: gym.id, name: "Trial", sortOrder: 2, isTerminal: false, isWon: false },
    { gymId: gym.id, name: "Converted", sortOrder: 3, isTerminal: true, isWon: true },
    { gymId: gym.id, name: "Lost", sortOrder: 4, isTerminal: true, isWon: false },
  ]);
  const stages = await db.select().from(enquiryStages).where(eq(enquiryStages.gymId, gym.id));

  // Members with subscriptions
  const sample = [
    { name: "Ananya Sharma", phone: "+919000000001", gender: "female", joinAgo: 40, plan: "Quarterly" },
    { name: "Vikram Nair", phone: "+919000000002", gender: "male", joinAgo: 6, plan: "Monthly" },
    { name: "Priya Iyer", phone: "+919000000003", gender: "female", joinAgo: 320, plan: "Annual" },
    { name: "Arjun Reddy", phone: "+919000000004", gender: "male", joinAgo: 28, plan: "Monthly" },
    { name: "Sana Kapoor", phone: "+919000000005", gender: "female", joinAgo: 80, plan: "Quarterly" },
    { name: "Rahul Desai", phone: "+919000000006", gender: "male", joinAgo: 3, plan: "Monthly" },
    { name: "Meera Joshi", phone: "+919000000007", gender: "female", joinAgo: 200, plan: "Annual" },
    { name: "Karan Malhotra", phone: "+919000000008", gender: "male", joinAgo: 35, plan: "Monthly" },
  ] as const;

  const createdMembers: { id: string }[] = [];
  for (const s of sample) {
    const plan = planByName.get(s.plan)!;
    const start = subDays(new Date(), s.joinAgo);
    const startStr = format(start, "yyyy-MM-dd");
    const end = computeEndDate(startStr, plan.durationMonths);
    const [member] = await db.insert(members).values({
      gymId: gym.id,
      fullName: s.name,
      phone: s.phone,
      gender: s.gender,
      status: "active",
      qrToken: randomToken("ghm"),
      joinDate: startStr,
      heightCm: "170",
      weightKg: "70",
    }).returning();
    await db.insert(memberSubscriptions).values({
      gymId: gym.id,
      memberId: member.id,
      planId: plan.id,
      planName: plan.name,
      startDate: startStr,
      endDate: format(end, "yyyy-MM-dd"),
      pricePaise: plan.pricePaise,
      status: "active",
    });
    createdMembers.push({ id: member.id });
  }
  console.log(`  ✓ ${sample.length} members`);

  // Attendance over the last 12 days for the first 5 members
  const attRows: (typeof attendance.$inferInsert)[] = [];
  for (let d = 1; d <= 12; d++) {
    for (const m of createdMembers.slice(0, 5)) {
      if ((d + m.id.charCodeAt(0)) % 3 !== 0) {
        attRows.push({ gymId: gym.id, personType: "member", memberId: m.id, method: "manual", checkInAt: subDays(new Date(), d) });
      }
    }
  }
  if (attRows.length) await db.insert(attendance).values(attRows);
  console.log(`  ✓ ${attRows.length} attendance check-ins`);

  // Leads across stages
  const leadData = [
    { name: "Neha Gupta", phone: "+919111100001", interest: "Weight loss", source: "website", stage: "New" },
    { name: "Sameer Khan", phone: "+919111100002", interest: "Strength", source: "walk_in", stage: "Contacted" },
    { name: "Divya Menon", phone: "+919111100003", interest: "Yoga", source: "referral", stage: "Trial" },
    { name: "Aditya Rao", phone: "+919111100004", interest: "PT", source: "phone", stage: "New" },
  ] as const;
  for (const l of leadData) {
    const stage = stages.find((s) => s.name === l.stage) ?? stages[0];
    await db.insert(enquiries).values({
      gymId: gym.id,
      name: l.name,
      phone: l.phone,
      interest: l.interest,
      source: l.source,
      stageId: stage.id,
    });
  }
  console.log(`  ✓ ${leadData.length} enquiries`);

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
