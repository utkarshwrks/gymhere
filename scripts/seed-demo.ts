import "./load-env";
import { addMonths, format, subDays, subMonths } from "date-fns";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { encryptJson, maskHint } from "@/lib/crypto";
import {
  apiKeys,
  apiPlans,
  attendance,
  classSchedules,
  classes,
  dietMeals,
  dietPlans,
  enquiryStages,
  enquiries,
  gymSettings,
  gymSubscriptions,
  gyms,
  integrationPolicies,
  invoiceItems,
  invoices,
  memberReviews,
  memberSubscriptions,
  members,
  membershipPlans,
  payments,
  posSaleItems,
  posSales,
  productBrands,
  products,
  salaryRuns,
  salaryStructures,
  sessionPacks,
  staffProfiles,
  tenantCredentials,
  trainers,
  users,
  workoutExercises,
  workoutPlans,
} from "@/lib/db/schema";
import { generateApiKey } from "@/lib/api/keys";
import { computeEndDate } from "@/lib/membership";
import { randomToken, slugify } from "@/lib/slug";

const FIRST = ["Aarav", "Ananya", "Vivaan", "Diya", "Aditya", "Ishaan", "Sara", "Kabir", "Meera", "Reyansh", "Anaya", "Vihaan", "Aadhya", "Arjun", "Myra", "Rohan", "Sana", "Karan", "Priya", "Neha", "Vikram", "Riya", "Dev", "Tara"];
const LAST = ["Sharma", "Verma", "Iyer", "Nair", "Reddy", "Kapoor", "Mehta", "Joshi", "Malhotra", "Desai", "Gupta", "Rao", "Menon", "Khan", "Bose"];

