# GymHere — What happens, why, and how

A plain-English tour of the platform: what it does, the reasoning behind each part,
and how it actually works under the hood. For running it locally see
[`SETUP.md`](./SETUP.md); for the build spec see [`BUILD-PLAN.md`](./BUILD-PLAN.md).

---

## What GymHere is

GymHere is a **multi-tenant SaaS** for gyms and fitness studios. One deployment serves
many independent gyms ("tenants"), each with its own members, money, staff and public
page — fully isolated from every other gym.

It makes money three ways:
1. **SaaS subscriptions** — gyms pay GymHere (Starter / Growth / Pro, 14-day trial).
2. **Gym revenue tools** — each gym sells its own membership plans, collects payments,
   runs a supplement store, and gets a public website.
3. **API product** — GymHere sells metered REST API access so other apps can integrate
   gyms' data.

---

## Who uses it (roles & entry points)

| Role | What they do | Enters at |
| --- | --- | --- |
| **Super Admin** | Runs the platform: tenants, tiers, integrations, revenue | `/sa` |
| **Gym Owner** | Runs one gym end-to-end | `/app` |
| **Staff / Trainer** | Restricted gym access | `/app` |
| **Member** | Their plan, QR check-in, payments, classes, workouts | `/me` |
| **Public visitor** | Marketing site, pricing, a gym's microsite, developer docs | `/` |

---

## What happens on the platform (the journeys)

Each journey below is described as **what** happens, **why** it exists, and **how** it works.

### 1. A gym signs up and starts a trial
- **What:** A visitor signs up, completes a 3-step onboarding wizard (gym details + logo
  → business settings → pick a tier), and lands on an empty dashboard with a 14-day trial.
- **Why:** Zero-friction, no-card trials are how B2B SaaS converts; the gym should be
  usable in minutes.
- **How:** Clerk handles auth; a server action creates the `gyms`, `gym_settings` and a
  `gym_subscriptions` row with `status='trialing'`, `trial_ends_at = now()+14d`. When the
  trial ends, the app walls the gym to a plan-picker until they subscribe.

### 2. Running the gym day to day
- **What:** Members (add wizard, CSV import, profiles, renew/freeze/cancel), membership
  plans, an **enquiry CRM** (drag-and-drop kanban → convert lead to member), attendance
  (search + one-tap check-in, QR, biometric devices, a live wall board), classes &
  timetable with capacity-limited booking, staff & payroll, workout/diet builders,
  broadcasts, and reports.
- **Why:** This is the daily back-office a gym otherwise runs on spreadsheets and 3
  disconnected apps — consolidating it is the core value.
- **How:** Every screen is a Next.js server component reading gym-scoped data; every
  change is a **Zod-validated server action**. Membership status is derived from the
  member's current subscription (active/expiring/expired/frozen). Retention flags
  irregular members via a nightly cron.

### 3. Money in and money out
- **What:** Invoices with tax/discount and part-payments, a running **dues ledger**,
  printable/PDF receipts; a supplement-store **POS** (purchases raise stock + payables,
  sales lower stock, partial pay → dues); expenses; **payroll** salary runs. Everything
  flows through one **cash book** so the day book reconciles.
- **Why:** A gym's finances must be a single, auditable source of truth — collections,
  POS, expenses and payroll in one ledger, in ₹.
- **How:** Money is stored as **integer paise** (never floats). A single
  `cashbook_entries` table records every rupee in/out. Online collection uses **Razorpay**
  (test mode) with a signature-verified, **idempotent** webhook.

### 4. Members serve themselves
- **What:** A member portal with a plan card, a **personal QR** for front-desk check-in,
  payment history + pay-your-dues online, class booking, and workout/diet viewers.
- **Why:** Self-service reduces front-desk load and keeps members engaged.
- **How:** A gym "invites" a member (links a member-role login by email). The member's QR
  encodes a stable `qr_token`; the gym scanner (html5-qrcode) checks them in; the live
  board reflects it, colour-coded by membership status + dues.

### 5. The public microsite feeds the funnel
- **What:** Each gym gets a public page at `/g/[slug]` — hero, gallery, amenities, plans,
  trainers, reviews, map, and an enquiry form. Submissions drop into that gym's CRM as a
  "website" lead.
- **Why:** Lead generation is part of the product; the microsite closes the loop from
  visitor → CRM → member.
- **How:** Rendered with ISR (cached, revalidated). The enquiry form calls a public server
  action that creates a CRM lead tagged `website`. SEO/OG metadata is generated per gym.

### 6. The platform owner stays in control
- **What:** A super-admin panel: platform dashboard + trial funnel, a tenants table
  (activate / **suspend** / **impersonate**), a live SaaS **tier editor**
  (price/caps/feature-flags), platform announcements, and **integration policy**.
- **Why:** The business needs levers over every tenant without touching code or redeploying.
- **How:** Suspension flips `gyms.status` and blocks the gym with a notice. Impersonation
  sets a cookie (honoured only for super admins) so support can see a gym as its owner,
  with a banner + exit. Tier edits change `platform_plans.features`, read live by `can()`.

