"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type { TextElement } from "@/entities/editor/document-schema";
import { isTextElement } from "@/entities/editor/element-guards";
import { pickTextTypography } from "@/entities/editor/text-typography";

import { useBrandKit } from "../brand/use-brand-kit";
import { ensureFontLoaded } from "../fonts/font-manager";
import { useEditorStore } from "../store/editor-store";
import { FontPicker } from "./font-picker";

const FONT_WEIGHTS = [
  { value: 100, label: "Thin" },
  { value: 200, label: "ExtraLight" },
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "SemiBold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "ExtraBold" },
  { value: 900, label: "Black" },
] as const;

const FONT_PAIRS = [
  { heading: "Playfair Display", body: "Inter", label: "Editorial" },
  { heading: "Montserrat", body: "Lora", label: "Clásico" },
  { heading: "DM Serif Display", body: "DM Sans", label: "Moderno" },
  { heading: "Fraunces", body: "Manrope", label: "Artístico" },
  { heading: "Syne", body: "Plus Jakarta Sans", label: "Startup" },
  { heading: "Cormorant Garamond", body: "Raleway", label: "Lujo" },
] as const;

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(Math.round(value * 100) / 100));
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-500">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={draft}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const n = parseFloat(draft);
              if (!Number.isFinite(n)) {
                setDraft(String(value));
                return;
              }
              const clamped = Math.min(max, Math.max(min, n));
              setDraft(String(clamped));
              onChange(clamped);
            }}
            className="w-14 rounded border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-right text-[11px] text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
          {unit && (
            <span className="text-[10px] text-zinc-600">{unit}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500"
      />
    </div>
  );
}

export function TextInspectorPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const historyRevision = useEditorStore((s) => s.historyRevision);
  const { kit } = useBrandKit();
  const [showPairs, setShowPairs] = useState(false);

  const selectedText = useMemo(() => {
    void historyRevision;
    if (selectedIds.length !== 1) return null;
    const id = selectedIds[0];
    if (!id) return null;
    const el = present.canvas.elements.find((e) => e.id === id);
    return el && isTextElement(el) ? el : null;
  }, [present.canvas.elements, selectedIds, historyRevision]);

  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    if (!selectedText) return;
    startTransition(() => setDraftText(selectedText.text));
  }, [selectedText]);

  if (!selectedText) {
    return (
      <section className="p-4">
        <p className="text-xs text-zinc-600">
          Seleccioná un bloque de texto para editar tipografía.
        </p>
      </section>
    );
  }

  const id = selectedText.id;
  const typo = pickTextTypography(selectedText);

  const commit = (patch: Partial<TextElement>) => {
    useEditorStore.getState().updateElement(id, patch, { recordHistory: true });
  };

  const onFontChange = async (family: string) => {
    try {
      await ensureFontLoaded(family, [400, 700]);
      commit({ fontSource: "google", fontFamily: family });
    } catch (e) {
      console.error("FONT LOAD ERROR", e);
    }
  };

  return (
    <section className="flex flex-col gap-0 divide-y divide-zinc-800/60">

      {/* Contenido */}
      <div className="p-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Contenido
        </p>
        <textarea
          className="min-h-[3.5rem] w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={() => {
            if (draftText !== selectedText.text) {
              commit({ text: draftText });
            }
          }}
          placeholder="Texto del elemento"
        />
      </div>

      {/* Fuente */}
      <div className="p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Tipografía
        </p>
        <FontPicker
          value={typo.fontFamily}
          onChange={(family) => void onFontChange(family)}
        />

        {/* Peso */}
        <div className="mt-2.5">
          <p className="mb-1.5 text-[10px] text-zinc-600">Peso</p>
          <div className="flex flex-wrap gap-1">
            {FONT_WEIGHTS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => commit({ fontWeight: w.value })}
                className={`rounded-md px-2 py-1 text-[10px] transition ${
                  Number(typo.fontWeight) === w.value
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tamaño y espaciado */}
      <div className="flex flex-col gap-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Escala y espaciado
        </p>
        <SliderControl
          label="Tamaño"
          value={typo.fontSize}
          min={6}
          max={400}
          unit="px"
          onChange={(v) => commit({ fontSize: v })}
        />
        <SliderControl
          label="Altura de línea"
          value={typo.lineHeight}
          min={0.5}
          max={4}
          step={0.05}
          onChange={(v) => commit({ lineHeight: v })}
        />
        <SliderControl
          label="Espaciado letras"
          value={typo.letterSpacing}
          min={-10}
          max={40}
          step={0.5}
          unit="px"
          onChange={(v) => commit({ letterSpacing: v })}
        />
        {selectedText.width !== undefined && (
          <SliderControl
            label="Ancho máximo"
            value={selectedText.width ?? 400}
            min={20}
            max={present.canvas.width}
            unit="px"
            onChange={(v) => commit({ width: v })}
          />
        )}
      </div>

      {/* Color */}
      <div className="p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Color
        </p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5"
            value={normalizeHex(typo.fill)}
            onChange={(e) => commit({ fill: e.target.value })}
          />
          <input
            type="text"
            value={normalizeHex(typo.fill).toUpperCase()}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                commit({ fill: e.target.value });
              }
            }}
            className="flex-1 rounded border border-zinc-700 bg-zinc-800/60 px-2 py-1.5 font-mono text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            maxLength={7}
          />
        </div>
        {kit?.brand_colors?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(kit.brand_colors as { id: string; hex: string }[]).map((c) => (
              <button
                key={c.id}
                type="button"
                className="h-6 w-6 rounded-md border border-zinc-700 transition hover:scale-110"
                style={{ background: c.hex }}
                onClick={() => commit({ fill: c.hex })}
                title={c.hex}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Alineación */}
      <div className="p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Alineación
        </p>
        <div className="flex gap-1">
          {(
            [
              { value: "left" as const, icon: "▤", label: "Izquierda" },
              { value: "center" as const, icon: "▥", label: "Centro" },
              { value: "right" as const, icon: "▦", label: "Derecha" },
              { value: "justify" as const, icon: "▧", label: "Justificado" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => commit({ textAlign: opt.value })}
              className={`flex-1 rounded-lg py-2 text-sm transition ${
                typo.textAlign === opt.value
                  ? "bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/50"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
              }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Opacidad */}
      <div className="p-3">
        <SliderControl
          label="Opacidad"
          value={Math.round((selectedText.opacity ?? 1) * 100)}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => commit({ opacity: v / 100 } as Partial<TextElement>)}
        />
      </div>

      {/* Font pairing */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => setShowPairs((v) => !v)}
          className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-zinc-600 hover:text-zinc-400"
        >
          Combinaciones recomendadas
          <span>{showPairs ? "▲" : "▼"}</span>
        </button>

        {showPairs && (
          <div className="mt-2 flex flex-col gap-1.5">
            {FONT_PAIRS.map((pair) => (
              <button
                key={pair.label}
                type="button"
                onClick={() => void onFontChange(pair.heading)}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2 text-left transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                <div>
                  <div
                    className="text-sm text-zinc-100"
                    style={{ fontFamily: pair.heading }}
                  >
                    {pair.heading}
                  </div>
                  <div
                    className="text-[10px] text-zinc-500"
                    style={{ fontFamily: pair.body }}
                  >
                    + {pair.body}
                  </div>
                </div>
                <span className="rounded-md bg-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400">
                  {pair.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function normalizeHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/i.test(color)) return color;
  return "#171717";
}