import "dotenv/config";
import { addDays } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { gymSettings, gymSubscriptions, gyms, platformPlans, users } from "./schema";
import { slugify } from "@/lib/slug";

/**
 * Seed v1 (Phase 1): super admin, 3 platform plans, 1 demo gym on a trial.
 * Idempotent — safe to re-run. Prices are integer paise.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed. Set it in .env.local.");
  }
  console.log("Seeding GymHere…");

  // --- Platform plans (Starter / Growth / Pro) ---
  const planRows = [
    {
      key: "starter",
      name: "Starter",
      pricePaise: 99_900,
      memberCap: 100,
      sortOrder: 1,
      description: "For a single studio finding its feet.",
      features: {
        classes: true,
        microsite: true,
        reports_advanced: false,
        api_access: false,
        whatsapp: false,
        pos: false,
        payroll: false,
      },
    },
    {
      key: "growth",
      name: "Growth",
      pricePaise: 249_900,
      memberCap: 500,
      sortOrder: 2,
      description: "For a busy gym scaling members and staff.",
      features: {
        classes: true,
        microsite: true,
        reports_advanced: true,
        api_access: false,
        whatsapp: true,
        pos: true,
        payroll: true,
      },
    },
    {
      key: "pro",
      name: "Pro",
      pricePaise: 499_900,
      memberCap: null,
      sortOrder: 3,
      description: "Unlimited members, API access and every module.",
      features: {
        classes: true,
        microsite: true,
        reports_advanced: true,
        api_access: true,
        whatsapp: true,
        pos: true,
        payroll: true,
      },
    },
  ];

  for (const p of planRows) {
    const existing = await db.query.platformPlans.findFirst({
      where: eq(platformPlans.key, p.key),
    });
    if (existing) {
      await db.update(platformPlans).set(p).where(eq(platformPlans.key, p.key));
    } else {
      await db.insert(platformPlans).values(p);
    }
  }
  console.log("  ✓ 3 platform plans");

  // --- Super admin ---
  const superEmail = "admin@gymhere.app";
  let superAdmin = await db.query.users.findFirst({
    where: eq(users.email, superEmail),
  });
  if (!superAdmin) {
    [superAdmin] = await db
      .insert(users)
      .values({
        clerkId: "seed_super_admin",
        email: superEmail,
        name: "Platform Admin",
        role: "super_admin",
      })
      .returning();
  }
  console.log("  ✓ super admin (admin@gymhere.app)");

  // --- Demo gym on trial ---
  const growth = await db.query.platformPlans.findFirst({
    where: eq(platformPlans.key, "growth"),
  });
  const gymName = "IronWorks Fitness";
  const slug = slugify(gymName);
  let gym = await db.query.gyms.findFirst({ where: eq(gyms.slug, slug) });

  if (!gym) {
    const ownerEmail = "owner@ironworks.demo";
    let owner = await db.query.users.findFirst({ where: eq(users.email, ownerEmail) });
    if (!owner) {
      [owner] = await db
        .insert(users)
        .values({
          clerkId: "seed_owner_ironworks",
          email: ownerEmail,
          name: "Rohan Mehta",
          role: "gym_owner",
        })
        .returning();
    }

    [gym] = await db
      .insert(gyms)
      .values({ slug, name: gymName, ownerUserId: owner.id, status: "active" })
      .returning();

    await db.update(users).set({ gymId: gym.id }).where(eq(users.id, owner.id));

    await db.insert(gymSettings).values({
      gymId: gym.id,
      currency: "INR",
      timezone: "Asia/Kolkata",
      city: "Pune",
      phone: "+91 98220 00000",
      email: ownerEmail,
    });

    await db.insert(gymSubscriptions).values({
      gymId: gym.id,
      planId: growth!.id,
      status: "trialing",
      trialEndsAt: addDays(new Date(), 14),
    });
    console.log(`  ✓ demo gym "${gymName}" (trialing, 14 days)`);
  } else {
    console.log(`  • demo gym "${gymName}" already exists`);
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
