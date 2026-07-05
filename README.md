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
| 3 | Money & ops: billing, Razorpay, POS, payroll, classes, comms, reports | ✅ Done |
| 4 | Super admin, member portal, public microsites | ✅ Done |
| 5 | Public API, security hardening, demo seed, deploy | ✅ Done |

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
npm run seed          # minimal seed: super admin + 3 plans + 1 demo gym
npm run seed:demo     # rich demo: 2 gyms, ~45 members, 6mo history, POS, payroll, API key, reviews
npm run test:isolation # tenant-isolation audit (cross-gym reads/writes must be denied)
```

Set `DEMO_OWNER_EMAIL` / `DEMO_ADMIN_EMAIL` to your own email before seeding, then sign up with it to claim that role.

## Public API

Metered REST API under `/api/v1` (members, attendance, classes, bookings, plans, invoices). Authenticate with `Authorization: Bearer ghk_…`. Keys are created at **Settings → API** (Pro plan), hashed (SHA-256), scoped, and monthly-quota limited (`X-RateLimit-*` headers). Docs at `/developers`; spec at `/api/v1/openapi.json` (import into Postman).

```bash
curl https://<your-app>/api/v1/members -H "Authorization: Bearer ghk_..."
```

## Security

Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) are set in `next.config.ts`. Every gym-scoped query goes through `withGym()`; RBAC is enforced by `requireGym` / `requireMember` / super-admin guards. Run `npm run test:isolation` to verify cross-tenant access is denied. All user content is rendered through React (auto-escaped); no server-only secret is exposed to the client (only `NEXT_PUBLIC_*`).

## Deploy (Vercel)

1. Push this repo to GitHub and import it in Vercel.
2. Add env vars (from `.env.example`) — swap test keys for live where applicable and set `APP_MODE=production`, `RAZORPAY_MODE=live`.
3. Create a **Neon** production branch → set `DATABASE_URL`; run `npm run db:push` against it, then `npm run seed:demo` (or your real data).
4. Cron jobs in `vercel.json` (`/api/cron/retention`, `/api/cron/reminders`) run automatically on Hobby daily schedules; set `CRON_SECRET` to authorize them.
5. Register the **Razorpay** webhook → `https://<your-app>/api/webhooks/razorpay` (and the Clerk webhook → `/api/webhooks/clerk`).
6. Point your domain; the PWA manifest (`/manifest.webmanifest`) makes it installable.

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
