import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/shared/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell grid min-h-dvh lg:grid-cols-2">
      {/* Brand rail */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <Brand onDark href="/" />
        <div className="relative max-w-md space-y-4">
          <p className="font-display text-3xl font-semibold leading-tight text-brand-offwhite">
            The floor manages itself when the back office runs on GymHere.
          </p>
          <p className="text-sm text-muted-foreground">
            Members, billing, attendance, classes and your public microsite — one
            login, no spreadsheets.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} GymHere. Built for gyms and studios.
        </p>
      </div>

      {/* Form column */}
      <div className="flex flex-col bg-background">
        <div className="p-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">{children}</div>
      </div>
    </div>
  );
}
