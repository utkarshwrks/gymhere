# GymHere

Multi-tenant gym management SaaS — super-admin panel, gym-owner admin, member portal, public gym microsites, payments, and a sellable public API. Demo-ready on free tiers; production-ready by swapping environment keys.

Built to the spec in [`BUILD-PLAN.md`](./BUILD-PLAN.md).

## Stack

Next.js 15 (App Router, TS strict) · Tailwind CSS v4 · shadcn-style UI · Drizzle ORM + Neon Postgres · Clerk auth · Razorpay · UploadThing · Resend · Upstash Redis · Framer Motion · Recharts · Zod.

## Phase progress

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: auth, tenancy, design system, marketing site, onboarding | ✅ Done |
| 2 | Gym admin core: dashboard, members, plans, CRM, attendance | ✅ Done |
| 3 | Money & ops: billing, Razorpay, POS, payroll, classes, comms, reports | ⏳ Planned |
| 4 | Super admin, member portal, public microsites | ⏳ Planned |
| 5 | Public API, security hardening, demo seed, deploy | ⏳ Planned |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill with your keys (all optional in demo mode)
npm run dev                  # http://localhost:3000
```

The app runs in **demo mode** with no keys set: marketing, pricing and the onboarding UI render, and protected areas redirect to sign-in. Add keys to activate each service.

### Database (when DATABASE_URL is set)

```bash
npm run db:generate   # generate SQL from the Drizzle schema
npm run db:push       # apply schema to Neon (or db:migrate for migration files)
npm run seed          # seed super admin + 3 platform plans + 1 demo gym
```

## Demo → production (key swap, no code changes)

Every external service reads from env vars. Production is a key swap plus `APP_MODE=production` and `RAZORPAY_MODE=live`.

| Var | Demo | Production |
| --- | --- | --- |
| `DATABASE_URL` | Neon dev branch | Neon prod branch |
| `CLERK_SECRET_KEY` | `sk_test_…` | `sk_live_…` |
| `RAZORPAY_KEY_ID` | `rzp_test_…` | `rzp_live_…` |
| `RAZORPAY_WEBHOOK_SECRET` | `whsec_test` | `whsec_live` |
| `RESEND_API_KEY` | `re_test_…` | `re_live_…` |
| `APP_MODE` | `demo` | `production` |

## Project structure

```
src/
  app/
    (marketing)/        landing, pricing (from DB), contact, developers
    (auth)/             sign-in, sign-up (Clerk)
    onboarding/         3-step gym setup wizard → 14-day trial
    app/                gym owner/staff area (dashboard)
    sa/                 super admin area
    me/                 member portal
    api/                clerk webhook, uploadthing
  components/
    ui/                 shadcn-style primitives
    shared/             AppShell, StatCard, DataTable, PageHeader, ConfirmDialog…
    marketing/ onboarding/
  lib/
    db/                 Drizzle schema, client, withGym() tenancy guard, seed
    auth/               session + gym context + role helpers
    env.ts features.ts plans.ts format.ts
```

## Conventions

TS strict, no `any`. Mutations via server actions with Zod schemas. Every gym-scoped query goes through `withGym()`. Money stored as integer paise, rendered with `Intl.NumberFormat('en-IN')`. Dates in UTC via date-fns.
