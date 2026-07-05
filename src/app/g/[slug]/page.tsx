import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Dumbbell, MapPin, Phone, Star } from "lucide-react";
import { getMicrosite } from "@/lib/queries/microsite";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/microsite/photo-gallery";
import { MicrositeEnquiryForm } from "@/components/microsite/enquiry-form";
import { formatMoney } from "@/lib/format";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const site = await getMicrosite(slug);
  if (!site || !site.published) return { title: "Gym" };
  const title = `${site.gym.name}${site.settings.city ? ` · ${site.settings.city}` : ""}`;
  const description = site.settings.heroTagline ?? site.settings.aboutText ?? `Join ${site.gym.name} today.`;
  return {
    title,
    description,
    openGraph: { title, description, images: site.photos[0] ? [{ url: site.photos[0].url }] : undefined },
  };
}

export default async function MicrositePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getMicrosite(slug);
  if (!site) notFound();

  if (!site.published) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">{site.gym.name}</h1>
          <p className="mt-2 text-muted-foreground">This gym&apos;s page isn&apos;t published yet.</p>
        </div>
      </div>
    );
  }

  const { gym, settings, photos, amenities, plans, trainers, reviews } = site;

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="font-display text-lg font-semibold">{gym.name}</span>
          <Button asChild size="sm"><Link href="#enquire">Enquire</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="marketing-shell">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">{settings.city ?? "Your neighbourhood gym"}</Badge>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold text-brand-offwhite sm:text-6xl">{gym.name}</h1>
          {settings.heroTagline && <p className="mt-4 max-w-xl text-lg text-muted-foreground">{settings.heroTagline}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="#plans">See membership plans</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-brand-offwhite hover:bg-white/10 hover:text-brand-offwhite"><Link href="#enquire">Book a visit</Link></Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-16 sm:px-6">
        {settings.aboutText && (
          <section><h2 className="font-display text-2xl font-semibold">About</h2><p className="mt-3 max-w-2xl text-muted-foreground">{settings.aboutText}</p></section>
        )}

        {photos.length > 0 && (
          <section><h2 className="mb-5 font-display text-2xl font-semibold">Gallery</h2><PhotoGallery photos={photos} /></section>
        )}

        {amenities.length > 0 && (
          <section>
            <h2 className="mb-5 font-display text-2xl font-semibold">Amenities</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {amenities.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm"><Check className="size-4 text-primary" /> {a.name}</div>
              ))}
            </div>
          </section>
        )}

        {plans.length > 0 && (
          <section id="plans">
            <h2 className="mb-5 font-display text-2xl font-semibold">Membership plans</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <div key={p.id} className="flex flex-col rounded-xl border bg-card p-6">
                  <p className="font-display text-lg font-semibold">{p.name}</p>
                  <p className="mt-2 tnum font-display text-3xl font-semibold">{formatMoney(p.pricePaise)}<span className="text-sm font-normal text-muted-foreground">/{p.durationMonths}mo</span></p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                    {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="size-4 text-primary" /> {f}</li>)}
                  </ul>
                  <Button asChild className="mt-6"><Link href="#enquire">Enquire</Link></Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {trainers.length > 0 && (
          <section>
            <h2 className="mb-5 font-display text-2xl font-semibold">Trainers</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trainers.map((t) => (
                <div key={t.id} className="rounded-xl border bg-card p-5 text-center">
                  <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/12 text-foreground"><Dumbbell className="size-6" /></div>
                  <p className="mt-3 font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.specialization ?? "Trainer"}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {reviews.length > 0 && (
          <section>
            <h2 className="mb-5 font-display text-2xl font-semibold">What members say</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="rounded-xl border bg-card p-5">
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={i < r.rating ? "size-4 fill-primary text-primary" : "size-4 text-muted-foreground"} />)}</div>
                  {r.comment && <blockquote className="mt-3 text-sm">“{r.comment}”</blockquote>}
                  <figcaption className="mt-3 text-sm font-medium">{r.authorName}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {settings.mapEmbedUrl && (
          <section>
            <h2 className="mb-5 font-display text-2xl font-semibold">Find us</h2>
            <div className="aspect-video overflow-hidden rounded-xl border">
              <iframe src={settings.mapEmbedUrl} className="size-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />
            </div>
          </section>
        )}

        <section id="enquire" className="rounded-2xl border bg-card p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-semibold">Come train with us</h2>
              <p className="mt-2 text-muted-foreground">Leave your details and the team will reach out to set up a visit.</p>
              <div className="mt-6 space-y-2 text-sm">
                {settings.phone && <p className="flex items-center gap-2"><Phone className="size-4 text-primary" /> {settings.phone}</p>}
                {settings.city && <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> {settings.city}</p>}
              </div>
            </div>
            <MicrositeEnquiryForm slug={gym.slug} />
          </div>
        </section>
      </div>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} {gym.name}</span>
          <span className="flex items-center gap-1.5">Powered by <Brand href="/" compact /></span>
        </div>
      </footer>
    </div>
  );
}
