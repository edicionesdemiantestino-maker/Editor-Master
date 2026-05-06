"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type { TextElement } from "@/entities/editor/document-schema";
import { isTextElement } from "@/entities/editor/element-guards";
import { pickTextTypography } from "@/entities/editor/text-typography";

import { GOOGLE_FONT_OPTIONS } from "../fonts/google-fonts-catalog";
import { ensureFontLoaded } from "../fonts/font-manager";
import { useEditorStore } from "../store/editor-store";

const SYSTEM_UI_VALUE = "__SYSTEM_UI__";
const SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const FONT_WEIGHTS = [300, 400, 500, 600, 700] as const;

export function TextInspectorPanel() {
  const present = useEditorStore((s) => s.present);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const historyRevision = useEditorStore((s) => s.historyRevision);

  const selectedText = useMemo(() => {
    void historyRevision;
    if (selectedIds.length !== 1) return null;
    const id = selectedIds[0];
    if (!id) return null;
    const el = present.canvas.elements.find((e) => e.id === id);
    return el && isTextElement(el) ? el : null;
  }, [present.canvas.elements, selectedIds, historyRevision]);

  const [draftText, setDraftText] = useState("");
  const [draftSize, setDraftSize] = useState(String(selectedText?.fontSize ?? 48));
  useEffect(() => {
    if (!selectedText) return;
    startTransition(() => {
      setDraftText(selectedText.text);
      setDraftSize(String(selectedText.fontSize));
    });
  }, [selectedText]);

  if (!selectedText) {
    return (
      <section className="shrink-0 border-b border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Texto
        </h2>
        <p className="text-xs text-zinc-500">
          Seleccioná un bloque de texto (una sola capa) para editar tipografía.
        </p>
      </section>
    );
  }

  const id = selectedText.id;

  const commitTypography = (
    patch: Partial<
      Pick<
        TextElement,
        | "fontSource"
        | "fontFamily"
        | "fontSize"
        | "fontWeight"
        | "fill"
        | "textAlign"
        | "lineHeight"
        | "letterSpacing"
        | "width"
      >
    >,
  ) => {
    useEditorStore.getState().updateElement(id, patch, {
      recordHistory: true,
    });
  };

  const onFontChange = async (value: string) => {
    try {
      if (value === SYSTEM_UI_VALUE) {
        commitTypography({
          fontSource: "system",
          fontFamily: SYSTEM_FONT_STACK,
        });
        return;
      }
      const font = GOOGLE_FONT_OPTIONS.find((f) => f.family === value);
      if (font) {
        await ensureFontLoaded(font.family, [...font.weights]);
      }
      commitTypography({
        fontSource: "google",
        fontFamily: value,
      });
    } catch (e) {
      console.error("FONT LOAD ERROR", e);
    }
  };

  const typo = pickTextTypography(selectedText);
  const selectValue =
    typo.fontSource === "system" ? SYSTEM_UI_VALUE : typo.fontFamily;

  return (
    <section className="shrink-0 border-b border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Texto
      </h2>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Contenido
          </span>
          <textarea
            className="min-h-[4.5rem] rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={() => {
              if (draftText !== selectedText.text) {
                useEditorStore.getState().updateElement(
                  id,
                  { text: draftText } as Partial<TextElement>,
                  { recordHistory: true },
                );
              }
            }}
            placeholder="Escribí aquí o editá en el canvas (doble clic)"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Fuente
          </span>
          <select
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={selectValue}
            onChange={(e) => void onFontChange(e.target.value)}
          >
            <option value={SYSTEM_UI_VALUE}>Sistema (UI)</option>
            {GOOGLE_FONT_OPTIONS.map((o) => (
              <option
                key={o.family}
                value={o.family}
                style={{ fontFamily: o.family }}
              >
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Tamaño
            </span>
            <input
              type="number"
              min={6}
              max={400}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={draftSize}
              onChange={(e) => setDraftSize(e.target.value)}
              onBlur={() => {
                const n = Number(draftSize);
                if (!Number.isFinite(n)) {
                  setDraftSize(String(typo.fontSize));
                  return;
                }
                const clamped = Math.min(400, Math.max(6, Math.round(n)));
                setDraftSize(String(clamped));
                if (clamped !== typo.fontSize) {
                  commitTypography({ fontSize: clamped });
                }
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Peso
            </span>
            <select
              className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={String(typo.fontWeight)}
              onChange={(e) =>
                commitTypography({ fontWeight: Number(e.target.value) })
              }
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Color
          </span>
          <input
            type="color"
            className="h-9 w-full cursor-pointer rounded-md border border-zinc-300 bg-white p-0.5 dark:border-zinc-600"
            value={normalizeHex(typo.fill)}
            onChange={(e) => commitTypography({ fill: e.target.value })}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Alineación
          </span>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { value: "left" as const, label: "Izq" },
                { value: "center" as const, label: "Centro" },
                { value: "right" as const, label: "Der" },
                { value: "justify" as const, label: "Justif." },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  typo.textAlign === opt.value
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onClick={() => commitTypography({ textAlign: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/i.test(color)) return color;
  return "#171717";
}