### 7. Developers integrate via the API
- **What:** A metered REST API (`/api/v1`: members, attendance, classes, bookings, plans,
  invoices) with `Bearer ghk_…` keys, scopes, and monthly quotas.
- **Why:** Corporate-wellness apps, aggregators and booking platforms are a third revenue
  stream; a clean, safe API is the product.
- **How:** Keys are **SHA-256 hashed**, scoped, and bound to a gym. Every call is metered
  to `api_usage_logs`; over-quota returns `429` with `X-RateLimit-*` headers. Docs live at
  `/developers`, spec at `/api/v1/openapi.json`.

### 8. Platform-managed vs tenant-managed credentials (Phase 6)
- **What:** The super admin decides, per service (payments/SMS/WhatsApp/email/storage),
  whether all gyms use GymHere's shared keys or each gym connects its own. Tenant-mode
  gyms get an Integrations page to add, **verify**, rotate and delete their keys.
- **Why:** Some gyms want their own payment/messaging accounts (their own settlement,
  branding, compliance); the platform must switch this per-integration without redeploys.
- **How:** A single **credential resolver** is the only code that reads service keys.
  Secrets are **AES-256-GCM encrypted** at rest and never re-displayed. Platform SaaS
  billing always uses platform keys; gym→member payments use resolved keys; tenant gyms
  get their own signed webhook at `/api/webhooks/razorpay/[gymId]`. A custom ESLint rule
  makes any direct key read outside the resolver a build error.

---

## Why it's built this way (key decisions)

- **Shared-schema multi-tenancy.** Every gym-scoped row carries `gym_id` and every query
  filters by it through a `withGym()` helper — simpler and cheaper than a DB-per-tenant,
  with isolation enforced in the data layer (audited by `npm run test:isolation`).
- **Demo today, production by key-swap.** Every external service reads from env vars only;
  the demo runs on free/test keys, production is the same code with live keys +
  `APP_MODE=production`. No code changes to go live.
- **Just-in-time auth provisioning.** A Clerk sign-in auto-creates/claims the matching
  `users` row, so local dev needs no webhook/tunnel; claim-by-email is restricted to
  placeholder rows to prevent account takeover.
- **Money as integer paise + one ledger.** Avoids float errors and gives a single
  reconcilable cash book.
- **One credential resolver.** Centralising every service-key read makes the platform ↔
  tenant switch, encryption, and audit trivial — and lint-enforceable.
- **Server actions + Zod everywhere.** Mutations are typed, validated, and
  role/tenancy-checked at the boundary (`requireGym` / `requireMember` / super-admin
  guards), not trusted from the client.

---

## How it works (architecture at a glance)

- **Framework:** Next.js 15 (App Router, TS strict, Server Components) on Vercel.
- **Database:** Neon Postgres + Drizzle ORM (62 tables, migrations under `drizzle/`).
- **Auth:** Clerk (custom tenancy in DB; roles: super_admin | gym_owner | staff | trainer | member).
- **Payments:** Razorpay (test/live by env) — invoice checkout + platform subscription
  checkout, one idempotent webhook per scope.
- **Email/SMS/WhatsApp:** Resend for real email; SMS/WhatsApp behind a `MessageProvider`
  interface with a demo provider that logs to an in-app Outbox.
- **Storage:** UploadThing (logos, member/gym photos).
- **Jobs:** Vercel Cron (retention flags, renewal/dues/birthday reminders).
- **UI:** Tailwind v4, shadcn-style components, Framer Motion, Recharts.
- **Security:** security headers (CSP/HSTS/etc.), RBAC guards on every action,
  AES-256-GCM for tenant secrets, hashed API keys, signature-verified webhooks, and a
  lint rule keeping service keys inside the resolver.

**Request flow (typical):** browser → Next.js route (server component reads gym-scoped
data) → renders. A change → client calls a **server action** → `requireGym()` proves
tenancy+role → Zod validates → Drizzle writes (scoped by `gym_id`) → activity log →
`revalidatePath`. External money/messages go through adapters that receive their
credentials from the **resolver**, never from env directly.

---

## Data model (grouped)

- **tenancy:** gyms, gym_settings, platform_plans, gym_subscriptions
- **people:** users, members, member_weight_logs, staff_profiles, trainers, batches, holidays
- **sales:** membership_plans, plan_addons, member_subscriptions, enquiries, enquiry_followups, enquiry_stages
- **money:** invoices, invoice_items, payments, expenses, expense_types, cashbook_entries
- **pos:** products, product_brands, vendors, purchases, purchase_items, pos_sales, pos_sale_items, stock_ledger, vendor_payments
- **payroll:** staff_attendance, salary_structures, salary_runs, staff_payments
- **ops:** attendance, attendance_devices, classes, class_schedules, class_bookings, appointments, session_packs, workout_plans, workout_exercises, diet_plans, diet_meals
- **comms:** message_templates, notifications, outbox, contact_groups, contact_group_members
- **social/microsite:** member_reviews, gym_photos, gym_amenities
- **api:** api_keys, api_usage_logs, api_plans
- **integrations (Phase 6):** integration_policies, tenant_credentials
- **platform/audit:** announcements, activity_logs
