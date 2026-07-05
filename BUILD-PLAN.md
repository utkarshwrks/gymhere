# GymHere — Master Build Plan (v1.1)

A 5-phase build specification for Claude Code. Multi-tenant gym management SaaS with a super-admin panel, gym-owner admin, member portal, public gym microsites, payments, and a sellable public API. Demo-ready on free tiers today; production-ready by swapping environment keys.

## 0. How to use this document

- This file is the markdown twin of `GymHere-Build-Plan.pdf`. Keep it in the repo root.
- Run **one phase at a time**. Each phase ends with a Definition of Done checklist — verify every box, run `npm run build`, fix all type errors, then commit before moving on.
- Never let a session span two phases. Fresh session per phase.
- Kickoff prompt: *Read BUILD-PLAN.md fully. Execute Phase N only. Follow the Design Directive and Engineering Rules strictly. Do not scaffold anything from later phases. When done, self-verify the Definition of Done checklist, run the build, and list what passed.*

## 1. Product overview

Multi-tenant SaaS for gyms/studios. Three revenue streams: **SaaS subscriptions** (Starter/Growth/Pro, 14-day trial), **gym revenue tools** (each gym sells its own plans + gets a microsite), **API product** (metered REST API).

### Roles
| Role | Scope | Entry |
| --- | --- | --- |
| Super Admin | Platform owner; tenants, tiers, API customers, revenue | `/sa` |
| Gym Owner | Full control of one gym (tenant) | `/app` |
| Staff / Trainer | Restricted gym access by permission | `/app` |
| Member | End customer; portal | `/me` |
| Public visitor | Marketing, pricing, `/g/[slug]`, `/developers` | `/` |

### Feature inventory (parity target — original branding/copy/layout only)
Marketing, Onboarding wizard, Dashboard, Members, Membership plans, Enquiries CRM (kanban), Attendance (QR + biometric adapter + wall board), Retention & reviews, Billing (invoices/dues/receipts/expenses/GST), Supplement store POS, Classes, Appointments & PT (session packs), Staff & trainers + payroll, Workout & diet plans, Communications (templates/broadcasts/outbox), Reports (cash book/GST/etc), Public microsite, Member portal, Super admin, Settings.

## 2. Tech stack (demo-ready on free tiers)
- Framework: **Next.js 15** (App Router, TS strict, Server Components) → Vercel Hobby
- Database: **Neon Postgres + Drizzle ORM** (+ drizzle-kit migrations)
- Auth: **Clerk** (orgs OFF — custom tenancy in DB)
- Payments: **Razorpay** (test mode)
- File storage: **UploadThing**
- Email: **Resend** + React Email
- UI: **Tailwind CSS v4 + shadcn/ui + lucide-react + Framer Motion + Recharts**
- Validation: **Zod** everywhere
- Cron: **Vercel Cron**
- Rate limiting: **Upstash Redis**

**Demo → production:** every external service reads from env vars only. Demo runs on test/free keys; production is a key swap plus `RAZORPAY_MODE=live`. No code changes. `APP_MODE=demo|production`.

## 3. Design directive — anti-generic rules
- **Identity:** athletic-utility. Marketing: near-black `#0B0F0C` surfaces, volt-lime `#B5F31D` accent, off-white type. Admin: light `#FAFAF7` bg, ink text `#17191C`, same lime strictly for primary actions & live indicators. One accent color total.
- **Type:** Bricolage Grotesque (display) + Inter (UI/body) via `next/font`. Tabular numerals on all stats/money. Warm grays.
- **Banned:** purple/indigo gradients, glassmorphism, emoji as icons, 3D blob hero art, rounded-3xl everywhere, centered-everything, lorem ipsum, fake 5-star walls.
- **Layout:** 8-pt grid, `max-w-[1440px]` admin shell, collapsible left sidebar, dense-but-breathable tables, sticky action bars on long forms.
- **Motion (Framer):** 150–250 ms ease-out only. Fade-up on scroll (once), staggered stat cards, number count-up, hover lift 2px, skeleton shimmer. No parallax/loops/confetti.
- **Micro:** status = colored dot + label (not pill rainbow); empty-state illustration + CTA on every table; confirm dialog on destructive; toasts (sonner) for mutations; visible focus rings.
- **Responsive:** mobile-first. Sidebar → bottom tab bar `<768px` for `/app` and `/me`. Tables → cards on mobile. Test at 360px. PWA-ready.

## 4. Data model (shared-schema multi-tenancy)
Every gym-scoped table carries `gym_id`; every query filters by it via a `withGym(gymId)` helper — never raw table access from routes.

- tenancy: `gyms, gym_settings, platform_plans, gym_subscriptions`
- people: `users (clerk_id, role, gym_id), members, member_weight_logs, staff_profiles, trainers, batches, holidays`
- sales: `membership_plans, plan_addons, member_subscriptions, enquiries, enquiry_followups, enquiry_stages`
- money: `invoices, invoice_items, payments, expenses, expense_types, cashbook_entries`
- pos: `products, product_brands, vendors, purchases, purchase_items, pos_sales, pos_sale_items, stock_ledger, vendor_payments`
- payroll: `staff_attendance, salary_structures, salary_runs, staff_payments`
- ops: `attendance (in/out), attendance_devices, classes, class_schedules, class_bookings, appointments, session_packs, workout_plans, workout_exercises, diet_plans, diet_meals`
- comms: `message_templates, notifications, outbox, contact_groups, contact_group_members`
- social: `member_reviews`
- microsite: `gym_photos, gym_amenities`
- api: `api_keys, api_usage_logs, api_plans`
- audit: `activity_logs (actor, gym_id, action, entity, meta)`

