"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import type { TextElement } from "@/entities/editor/document-schema";
import { isTextElement } from "@/entities/editor/element-guards";
import { pickTextTypography } from "@/entities/editor/text-typography";
import { useBrandKit } from "../brand/use-brand-kit";
import { ensureFontLoaded } from "../fonts/font-manager";
import { useEditorStore } from "../store/editor-store";
import { FontPicker } from "./font-picker";
import { Section, PremiumSlider, PanelDivider } from "@/lib/design-system/primitives";
import { border, surface, motion, radius, typography } from "@/lib/design-system/tokens";

const FONT_WEIGHTS = [
  { value: 100, label: "Thin" },
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semi" },
  { value: 700, label: "Bold" },
  { value: 900, label: "Black" },
] as const;

const FONT_PAIRS = [
  { heading: "Playfair Display", body: "Inter", label: "Editorial" },
  { heading: "DM Serif Display", body: "DM Sans", label: "Moderno" },
  { heading: "Fraunces", body: "Manrope", label: "Artístico" },
  { heading: "Syne", body: "Plus Jakarta Sans", label: "Startup" },
  { heading: "Cormorant Garamond", body: "Raleway", label: "Lujo" },
] as const;

const ALIGN_OPTIONS = [
  { value: "left" as const, icon: "▤" },
  { value: "center" as const, icon: "▥" },
  { value: "right" as const, icon: "▦" },
  { value: "justify" as const, icon: "▧" },
] as const;

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
      <div className="p-4">
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
          Seleccioná un bloque de texto para editar.
        </p>
      </div>
    );
  }

  const id = selectedText.id;
  const typo = pickTextTypography(selectedText);

  const commit = (patch: Partial<TextElement>) =>
    useEditorStore.getState().updateElement(id, patch, { recordHistory: true });

  const onFontChange = async (family: string) => {
    try {
      await ensureFontLoaded(family, [400, 700]);
      commit({ fontSource: "google", fontFamily: family });
    } catch {}
  };

  return (
    <div className="flex flex-col">

      {/* Contenido */}
      <Section label="Contenido">
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={() => {
            if (draftText !== selectedText.text) commit({ text: draftText });
          }}
          rows={3}
          placeholder="Texto del elemento"
          className="w-full resize-none focus:outline-none"
          style={{
            background: surface.glass,
            border: border.soft,
            borderRadius: radius.md,
            padding: "8px 10px",
            fontSize: "12px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: "1.5",
          }}
        />
      </Section>

      {/* Tipografía */}
      <Section label="Tipografía">
        <FontPicker
          value={typo.fontFamily}
          onChange={(family) => void onFontChange(family)}
        />

        {/* Peso */}
        <div className="mt-2.5 flex flex-wrap gap-1">
          {FONT_WEIGHTS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => commit({ fontWeight: w.value })}
              style={{
                padding: "3px 8px",
                borderRadius: radius.sm,
                fontSize: "10px",
                fontWeight: "500",
                transition: `all ${motion.duration.fast}`,
                background:
                  Number(typo.fontWeight) === w.value
                    ? "rgba(99,102,241,0.25)"
                    : surface.glass,
                color:
                  Number(typo.fontWeight) === w.value
                    ? "rgba(99,102,241,0.9)"
                    : "rgba(255,255,255,0.3)",
                border:
                  Number(typo.fontWeight) === w.value
                    ? "0.5px solid rgba(99,102,241,0.4)"
                    : border.subtle,
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Escala */}
      <Section label="Escala y espaciado">
        <PremiumSlider
          label="Tamaño"
          value={typo.fontSize}
          min={6}
          max={400}
          unit="px"
          defaultValue={48}
          onChange={(v) => commit({ fontSize: v })}
        />
        <PremiumSlider
          label="Línea"
          value={typo.lineHeight}
          min={0.5}
          max={4}
          step={0.05}
          defaultValue={1.2}
          onChange={(v) => commit({ lineHeight: v })}
        />
        <PremiumSlider
          label="Tracking"
          value={typo.letterSpacing}
          min={-10}
          max={40}
          step={0.5}
          unit="px"
          defaultValue={0}
          onChange={(v) => commit({ letterSpacing: v })}
        />
        {selectedText.width !== undefined && (
          <PremiumSlider
            label="Ancho"
            value={selectedText.width ?? 400}
            min={20}
            max={present.canvas.width}
            unit="px"
            defaultValue={400}
            onChange={(v) => commit({ width: v })}
          />
        )}
      </Section>

      {/* Color */}
      <Section label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={normalizeHex(typo.fill)}
            onChange={(e) => commit({ fill: e.target.value })}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: radius.md,
              border: border.soft,
              background: "transparent",
              cursor: "pointer",
              padding: "2px",
            }}
          />
          <input
            type="text"
            value={normalizeHex(typo.fill).toUpperCase()}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
                commit({ fill: e.target.value });
            }}
            maxLength={7}
            className="flex-1 focus:outline-none"
            style={{
              background: surface.glass,
              border: border.soft,
              borderRadius: radius.md,
              padding: "6px 10px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
            }}
          />
        </div>
        {kit?.brand_colors?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(kit.brand_colors as { id: string; hex: string }[]).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => commit({ fill: c.hex })}
                title={c.hex}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: radius.sm,
                  background: c.hex,
                  border: border.subtle,
                  transition: `transform ${motion.duration.fast}`,
                }}
                className="hover:scale-110"
              />
            ))}
          </div>
        ) : null}
      </Section>

      {/* Alineación */}
      <Section label="Alineación">
        <div className="flex gap-1">
          {ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => commit({ textAlign: opt.value })}
              style={{
                flex: 1,
                padding: "6px",
                borderRadius: radius.md,
                fontSize: "14px",
                transition: `all ${motion.duration.fast}`,
                background:
                  typo.textAlign === opt.value
                    ? "rgba(99,102,241,0.2)"
                    : surface.glass,
                color:
                  typo.textAlign === opt.value
                    ? "rgba(99,102,241,0.9)"
                    : "rgba(255,255,255,0.25)",
                border:
                  typo.textAlign === opt.value
                    ? "0.5px solid rgba(99,102,241,0.35)"
                    : border.subtle,
              }}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </Section>

      {/* Opacidad */}
      <Section label="Opacidad">
        <PremiumSlider
          label="Opacidad"
          value={Math.round((selectedText.opacity ?? 1) * 100)}
          min={0}
          max={100}
          unit="%"
          defaultValue={100}
          onChange={(v) => commit({ opacity: v / 100 } as Partial<TextElement>)}
        />
      </Section>

      {/* Combinaciones */}
      <Section
        label="Combinaciones"
        collapsible
        defaultOpen={false}
      >
        <div className="flex flex-col gap-1.5">
          {FONT_PAIRS.map((pair) => (
            <button
              key={pair.label}
              type="button"
              onClick={() => void onFontChange(pair.heading)}
              className="flex items-center justify-between text-left"
              style={{
                padding: "8px 10px",
                borderRadius: radius.md,
                background: surface.glass,
                border: border.subtle,
                transition: `all ${motion.duration.fast}`,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: pair.heading,
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {pair.heading}
                </div>
                <div
                  style={{
                    fontFamily: pair.body,
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  + {pair.body}
                </div>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 6px",
                  borderRadius: radius.sm,
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.2)",
                }}
              >
                {pair.label}
              </span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function normalizeHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/i.test(color)) return color;
  return "#171717";
}