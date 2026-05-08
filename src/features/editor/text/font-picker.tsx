"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  FONT_CATALOG,
  FONT_CATEGORIES,
  CATEGORY_ORDER,
  searchFonts,
  type FontCategory,
  type FontEntry,
} from "@/lib/fonts/font-catalog";
import { ensureFontLoaded } from "../fonts/font-manager";

type FontPickerProps = {
  value: string;
  onChange: (family: string) => void;
};

const RECENT_KEY = "em_recent_fonts";
const MAX_RECENT = 6;

function getRecentFonts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addRecentFont(family: string): void {
  try {
    const current = getRecentFonts().filter((f) => f !== family);
    const updated = [family, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

function FontPreviewRow({
  entry,
  isActive,
  onSelect,
  onHover,
}: {
  entry: FontEntry;
  isActive: boolean;
  onSelect: (family: string) => void;
  onHover: (family: string | null) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    ensureFontLoaded(entry.family, [400])
      .then(() => setLoaded(true))
      .catch(() => setLoaded(true));
  }, [entry.family]);

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(entry.family)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(entry.family)}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-all ${
        isActive
          ? "bg-indigo-600/20 text-indigo-300"
          : "text-zinc-300 hover:bg-zinc-800/80"
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <span
          className="text-base leading-none"
          style={{
            fontFamily: loaded ? entry.family : "inherit",
            opacity: loaded ? 1 : 0.5,
          }}
        >
          {entry.family}
        </span>
        <span className="text-[10px] text-zinc-600">
          {entry.weights.length} pesos
          {entry.tags?.[0] ? ` · ${entry.tags[0]}` : ""}
        </span>
      </div>
      {isActive && (
        <span className="text-[10px] font-semibold text-indigo-400">
          activa
        </span>
      )}
    </button>
  );
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FontCategory | "recientes" | "todas">("todas");
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentFonts, setRecentFonts] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setRecentFonts(getRecentFonts());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filteredFonts = useMemo(() => {
    if (query.trim()) return searchFonts(query);
    if (activeCategory === "recientes") {
      return recentFonts
        .map((f) => FONT_CATALOG.find((e) => e.family === f))
        .filter(Boolean) as FontEntry[];
    }
    if (activeCategory === "todas") return FONT_CATALOG;
    return FONT_CATALOG.filter((f) => f.category === activeCategory);
  }, [query, activeCategory, recentFonts]);

  const handleSelect = (family: string) => {
    addRecentFont(family);
    onChange(family);
    setOpen(false);
    setQuery("");
  };

  const previewFamily = hovered ?? value;

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-left transition hover:border-zinc-500"
      >
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm leading-none text-zinc-100"
            style={{ fontFamily: value }}
          >
            {value || "Seleccionar fuente"}
          </span>
          <span className="text-[10px] text-zinc-500">
            {FONT_CATALOG.find((f) => f.family === value)?.category ?? "fuente"}
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Preview live */}
      {previewFamily && (
        <div
          className="mt-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
          style={{ fontFamily: previewFamily }}
        >
          <span className="text-lg text-zinc-100">
            El diseño habla por sí solo
          </span>
          <span className="ml-2 text-xs text-zinc-600">{previewFamily}</span>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          {/* Search */}
          <div className="border-b border-zinc-800 p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar fuente..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Categorías */}
          {!query && (
            <div className="flex gap-0.5 overflow-x-auto border-b border-zinc-800 px-2 py-1.5 scrollbar-none">
              {(
                [
                  "todas",
                  "recientes",
                  ...CATEGORY_ORDER,
                ] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition ${
                    activeCategory === cat
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {cat === "todas"
                    ? "Todas"
                    : cat === "recientes"
                      ? "Recientes"
                      : FONT_CATEGORIES[cat]}
                </button>
              ))}
            </div>
          )}

          {/* Lista */}
          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {filteredFonts.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-zinc-600">
                Sin resultados para "{query}"
              </p>
            ) : (
              filteredFonts.map((entry) => (
                <FontPreviewRow
                  key={entry.family}
                  entry={entry}
                  isActive={entry.family === value}
                  onSelect={handleSelect}
                  onHover={setHovered}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}