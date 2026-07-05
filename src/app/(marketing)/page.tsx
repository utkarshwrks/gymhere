import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Globe,
  QrCode,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/shared/fade-in";
import { HeroStats } from "@/components/marketing/hero-stats";
import { Faq } from "@/components/marketing/faq";

const features = [
  { icon: Users, title: "Members that manage themselves", body: "Add, renew, freeze and cancel in a click. Auto-BMI, batches, health metrics and a full history on every profile." },
  { icon: CreditCard, title: "Billing without the shoebox", body: "Invoices, part-payments, a running dues ledger and printable receipts. Collect online, cash or UPI — all reconciled." },
  { icon: QrCode, title: "Attendance that just works", body: "Personal member QR, front-desk scanner, biometric-device ready, and a live wall board for the floor." },
  { icon: CalendarDays, title: "Classes & PT, on a grid", body: "A weekly timetable, booking rosters with capacity, recurring schedules and PT session packs that count down." },
  { icon: Wallet, title: "Leads to members", body: "A drag-and-drop enquiry pipeline, follow-up reminders, tele-calling lists and one-click convert to member." },
  { icon: Globe, title: "Your own gym website", body: "A public microsite with photos, plans and an enquiry form that drops straight into your CRM." },
];

const steps = [
  { n: "01", title: "Set up your gym", body: "Name, logo and business settings in a three-step wizard. Your 14-day trial starts instantly — no card." },
  { n: "02", title: "Bring in members & plans", body: "Create membership plans, import members from a CSV, and start collecting payments the same day." },
  { n: "03", title: "Run the floor", body: "Check-ins, classes, follow-ups and reminders run themselves while you focus on training." },
];

const testimonials = [
  { quote: "We closed the register on three different apps. GymHere is the only screen my front desk opens now.", name: "Aditi Rao", role: "Owner, PulseFit Bengaluru" },
  { quote: "Dues collection went up the first month — the reminders just do the chasing for us.", name: "Vikram Nair", role: "Director, Titan Strength" },
  { quote: "Setting up the class timetable took ten minutes. Members book themselves in now.", name: "Sana Kapoor", role: "Founder, Flow Studio" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at top, black, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
          <FadeIn>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Dumbbell className="size-3.5" /> Built for gyms & studios
            </Badge>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-brand-offwhite sm:text-6xl">
              Run your gym,{" "}
              <span className="text-brand-lime">not your spreadsheets.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Members, billing, attendance, classes, CRM and your own website —
              one login for the whole gym. Live in minutes, free for 14 days.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Start free trial <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-brand-offwhite hover:bg-white/10 hover:text-brand-offwhite"
              >
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-16 border-t border-white/10 pt-8">
              <HeroStats />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <FadeIn>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Everything in one place</p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold text-brand-offwhite sm:text-4xl">
              The whole back office, minus the busywork
            </h2>
          </FadeIn>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.05}>
                <div className="group h-full rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/30">
                  <div className="grid size-10 place-items-center rounded-md bg-primary/12 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-brand-offwhite">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <FadeIn>
            <h2 className="max-w-2xl font-display text-3xl font-semibold text-brand-offwhite sm:text-4xl">
              From sign-up to running your floor in a day
            </h2>
          </FadeIn>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <div className="relative">
                  <span className="font-display text-5xl font-bold text-primary/25">{s.n}</span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-brand-offwhite">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <FadeIn>
            <h2 className="font-display text-3xl font-semibold text-brand-offwhite sm:text-4xl">
              Gyms that switched, stayed
            </h2>
          </FadeIn>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.06}>
                <figure className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-6">
                  <blockquote className="text-brand-offwhite">“{t.quote}”</blockquote>
                  <figcaption className="mt-6">
                    <p className="font-medium text-brand-offwhite">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </figcaption>
                </figure>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <FadeIn>
            <h2 className="mb-12 text-center font-display text-3xl font-semibold text-brand-offwhite sm:text-4xl">
              Questions, answered
            </h2>
          </FadeIn>
          <FadeIn delay={0.05}>
            <Faq />
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <FadeIn>
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.06] p-10 text-center sm:p-16">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold text-brand-offwhite sm:text-4xl">
                Give your front desk its evenings back
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                Start free for 14 days. No card, no lock-in — bring your members and go.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link href="/sign-up">
                  Start free trial <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
