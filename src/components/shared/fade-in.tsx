"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

/**
 * Scroll fade-up, fires once. Respects the design directive: 150–250ms ease-out,
 * no parallax/loops. Use around marketing sections and stat rows.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.25, ease: "easeOut", delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
