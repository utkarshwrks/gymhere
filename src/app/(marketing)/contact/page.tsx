import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { FadeIn } from "@/components/shared/fade-in";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the GymHere team about onboarding, pricing or the API.",
};

const details = [
  { icon: Mail, label: "Email", value: "hello@gymhere.app" },
  { icon: Phone, label: "Phone", value: "+91 90000 00000" },
  { icon: MapPin, label: "Office", value: "Pune, Maharashtra, India" },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-2">
        <FadeIn>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Contact</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-brand-offwhite sm:text-5xl">
              Let&apos;s get your gym on GymHere
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Tell us a little about your gym and we&apos;ll help you migrate members,
              plans and history — usually within a day.
            </p>
            <ul className="mt-10 space-y-5">
              {details.map((d) => (
                <li key={d.label} className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-md bg-primary/12 text-primary">
                    <d.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</p>
                    <p className="text-brand-offwhite">{d.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <ContactForm />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
