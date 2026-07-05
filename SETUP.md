# GymHere — Local Setup & Run Guide

A step-by-step guide to run the whole app on your machine and reach the **Gym Admin
panel**, the **Super Admin panel**, the **Member portal**, the **public REST API**,
and the **integration credential controls**.

---

## 0. Prerequisites

- **Node.js 20+** (Node 22 works) and **npm** — check: `node -v && npm -v`
- **Git**
- Two free accounts (no card): **Neon** (Postgres) and **Clerk** (auth)

The app runs in **demo mode with no keys** (marketing pages only). To use the admin
panels you need a database + auth, so complete steps 2–5.

---

## 1. Get the code & install

```bash
git clone https://github.com/utkarshwrks/gymhere.git
cd gymhere
npm install
```

(If you already have it at `D:\demo\gym`, just `cd` there and `npm install`.)

---

## 2. Create the environment file

```bash
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
```

Open `.env.local` and fill it as described in the next steps.

---

## 3. Database — Neon (required)

1. Go to **https://neon.tech** → sign up → **Create project**.
2. Copy the **connection string** (looks like
   `postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require`).
3. In `.env.local`:
   ```env
   DATABASE_URL=postgresql://...your neon string...
   ```

---

## 4. Auth — Clerk (required)

1. Go to **https://clerk.com** → **Create application** (enable Email + Google).
2. On **API keys**, copy the **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`).
3. In `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
> No Clerk **webhook** is needed for local dev — the app auto-provisions your user
> on first sign-in (just-in-time). You only add the webhook in production.

---

## 5. Pick which email lands in which panel

You sign in with a normal email, and the app maps it to a role. Because **one email =
one role**, use **Gmail "+aliases"** (all land in the same inbox, but Clerk treats
them as different accounts). In `.env.local`:

```env
DEMO_ADMIN_EMAIL=youremail+admin@gmail.com     # -> Super Admin (/sa)
DEMO_OWNER_EMAIL=youremail+owner@gmail.com      # -> Gym Owner of the seeded demo gym (/app)
```

Optional but recommended (Phase 6 credential encryption). Generate a 32-byte key:

```bash
# any one of these:
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
CREDENTIALS_ENCRYPTION_KEY=paste_the_64_hex_chars_here
APP_MODE=demo
```

---

## 6. Create tables + seed demo data

```bash
npm run db:push        # creates all tables in your Neon DB
npm run seed:demo      # 2 gyms, ~45 members, 6mo history, POS, payroll, an API key
```

The seed prints the demo credentials and an API key at the end — **copy the API key**,
you'll need it in step 9.

---

## 7. Run it

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## 8. Reach each panel (sign up with the matching email)

Go to **/sign-up** and register with the email for the role you want. The first
sign-in "claims" the seeded account automatically.

| Panel | URL | Sign up with |
| --- | --- | --- |
| **Super Admin** | `/sa` | `DEMO_ADMIN_EMAIL` (e.g. `you+admin@gmail.com`) |
| **Gym Admin** (seeded demo gym, full data) | `/app` | `DEMO_OWNER_EMAIL` (e.g. `you+owner@gmail.com`) |
| **Gym Admin** (fresh, runs the onboarding wizard) | `/app` | any **new** email |
| **Member portal** | `/me` | see below |

**To get into the Member portal:** open the gym as its owner → **Members** → open any
member → **Invite to portal** → then sign up with that member's email.

**What to check:**
- **Super Admin (`/sa`)**: platform dashboard + trial funnel → **Gyms** (suspend /
  reactivate / **impersonate**) → **SaaS tiers** (edit price/caps/feature flags) →
  **Integrations** (step 10) → **Announcements**.
- **Gym Admin (`/app`)**: Dashboard (live stats/charts) → Members (add/CSV/profile) →
  Plans → Enquiries (drag the kanban) → Attendance (check-in) → Billing → Store →
  Classes → Staff → Payroll → Workouts → Messages → Reports → Reviews → Settings.

---

## 9. Check the public API

The API needs a gym on a plan with **API access** (the seeded **Flow Yoga Studio** is
on Pro and has a seeded key; or create one at **`/app/settings/api`**).

```bash
# list members (replace with your key from step 6 or /app/settings/api)
curl http://localhost:3000/api/v1/members -H "Authorization: Bearer ghk_your_key"

# no key -> 401
curl -i http://localhost:3000/api/v1/members

# OpenAPI spec (import into Postman)
curl http://localhost:3000/api/v1/openapi.json
```

Docs live at **http://localhost:3000/developers**. Endpoints: `members`, `attendance`,
`classes`, `bookings`, `plans`, `invoices`. Responses carry `X-RateLimit-*` headers.

**Manage keys** at `/app/settings/api` (Pro plan): create (shown once), rotate, revoke,
and see monthly usage.

---

## 10. Integration credentials (platform vs tenant)

This is the Phase 6 control: decide whether gyms use **GymHere's shared keys** or
**their own**.

1. As **Super Admin** → `/sa/integrations` → flip **Payments** to **Tenant-managed**
   (turn off "Allow platform fallback" to force each gym to bring its own).
2. As **Gym Owner** → `/app/settings/integrations` → the **Payments (Razorpay)** card
   now appears → enter Razorpay **test** keys → **Save** → **Test connection** →
   badge turns **Verified**. Member payments for that gym now use its own key.
3. Back in `/sa/integrations` you'll see the gym under "using their own", and you can
   **Force revert** it to platform keys instantly.

> The seeded **IronWorks Fitness** gym is pre-set to tenant mode with dummy
> *unverified* keys so you can see the flow immediately.

**Optional — real online payments (Razorpay test mode):** add to `.env.local`:
```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=whsec_test
```
Then "Collect online" / "Pay now" buttons open Razorpay Checkout. Webhook URL for
platform events: `/api/webhooks/razorpay`; for a tenant gym: `/api/webhooks/razorpay/<gymId>`.

**Optional — real email (Resend):** `RESEND_API_KEY=re_...` enables real reminders;
without it, messages are logged to the in-app Outbox.

---

## 11. Handy commands & checks

```bash
npm run dev              # start dev server
npm run build            # production build (type-check + lint)
npm run db:studio        # browse the DB (Drizzle Studio)
npm run seed:demo        # (re)seed rich demo data
npm run test:isolation   # verify cross-gym data isolation (needs 2 seeded gyms)
```

---

## 12. Troubleshooting

- **`/app` or `/sa` just redirects to sign-in** → you're not signed in, or no
  `DATABASE_URL`. Add the DB, `db:push`, `seed:demo`, then sign up.
- **Signed up but landed in the wrong panel** → the email→role mapping is by exact
  email; use the `+alias` emails from step 5 and re-seed if you changed them.
- **Can't verify `admin@gymhere.app`** → don't use it; set `DEMO_ADMIN_EMAIL` to an
  email you actually own and sign up with that.
- **API returns 401** → missing/typo'd `Authorization: Bearer ghk_...`, or the key was
  revoked, or the gym isn't on a plan with API access.
- **"Nothing to set up" on `/app/settings/integrations`** → no service is in tenant
  mode yet; flip one in `/sa/integrations` first.

---

## 13. Production notes (later)

Deploy on **Vercel**, set the same env vars with **live** keys, `APP_MODE=production`,
`RAZORPAY_MODE=live`, a **required** `CREDENTIALS_ENCRYPTION_KEY`, a Neon prod branch,
and register the Razorpay + Clerk webhooks. See the "Deploy" section in `README.md`.
