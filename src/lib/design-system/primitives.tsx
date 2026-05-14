"use client";

import { useState, type ReactNode } from "react";
import { border, surface, motion, radius, typography } from "./tokens";

// ── Panel ─────────────────────────────────────────────────────
type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ background: surface.base }}
    >
      {children}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────
type SectionProps = {
  children: ReactNode;
  label?: string;
  padded?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  action?: ReactNode;
};

export function Section({
  children,
  label,
  padded = true,
  collapsible = false,
  defaultOpen = true,
  className = "",
  action,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ borderBottom: border.subtle }}
    >
      {label && (
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className="flex items-center justify-between px-3 py-2"
          style={{ cursor: collapsible ? "pointer" : "default" }}
        >
          <span
            style={{
              fontSize: typography.label.sm.size,
              fontWeight: typography.label.sm.weight,
              letterSpacing: typography.label.sm.tracking,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            {label}
          </span>
          <div className="flex items-center gap-2">
            {action}
            {collapsible && (
              <span
                style={{
                  fontSize: "9px",
                  color: "rgba(255,255,255,0.2)",
                  transition: motion.duration.fast,
                  transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                  display: "inline-block",
                }}
              >
                ▾
              </span>
            )}
          </div>
        </button>
      )}
      {(!collapsible || open) && (
        <div className={padded ? "px-3 pb-3" : ""}>{children}</div>
      )}
    </div>
  );
}

// ── ControlRow ────────────────────────────────────────────────
type ControlRowProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function ControlRow({ label, children, hint }: ControlRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex flex-col">
        <span
          style={{
            fontSize: typography.body.xs.size,
            color: "rgba(255,255,255,0.35)",
            lineHeight: "1.3",
          }}
        >
          {label}
        </span>
        {hint && (
          <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}>
            {hint}
          </span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── PremiumSlider ─────────────────────────────────────────────
type PremiumSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  onChange: (v: number) => void;
};

export function PremiumSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  defaultValue,
  onChange,
}: PremiumSliderProps) {
  const isModified =
    defaultValue !== undefined && Math.abs(value - defaultValue) > 0.01;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: typography.body.xs.size,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {isModified && (
            <button
              type="button"
              onClick={() => onChange(defaultValue!)}
              style={{
                fontSize: "9px",
                color: "rgba(99,102,241,0.6)",
                transition: motion.duration.fast,
              }}
              className="hover:opacity-100"
            >
              reset
            </button>
          )}
          <input
            type="number"
            value={Math.round(value * 10) / 10}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="focus:outline-none"
            style={{
              width: "40px",
              textAlign: "right",
              fontSize: typography.value.mono.size,
              fontFamily: typography.value.mono.family,
              color: "rgba(255,255,255,0.5)",
              background: "transparent",
              border: "none",
            }}
          />
          {unit && (
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)" }}>
              {unit}
            </span>
          )}
        </div>
      </div>
      <div
        className="relative h-1 w-full overflow-hidden"
        style={{ borderRadius: radius.full, background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${pct}%`,
            background:
              isModified
                ? "rgba(99,102,241,0.7)"
                : "rgba(255,255,255,0.2)",
            borderRadius: radius.full,
            transition: `width ${motion.duration.fast} ${motion.easing.standard}`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

// ── PremiumButton ─────────────────────────────────────────────
type PremiumButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "soft" | "solid" | "danger";
  size?: "sm" | "md";
  active?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
};

export function PremiumButton({
  children,
  onClick,
  variant = "ghost",
  size = "sm",
  active = false,
  disabled = false,
  title,
  className = "",
}: PremiumButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    borderRadius: radius.md,
    fontSize: size === "sm" ? "11px" : "12px",
    fontWeight: "500",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: motion.duration.fast,
    border: "none",
    outline: "none",
    padding: size === "sm" ? "4px 8px" : "6px 12px",
    height: size === "sm" ? "26px" : "30px",
  };

  const variants: Record<string, React.CSSProperties> = {
    ghost: {
      background: active ? "rgba(255,255,255,0.08)" : "transparent",
      color: active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
    },
    soft: {
      background: active
        ? "rgba(99,102,241,0.15)"
        : "rgba(255,255,255,0.05)",
      color: active ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.4)",
      border: active ? "0.5px solid rgba(99,102,241,0.3)" : border.subtle,
    },
    solid: {
      background: "rgba(99,102,241,0.8)",
      color: "white",
    },
    danger: {
      background: active ? "rgba(239,68,68,0.15)" : "transparent",
      color: "rgba(239,68,68,0.7)",
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`hover:opacity-90 active:scale-95 ${className}`}
      style={{ ...base, ...variants[variant] }}
    >
      {children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────
export function PanelDivider({ label }: { label?: string }) {
  if (label) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="flex-1" style={{ height: "0.5px", background: "rgba(255,255,255,0.05)" }} />
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div className="flex-1" style={{ height: "0.5px", background: "rgba(255,255,255,0.05)" }} />
      </div>
    );
  }
  return (
    <div
      className="mx-3"
      style={{ height: "0.5px", background: "rgba(255,255,255,0.05)", margin: "2px 12px" }}
    />
  );
}

// ── EmptyState ────────────────────────────────────────────────
type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      {icon && (
        <div
          className="flex h-10 w-10 items-center justify-center text-xl"
          style={{
            background: surface.glass,
            border: border.soft,
            borderRadius: radius.xl,
          }}
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p style={{ fontSize: "12px", fontWeight: "500", color: "rgba(255,255,255,0.3)" }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)", lineHeight: "1.5" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}