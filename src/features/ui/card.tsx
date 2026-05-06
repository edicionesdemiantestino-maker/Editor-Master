"use client";

import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: Props) {
  const base = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";
  return <div {...props} className={`${base} ${className}`} />;
}

