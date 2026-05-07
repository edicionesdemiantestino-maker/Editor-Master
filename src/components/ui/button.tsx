"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "ghost" | "outline";
type Size = "default" | "lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "href"> & {
  /** When set, renders a Next.js `Link` styled as the button (for landing CTAs). */
  href?: string;
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
};

const variantClass: Record<Variant, string> = {
  default:
    "bg-white text-zinc-950 shadow-lg shadow-black/25 hover:bg-zinc-100 border border-transparent",
  ghost:
    "bg-transparent text-white border border-transparent hover:bg-white/10",
  outline:
    "bg-transparent text-white border border-white/25 hover:bg-white/10 backdrop-blur-sm",
};

const sizeClass: Record<Size, string> = {
  default: "rounded-xl px-4 py-2 text-sm font-semibold",
  lg: "rounded-xl px-6 py-3 text-base font-semibold",
};

export function Button({
  variant = "default",
  size = "default",
  href,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const merged = [
    "inline-flex items-center justify-center gap-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:pointer-events-none disabled:opacity-50",
    variantClass[variant],
    sizeClass[size],
    className,
  ].join(" ");

  if (href) {
    return (
      <Link href={href} className={merged}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={merged} {...rest}>
      {children}
    </button>
  );
}
