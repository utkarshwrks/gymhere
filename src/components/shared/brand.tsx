import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * GymHere logo lockup. The mark is an original geometric "GH" monogram formed
 * from two offset bars (an upward athletic stride), never an emoji or stock art.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      role="img"
      aria-label="GymHere"
    >
      <rect width="32" height="32" rx="7" className="fill-brand-ink" />
      <path d="M8 22V10h3v5.2h5V10h3v12h-3v-4.1h-5V22H8Z" fill="#b5f31d" />
      <rect x="22" y="9" width="2.6" height="14" rx="1.3" fill="#b5f31d" />
    </svg>
  );
}

export function Brand({
  className,
  href = "/",
  compact = false,
  onDark = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight",
        onDark ? "text-brand-offwhite" : "text-foreground",
        className,
      )}
    >
      <BrandMark />
      {!compact && (
        <span>
          Gym<span className="text-brand-lime">Here</span>
        </span>
      )}
    </Link>
  );
}
