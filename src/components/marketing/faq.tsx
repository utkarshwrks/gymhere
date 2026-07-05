"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. Every plan starts with a 14-day free trial and no card required for the demo. You only add payment details when you decide to continue.",
  },
  {
    q: "Can members check in without staff at the desk?",
    a: "Yes. Each member gets a personal QR code in their portal. They scan at your front-desk scanner, or you punch them in manually — both update attendance instantly.",
  },
  {
    q: "Does GymHere handle payments and dues?",
    a: "Invoices, part-payments, a running dues ledger and printable receipts are built in. Online collection runs on Razorpay; cash and UPI are recorded too.",
  },
  {
    q: "Is my gym's data separated from other gyms?",
    a: "Completely. GymHere is multi-tenant with strict per-gym isolation — every record is scoped to your gym and never visible to another tenant.",
  },
  {
    q: "Can other apps pull our data?",
    a: "On the Pro plan you get metered REST API access with your own keys, so corporate-wellness apps and aggregators can integrate your gym safely.",
  },
];

export function Faq() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="bg-white/[0.02]">
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="font-medium text-brand-offwhite">{item.q}</span>
              <Plus
                className={cn(
                  "size-4 shrink-0 text-primary transition-transform duration-200",
                  isOpen && "rotate-45",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
