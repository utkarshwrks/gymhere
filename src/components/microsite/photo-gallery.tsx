"use client";

import * as React from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function PhotoGallery({ photos }: { photos: { id: string; url: string; caption: string | null }[] }) {
  const [active, setActive] = React.useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <button key={p.id} onClick={() => setActive(p.url)} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
            <Image src={p.url} alt={p.caption ?? "Gym photo"} fill className="object-cover transition-transform duration-200 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
          </button>
        ))}
      </div>
      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-3xl p-2">
          {active && (
            <div className="relative aspect-video w-full">
              <Image src={active} alt="Gym photo" fill className="rounded object-contain" sizes="100vw" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
