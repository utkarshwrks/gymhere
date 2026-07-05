"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { verifyAndCapture } from "@/lib/actions/billing";
import type { CheckoutInfo } from "@/lib/actions/billing";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type StartResult = { ok: true; data?: CheckoutInfo } | { ok: false; error: string };

export function RazorpayButton({
  start,
  verify = verifyAndCapture,
  label = "Pay with Razorpay",
  prefill,
  size,
  className,
}: {
  start: () => Promise<StartResult>;
  verify?: (args: { orderId: string; paymentId: string; signature: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  label?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await start();
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "Could not start payment" : res.error);
        return;
      }
      const ok = await loadScript();
      if (!ok) {
        toast.error("Couldn't load Razorpay. Check your connection.");
        return;
      }
      const info = res.data;
      const rzp = new window.Razorpay!({
        key: info.keyId,
        amount: info.amountPaise,
        currency: "INR",
        name: info.name,
        description: info.description,
        order_id: info.orderId,
        prefill,
        theme: { color: "#0b0f0c" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await verify({
            orderId: resp.razorpay_order_id,
            paymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
          });
          if (v.ok) {
            toast.success("Payment successful");
            router.refresh();
          } else {
            toast.error(v.error);
          }
        },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed or was cancelled."));
      rzp.open();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={onClick} disabled={busy} size={size} className={className}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} {label}
    </Button>
  );
}