let counter = 0;
const seq = () => ++counter;
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed:demo.");
  console.log("Seeding rich demo…\n");

  // Platform + API plans.
  const platformPlanDefs: { key: string; name: string; pricePaise: number; memberCap: number | null; sortOrder: number; features: Record<string, boolean> }[] = [
    { key: "starter", name: "Starter", pricePaise: 99_900, memberCap: 100, sortOrder: 1, features: { classes: true, microsite: true } },
    { key: "growth", name: "Growth", pricePaise: 249_900, memberCap: 500, sortOrder: 2, features: { classes: true, microsite: true, reports_advanced: true, whatsapp: true, pos: true, payroll: true, byo_credentials: true } },
    { key: "pro", name: "Pro", pricePaise: 499_900, memberCap: null, sortOrder: 3, features: { classes: true, microsite: true, reports_advanced: true, api_access: true, whatsapp: true, pos: true, payroll: true, byo_credentials: true } },
  ];
  const { platformPlans } = await import("@/lib/db/schema");
  for (const p of platformPlanDefs) {
    const ex = await db.query.platformPlans.findFirst({ where: eq(platformPlans.key, p.key) });
    if (ex) await db.update(platformPlans).set(p).where(eq(platformPlans.key, p.key));
    else await db.insert(platformPlans).values(p);
  }
  const growthPlan = await db.query.platformPlans.findFirst({ where: eq(platformPlans.key, "growth") });
  const proPlan = await db.query.platformPlans.findFirst({ where: eq(platformPlans.key, "pro") });

  const apiPlanDefs = [
    { key: "free", name: "Free", monthlyQuota: 1_000, pricePaise: 0 },
    { key: "startup", name: "Startup", monthlyQuota: 50_000, pricePaise: 499_900 },
    { key: "scale", name: "Scale", monthlyQuota: 1_000_000, pricePaise: 2_499_900 },
  ];
  for (const p of apiPlanDefs) {
    const ex = await db.query.apiPlans.findFirst({ where: eq(apiPlans.key, p.key) });
    if (!ex) await db.insert(apiPlans).values(p);
  }
  const freeApiPlan = await db.query.apiPlans.findFirst({ where: eq(apiPlans.key, "free") });

  // Default integration policies — platform-managed for every service.
  for (const service of ["payments", "sms", "whatsapp", "email", "storage"] as const) {
    const has = await db.query.integrationPolicies.findFirst({ where: and(isNull(integrationPolicies.gymId), eq(integrationPolicies.service, service)) });
    if (!has) await db.insert(integrationPolicies).values({ gymId: null, service, mode: "platform", allowPlatformFallback: true });
  }

  // Super admin. Idempotently ensure this email is a super admin — if a prior
  // run left it as a gym_owner (e.g. via onboarding), restore the role here.
  const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? "admin@gymhere.app";
  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (existingAdmin) {
    if (existingAdmin.role !== "super_admin" || existingAdmin.gymId) {
      await db.update(users).set({ role: "super_admin", gymId: null, updatedAt: new Date() }).where(eq(users.id, existingAdmin.id));
    }
  } else {
    await db.insert(users).values({ clerkId: "seed_super_admin", email: adminEmail, name: "Platform Admin", role: "super_admin" });
  }
  console.log(`  ✓ super admin (${adminEmail})`);

  const gymConfigs = [
    { name: "IronWorks Fitness", city: "Pune", ownerEmail: process.env.DEMO_OWNER_EMAIL ?? "owner@ironworks.demo", ownerName: "Rohan Mehta", plan: growthPlan!, memberCount: 24, pro: false },
    { name: "Flow Yoga Studio", city: "Bengaluru", ownerEmail: "owner@flowyoga.demo", ownerName: "Sana Kapoor", plan: proPlan!, memberCount: 21, pro: true },
  ];

  const creds: string[] = [];

  for (const cfg of gymConfigs) {
    const slug = slugify(cfg.name);
    let gym = await db.query.gyms.findFirst({ where: eq(gyms.slug, slug) });

    if (!gym) {
      let owner = await db.query.users.findFirst({ where: eq(users.email, cfg.ownerEmail) });
      if (!owner) [owner] = await db.insert(users).values({ clerkId: `seed_${slug}`, email: cfg.ownerEmail, name: cfg.ownerName, role: "gym_owner" }).returning();
      [gym] = await db.insert(gyms).values({ slug, name: cfg.name, ownerUserId: owner.id, status: "active" }).returning();
      await db.update(users).set({ gymId: gym.id, role: "gym_owner" }).where(eq(users.id, owner.id));
      await db.insert(gymSettings).values({ gymId: gym.id, city: cfg.city, phone: "+91 98000 00000", email: cfg.ownerEmail, micrositePublished: true, heroTagline: "Train hard. Recover well.", aboutText: `${cfg.name} is ${cfg.city}'s home for serious training.` });
      await db.insert(gymSubscriptions).values({ gymId: gym.id, planId: cfg.plan.id, status: "active", currentPeriodEnd: addMonths(new Date(), 1) });
    }

    if (await db.query.membershipPlans.findFirst({ where: eq(membershipPlans.gymId, gym.id) })) {
      console.log(`  • ${cfg.name} already seeded — skipping`);
      creds.push(`${cfg.name}: ${cfg.ownerEmail}`);
      continue;
    }

    // Plans.
    const planRows = await db.insert(membershipPlans).values([
      { gymId: gym.id, name: "Monthly", durationMonths: 1, pricePaise: 150_000, sessionsPerWeek: 6, features: ["Gym floor", "Locker"], sortOrder: 1 },
      { gymId: gym.id, name: "Quarterly", durationMonths: 3, pricePaise: 400_000, sessionsPerWeek: 6, features: ["Gym floor", "Classes", "Locker"], sortOrder: 2 },
      { gymId: gym.id, name: "Annual", durationMonths: 12, pricePaise: 1_200_000, sessionsPerWeek: 7, features: ["Gym floor", "Classes", "Locker", "PT review"], sortOrder: 3 },
    ]).returning();

    // Stages.
    await db.insert(enquiryStages).values([
      { gymId: gym.id, name: "New", sortOrder: 0 },
      { gymId: gym.id, name: "Contacted", sortOrder: 1 },
      { gymId: gym.id, name: "Trial", sortOrder: 2 },
      { gymId: gym.id, name: "Converted", sortOrder: 3, isTerminal: true, isWon: true },
      { gymId: gym.id, name: "Lost", sortOrder: 4, isTerminal: true },
    ]);
    const stages = await db.select().from(enquiryStages).where(eq(enquiryStages.gymId, gym.id));

    // Members + subscriptions + attendance + invoices/payments.
    const memberIds: string[] = [];
    for (let i = 0; i < cfg.memberCount; i++) {
      const plan = planRows[i % planRows.length];
      const joinAgo = 5 + ((i * 37) % 300);
      const start = subDays(new Date(), joinAgo);
      const startStr = format(start, "yyyy-MM-dd");
      const end = computeEndDate(startStr, plan.durationMonths);
      const name = `${pick(FIRST, i)} ${pick(LAST, i + 3)}`;
      const [m] = await db.insert(members).values({
        gymId: gym.id, fullName: name, phone: `+9190000${String(1000 + seq()).slice(-5)}`,
        email: `${slugify(name)}@example.com`, gender: i % 2 === 0 ? "male" : "female",
        status: "active", qrToken: randomToken("ghm"), joinDate: startStr, heightCm: "172", weightKg: String(60 + (i % 30)),
      }).returning();
      memberIds.push(m.id);
      await db.insert(memberSubscriptions).values({ gymId: gym.id, memberId: m.id, planId: plan.id, planName: plan.name, startDate: startStr, endDate: format(end, "yyyy-MM-dd"), pricePaise: plan.pricePaise, status: "active" });

      // A paid invoice for the joining fee.
      const [inv] = await db.insert(invoices).values({ gymId: gym.id, memberId: m.id, number: `INV-${String(seq()).padStart(4, "0")}`, status: "paid", subtotalPaise: plan.pricePaise, totalPaise: plan.pricePaise, amountPaidPaise: plan.pricePaise, duePaise: 0, issuedOn: startStr }).returning();
      await db.insert(invoiceItems).values({ gymId: gym.id, invoiceId: inv.id, description: `${plan.name} membership`, quantity: 1, unitPricePaise: plan.pricePaise, amountPaise: plan.pricePaise });
      await db.insert(payments).values({ gymId: gym.id, invoiceId: inv.id, memberId: m.id, amountPaise: plan.pricePaise, method: i % 3 === 0 ? "cash" : "upi", status: "captured", createdAt: start });

      // Attendance over the last ~20 days for most members.
      if (i % 4 !== 0) {
        for (let d = 1; d <= 20; d++) {
          if ((d + i) % 3 !== 0) await db.insert(attendance).values({ gymId: gym.id, personType: "member", memberId: m.id, method: "manual", checkInAt: subDays(new Date(), d) });
        }
      }
    }

    // Trainers + classes + schedules.
    const [trainer] = await db.insert(trainers).values({ gymId: gym.id, name: `${pick(FIRST, 5)} ${pick(LAST, 1)}`, specialization: "Strength & conditioning" }).returning();
    const classDefs = ["HIIT", "Yoga Flow", "Spin", "Zumba", "Strength 101", "Pilates"];
    for (let c = 0; c < classDefs.length; c++) {
      const [klass] = await db.insert(classes).values({ gymId: gym.id, name: classDefs[c], trainerId: trainer.id, capacity: 15, durationMins: 60, color: ["#b5f31d", "#8a9a5b", "#c98a1a"][c % 3] }).returning();
      for (let day = 1; day <= 5; day++) {
        await db.insert(classSchedules).values({ gymId: gym.id, classId: klass.id, dayOfWeek: day, startTime: `${String(6 + c).padStart(2, "0")}:00:00` });
      }
    }

    // Leads.
    const leadNames = ["Neha Gupta", "Sameer Khan", "Divya Menon", "Aditya Rao", "Pooja Shah", "Rahul Jain"];
    leadNames.forEach(async (nm, i) => {
      await db.insert(enquiries).values({ gymId: gym.id, name: nm, phone: `+9191111${String(2000 + seq()).slice(-5)}`, interest: pick(["Weight loss", "Strength", "Yoga", "PT"], i), source: pick(["website", "walk_in", "referral", "phone"], i), stageId: stages[i % stages.length].id });
    });

    // Reviews (approved + on microsite).
    for (let i = 0; i < 4; i++) {
      await db.insert(memberReviews).values({ gymId: gym.id, memberId: memberIds[i], authorName: pick(FIRST, i) + " " + pick(LAST, i), rating: 5 - (i % 2), comment: pick(["Best gym in town!", "Great trainers and clean equipment.", "Loved the class variety.", "Helped me hit my goals."], i), status: "approved", showOnMicrosite: true });
    }

    // Session pack + workout/diet templates.
    await db.insert(sessionPacks).values({ gymId: gym.id, memberId: memberIds[0], name: "PT ×12", totalSessions: 12, usedSessions: 3, pricePaise: 800_000 });
    const [wplan] = await db.insert(workoutPlans).values({ gymId: gym.id, name: "Push Pull Legs", memberId: memberIds[0] }).returning();
    await db.insert(workoutExercises).values([
      { gymId: gym.id, planId: wplan.id, dayLabel: "Push", name: "Bench press", sets: 4, reps: "8", restSec: 90, sortOrder: 0 },
      { gymId: gym.id, planId: wplan.id, dayLabel: "Pull", name: "Deadlift", sets: 3, reps: "5", restSec: 120, sortOrder: 1 },
      { gymId: gym.id, planId: wplan.id, dayLabel: "Legs", name: "Squat", sets: 4, reps: "8", restSec: 120, sortOrder: 2 },
    ]);
    const [dplan] = await db.insert(dietPlans).values({ gymId: gym.id, name: "Lean bulk 2400", memberId: memberIds[0] }).returning();
    await db.insert(dietMeals).values([
      { gymId: gym.id, planId: dplan.id, time: "8 AM", items: "Oats, eggs, banana", calories: 550, sortOrder: 0 },
      { gymId: gym.id, planId: dplan.id, time: "1 PM", items: "Rice, chicken, salad", calories: 750, sortOrder: 1 },
      { gymId: gym.id, planId: dplan.id, time: "8 PM", items: "Roti, paneer, veggies", calories: 650, sortOrder: 2 },
    ]);

    // POS: a brand, product, and a sale.
    const [brand] = await db.insert(productBrands).values({ gymId: gym.id, name: "Optimum Nutrition" }).returning();
    const [product] = await db.insert(products).values({ gymId: gym.id, brandId: brand.id, name: "Whey Protein 1kg", sellPricePaise: 250_000, gstPercent: "18", stockQty: 40 }).returning();
    const [sale] = await db.insert(posSales).values({ gymId: gym.id, memberId: memberIds[1], subtotalPaise: 250_000, gstPaise: 45_000, totalPaise: 295_000, paidPaise: 295_000, method: "upi" }).returning();
    await db.insert(posSaleItems).values({ gymId: gym.id, saleId: sale.id, productId: product.id, qty: 1, unitPricePaise: 250_000, gstPercent: "18", amountPaise: 250_000 });

    // Payroll: a staff member with structure + one run.
    const [staffUser] = await db.insert(users).values({ clerkId: `seed_staff_${slug}`, email: `frontdesk@${slug}.demo`, name: "Front Desk", role: "staff", gymId: gym.id }).returning();
    await db.insert(staffProfiles).values({ gymId: gym.id, userId: staffUser.id, designation: "Front desk", permissions: { attendance: true, members: true } });
    await db.insert(salaryStructures).values({ gymId: gym.id, staffUserId: staffUser.id, monthlyBasePaise: 2_600_000, standardDays: 26, ptIncentivePerSessionPaise: 20_000 });
    await db.insert(salaryRuns).values({ gymId: gym.id, staffUserId: staffUser.id, month: format(subMonths(new Date(), 1), "yyyy-MM"), workedDays: 26, perDayPaise: 100_000, basePaise: 2_600_000, bonusPaise: 100_000, ptSessions: 4, ptIncentivePaise: 80_000, advanceDeductionPaise: 0, payablePaise: 2_780_000, status: "finalized" });

    // API key for the Pro gym.
    if (cfg.pro && freeApiPlan) {
      const { raw, hash, prefix } = generateApiKey();
      await db.insert(apiKeys).values({ gymId: gym.id, name: "Demo integration", keyHash: hash, keyPrefix: prefix, scopes: ["read", "write"], apiPlanId: freeApiPlan.id });
      creds.push(`API key (${cfg.name}): ${raw}`);
    }

    // Demo: put IronWorks payments into tenant mode with dummy unverified keys so
    // the whole platform↔tenant credential flow is immediately visible.
    if (cfg.name === "IronWorks Fitness") {
      await db.insert(integrationPolicies).values({ gymId: gym.id, service: "payments", mode: "tenant" });
      await db.insert(tenantCredentials).values({
        gymId: gym.id,
        service: "payments",
        encryptedPayload: encryptJson({ keyId: "rzp_test_DUMMY1234", keySecret: "dummysecret", webhookSecret: "whsec_dummy" }),
        keyHint: maskHint("rzp_test_DUMMY1234"),
        status: "unverified",
      });
    }

    console.log(`  ✓ ${cfg.name}: ${cfg.memberCount} members, classes, POS, payroll, leads, reviews`);
    creds.push(`${cfg.name} owner: ${cfg.ownerEmail}`);
  }

  console.log("\n=== Demo credentials (sign up in Clerk with these emails) ===");
  console.log(`  Super admin: ${adminEmail}`);
  creds.forEach((c) => console.log(`  ${c}`));
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
