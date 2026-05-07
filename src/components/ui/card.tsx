import type { HTMLAttributes, ReactNode } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = "", ...rest }: DivProps & { children?: ReactNode }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: DivProps & { children?: ReactNode }) {
  return <div className={`border-b border-white/10 px-4 py-3 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-medium tracking-wide text-zinc-400 ${className}`}>{children}</h3>
  );
}

export function CardContent({ children, className = "", ...rest }: DivProps & { children?: ReactNode }) {
  return (
    <div className={`p-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}
