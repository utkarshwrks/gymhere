"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LogoField({
  value,
  onChange,
  uploadEnabled,
}: {
  value: string;
  onChange: (url: string) => void;
  uploadEnabled: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing("gymLogo", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.serverData?.url ?? res?.[0]?.ufsUrl;
      if (url) onChange(url);
      toast.success("Logo uploaded");
    },
    onUploadError: () => {
      toast.error("Upload failed. Try a smaller image.");
    },
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
        {value ? (
          <>
            <Image src={value} alt="Gym logo" fill className="object-cover" sizes="64px" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-background/80"
              aria-label="Remove logo"
            >
              <X className="size-3" />
            </button>
          </>
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        {uploadEnabled ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) startUpload([file]);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Upload logo"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">PNG or JPG, up to 2 MB.</p>
          </>
        ) : (
          <>
            <Input
              placeholder="Paste a logo image URL"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Add UploadThing keys to enable direct upload.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
