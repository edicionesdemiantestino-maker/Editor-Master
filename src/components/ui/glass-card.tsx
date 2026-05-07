"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  /** Set false inside dense grids for fewer simultaneous animations (UI / perf). */
  animated?: boolean;
};

const shell =
  "relative rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl";

export function GlassCard({ children, className = "", animated = true }: GlassCardProps) {
  const classes = [shell, className].join(" ");

  if (!animated) {
    return <div className={classes}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={classes}
    >
      {children}
    </motion.div>
  );
}
