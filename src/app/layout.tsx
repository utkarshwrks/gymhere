import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { isConfigured } from "@/lib/env";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "GymHere — Run your gym, not your spreadsheets",
    template: "%s · GymHere",
  },
  description:
    "GymHere is the operating system for modern gyms and studios — members, billing, classes, attendance, CRM and a public microsite, in one place.",
  applicationName: "GymHere",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#0b0f0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers clerkEnabled={isConfigured.clerk}>{children}</Providers>
      </body>
    </html>
  );
}
