"use client";

import * as React from "react";
import { animate, useInView } from "framer-motion";

interface Stat {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
}

const STATS: Stat[] = [
  { label: "Members managed", value: 48000, suffix: "+" },
  { label: "Collections tracked", value: 12, prefix: "₹", suffix: " Cr" },
  { label: "Check-ins / day", value: 9500, suffix: "+" },
  { label: "Uptime", value: 99.9, suffix: "%" },
];

function StatNumber({ stat }: { stat: Stat }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  React.useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const isFloat = !Number.isInteger(stat.value);
    const controls = animate(0, stat.value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate(v) {
        const n = isFloat ? v.toFixed(1) : Math.round(v).toLocaleString("en-IN");
        node.textContent = `${stat.prefix ?? ""}${n}${stat.suffix ?? ""}`;
      },
    });
    return () => controls.stop();
  }, [inView, stat]);

  return (
    <span ref={ref} className="tnum font-display text-2xl font-semibold text-brand-offwhite sm:text-3xl">
      {stat.prefix ?? ""}0{stat.suffix ?? ""}
    </span>
  );
}

export function HeroStats() {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="flex flex-col gap-1">
          <dt className="order-2 text-xs text-muted-foreground">{s.label}</dt>
          <dd className="order-1">
            <StatNumber stat={s} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
