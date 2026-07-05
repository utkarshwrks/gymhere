"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUploadThing } from "@/lib/uploadthing";
import { addAmenity, addPhoto, deleteAmenity, deletePhoto, updateMicrositeSettings } from "@/lib/actions/microsite";

interface Settings { heroTagline: string; aboutText: string; mapEmbedUrl: string; micrositePublished: boolean }
interface Photo { id: string; url: string; caption: string | null }
interface Amenity { id: string; name: string }

export function MicrositeEditor({
  slug, uploadEnabled, settings, photos, amenities,
}: {
  slug: string;
  uploadEnabled: boolean;
  settings: Settings;
  photos: Photo[];
  amenities: Amenity[];
}) {
  const router = useRouter();
  const [published, setPublished] = React.useState(settings.micrositePublished);
  const [pending, setPending] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [amenity, setAmenity] = React.useState("");

  const { startUpload, isUploading } = useUploadThing("gymPhoto", {
    onClientUploadComplete: async (res) => {
      for (const f of res ?? []) {
        const url = f.serverData?.url ?? f.ufsUrl;
        if (url) await addPhoto(url);
      }
      toast.success("Photo added");
      router.refresh();
    },
    onUploadError: () => {
      toast.error("Upload failed");
    },
  });

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await updateMicrositeSettings({
      heroTagline: String(fd.get("tagline") || ""),
      aboutText: String(fd.get("about") || ""),
      mapEmbedUrl: String(fd.get("map") || ""),
      micrositePublished: published,
    });
    setPending(false);
    if (r.ok) { toast.success("Microsite saved"); router.refresh(); } else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      <Link href="/app/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader title="Public microsite" description="Your gym's public page at /g/{slug}.">
        <Button asChild variant="outline"><Link href={`/g/${slug}`} target="_blank"><ExternalLink className="size-4" /> View</Link></Button>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle>Page content</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveSettings} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div><p className="text-sm font-medium">Publish microsite</p><p className="text-xs text-muted-foreground">When off, /g/{slug} shows as unavailable.</p></div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
            <div className="space-y-1.5"><Label>Hero tagline</Label><Input name="tagline" defaultValue={settings.heroTagline} placeholder="Strength, community, results." /></div>
            <div className="space-y-1.5"><Label>About</Label><Textarea name="about" rows={4} defaultValue={settings.aboutText} placeholder="Tell visitors what makes your gym special…" /></div>
            <div className="space-y-1.5"><Label>Google Maps embed URL</Label><Input name="map" defaultValue={settings.mapEmbedUrl} placeholder="https://www.google.com/maps/embed?..." /></div>
            <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            {uploadEnabled ? (
              <>
                <input id="ms-file" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; if (files.length) startUpload(files); }} />
                <Button type="button" variant="outline" disabled={isUploading} onClick={() => document.getElementById("ms-file")?.click()}>{isUploading ? "Uploading…" : "Upload photos"}</Button>
              </>
            ) : (
              <div className="flex flex-1 gap-2">
                <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Paste image URL" />
                <Button type="button" onClick={async () => { const r = await addPhoto(photoUrl); if (r.ok) { toast.success("Photo added"); setPhotoUrl(""); router.refresh(); } else toast.error(r.error); }}><Plus className="size-4" /></Button>
              </div>
            )}
          </div>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-video overflow-hidden rounded-lg border bg-muted">
                  <Image src={p.url} alt={p.caption ?? "Gym photo"} fill className="object-cover" sizes="200px" />
                  <button onClick={async () => { const r = await deletePhoto(p.id); if (r.ok) { toast.success("Removed"); router.refresh(); } }} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100" aria-label="Delete photo"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await addAmenity(amenity); if (r.ok) { toast.success("Added"); setAmenity(""); router.refresh(); } else toast.error(r.error); }}>
            <Input value={amenity} onChange={(e) => setAmenity(e.target.value)} placeholder="Parking, Showers, Sauna…" className="max-w-xs" />
            <Button type="submit" disabled={!amenity.trim()}><Plus className="size-4" /> Add</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {amenities.length === 0 && <p className="text-sm text-muted-foreground">No amenities yet.</p>}
            {amenities.map((a) => (
              <Badge key={a.id} variant="muted" className="gap-1.5">
                {a.name}
                <button onClick={async () => { const r = await deleteAmenity(a.id); if (r.ok) router.refresh(); }} aria-label="Remove"><Trash2 className="size-3" /></button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