## PHASE 1 — Foundation: auth, tenancy, design system, marketing site
**Objective:** deployable skeleton; visitor can land → pricing → sign up → gym onboarding → 14-day trial → empty gym dashboard; all four role areas routed and protected.

**Build:** scaffold stack; `src/` structure `app/(marketing)`, `app/(auth)`, `app/sa`, `app/app`, `app/me`, `lib/db`, `lib/auth`, `components/ui`, `components/shared`. Design tokens + `<Brand/>` + light/dark toggle. Primitives: AppShell, StatCard, DataTable, PageHeader, ConfirmDialog, toasts. Drizzle schema tenancy+people + migrations + `withGym`. Roles enum `super_admin | gym_owner | staff | trainer | member`. Clerk wired to `users` via webhook; middleware guards. Marketing (landing/pricing-from-DB/contact). 3-step onboarding wizard → `gym_subscriptions` `status='trialing'`, `trial_ends_at=now()+14d`. `can(gym,'feature')` reading tier limits JSON. Seed v1: super admin, 3 plans (Starter ₹999, Growth ₹2,499, Pro ₹4,999), 1 demo gym.

**Definition of Done:** build passes 0 TS errors + ESLint clean; signup→onboarding→`/app` empty dashboard with trial badge; `/sa` blocks gym owner, `/app` requires auth, `/me` blocks non-members; marketing responsive 360/768/1440 with once-only ≤250ms animations; pricing from DB not hardcoded.

## PHASE 2 — Gym admin core: dashboard, members, plans, CRM, attendance
6 stat cards (count-up), Recharts growth+revenue, renewals/birthdays/activity lists. Members DataTable + Add Member wizard + profile tabs + lifecycle (renew/freeze/cancel) + CSV import/export. Membership plans CRUD + add-ons + tier cap enforcement. Enquiries CRM kanban (dnd-kit, 5 stages) + follow-ups + convert. Attendance check-in + daily log + qr_token + heat strip. Batches & holidays. Retention nightly job (irregular/absent). Weight & progress charts. Tele-calling lists.
**DoD:** plan→member active w/ correct expiry; kanban drag + convert; check-in updates dashboard live; member cap on Starter (100); irregular job correct; tables collapse to cards at 360px.

## PHASE 3 — Money & operations
Invoices (statuses, partial/dues, receipt PDF). Razorpay test — gym→member + platform→gym subscription; one webhook `/api/webhooks/razorpay` (signature verify + idempotent). Expenses. POS (products/brands/vendors/purchases/sales/stock/vendor payments). Payroll (salary run w/ PT incentive + advance). Appointments & PT session packs. Classes timetable + roster. Staff & trainers + permissions. Workout & diet builders. Comms center (templates/segments/outbox, Resend real, Vercel Cron reminders). Reports (revenue/retention/cashbook/GST/collections, CSV).
**DoD:** test card pays invoice→webhook flips paid→receipt PDF; trial-expired gym → billing → tier activates; webhook rejects bad signature + idempotent replay; cron generates reminders+email; timetable 20+ classes; POS stock/dues reconcile; salary run matches hand calc.

## PHASE 4 — Super admin, member portal, public microsites
Super admin `/sa`: platform dashboard, tenants table (activate/suspend/impersonate), tier/feature-flag editor, trial funnel, announcements. Member portal `/me`: plan card, My QR, scanner `/app/attendance/scan` (html5-qrcode), payments/pay-due, class book/cancel, workout/diet viewers, attendance calendar, profile. Member invite flow. Attendance in/out + biometric webhook (ESSL-style) + simulator + live wall board. Member reviews + moderation. Public microsite `/g/[slug]` (SSG+revalidate, gallery/amenities/plans/trainers/hours/map, enquiry→CRM, SEO/OG), microsite editor.
**DoD:** suspend→suspension screen→reactivate; impersonation banner + exit; QR scan→attendance+count; microsite enquiry→CRM website lead; class book/cancel; simulated biometric punch→in/out pair on live board; review shows only after approval + microsite toggle.

## PHASE 5 — API product, security, demo polish, deploy
Public API `/api/v1` (members/attendance/classes/bookings/plans/invoices; Bearer `ghk_...` keys hashed SHA-256 + scopes + gym binding). Metering + Upstash sliding-window limits (Free 1k/Startup 50k/Scale 1M) + `X-RateLimit-*` + usage dashboard. Key management (tier-gated) + super admin key oversight. Developer portal `/developers` + `openapi.json`. Security pass (Zod validate all, RBAC asserts, tenant-isolation script 10/10, rate-limit auth/enquiry, security headers, sanitize HTML, audit coverage, no secrets in client bundle). Demo seed (`seed:demo`: 1 super admin, 2 gyms, 45 members, 6mo history, classes, POS, payroll, leads, reviews, API key) + `/demo` credentials page. Responsive/Lighthouse ≥90 + PWA. Deploy Vercel + Neon prod branch + cron + webhook URL + README runbook.
**DoD:** curl fresh key lists members / revoked→401 / over-limit→429; isolation script 10/10; openapi imports to Postman; 4 roles login from `/demo`; deployed w/ Lighthouse targets + live webhook.

## Appendix — Engineering rules (every phase)
- TypeScript strict; no `any`; server components by default, `use client` only where needed.
- All mutations via server actions with Zod input schemas; typed results; toast on success/error.
- Every gym-scoped query via `withGym()`; direct table access in routes is a review failure.
- Money = integer paise; render `Intl.NumberFormat('en-IN')`; dates via date-fns, store UTC.
- Loading = skeletons; errors = friendly boundary w/ retry; empty states designed.
- Conventional commits; ≥1 commit per completed phase; update README progress table each phase.
- Keep reference feature set only — all copy/branding/layout/visuals original GymHere work.
