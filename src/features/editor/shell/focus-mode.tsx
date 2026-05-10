"use client";

import { useEffect } from "react";
import { create } from "zustand";

// ── Store de focus mode ───────────────────────────────────────
type FocusModeStore = {
  active: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
};

export const useFocusMode = create<FocusModeStore>((set) => ({
  active: false,
  toggle: () => set((s) => ({ active: !s.active })),
  enable: () => set({ active: true }),
  disable: () => set({ active: false }),
}));

// ── Hook: keyboard shortcut para focus mode ───────────────────
export function useFocusModeShortcut() {
  const { toggle } = useFocusMode();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + . para focus mode
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        toggle();
      }
      // F para fullscreen focus (sin modificador, fuera de inputs)
      if (e.key === "F" && !e.metaKey && !e.ctrlKey) {
        const active = document.activeElement;
        const tag = active?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);
}

// ── Componente: botón de focus mode ──────────────────────────
type FocusModeButtonProps = {
  className?: string;
};

export function FocusModeButton({ className }: FocusModeButtonProps) {
  const { active, toggle } = useFocusMode();

  return (
    <button
      type="button"
      onClick={toggle}
      title={active ? "Salir del modo foco (⌘.)" : "Modo foco (⌘.)"}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-medium transition ${
        active
          ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
          : "border-white/8 bg-white/5 text-zinc-500 hover:border-white/15 hover:text-zinc-300"
      } ${className ?? ""}`}
    >
      {active ? (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1"/>
            <rect x="6" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1"/>
            <rect x="1" y="6" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1"/>
            <rect x="6" y="6" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1"/>
          </svg>
          Salir
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M1 4V1H4M7 1H10V4M10 7V10H7M4 10H1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Foco
        </>
      )}
    </button>
  );
}

// ── Overlay de focus mode ─────────────────────────────────────
export function FocusModeOverlay() {
  const { active, disable } = useFocusMode();

  useEffect(() => {
    if (active) {
      document.documentElement.classList.add("focus-mode");
    } else {
      document.documentElement.classList.remove("focus-mode");
    }
    return () => {
      document.documentElement.classList.remove("focus-mode");
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {/* Indicador de focus mode */}
      <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-zinc-950/90 px-3 py-2 backdrop-blur">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
        <span className="text-[10px] font-medium text-indigo-300">
          Modo foco
        </span>
        <button
          type="button"
          onClick={disable}
          className="ml-1 text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          ESC
        </button>
      </div>
    </div>
  );
}