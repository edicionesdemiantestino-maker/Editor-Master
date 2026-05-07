"use client";

import { useState } from "react";

import { isTextElement } from "@/entities/editor/element-guards";

import { createDefaultTextElement } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";

export function MagicTextControl() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsCredits, setNeedsCredits] = useState(false);

  const onGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setErr("Escribí un prompt corto.");
      return;
    }
    setBusy(true);
    setErr(null);
    setNeedsCredits(false);
    try {
      const res = await fetch("/api/ai/generate-text", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const json = (await res.json()) as { text?: string; error?: string; detail?: string };
      if (!res.ok) {
        if (json.error === "openai_not_configured") {
          setErr("El servidor no tiene configurada la API de OpenAI (OPENAI_API_KEY).");
          return;
        }
        if (json.error === "insufficient_credits") {
          setErr("Te quedaste sin créditos para Magic Text. Comprá un pack desde el dashboard.");
          setNeedsCredits(true);
          return;
        }
        if (json.error === "upgrade_required") {
          setErr("Los planes gratuitos no incluyen Magic Text; actualizá el plan desde el dashboard.");
          return;
        }
        setErr(json.detail ?? json.error ?? `Error ${res.status}`);
        return;
      }
      if (!json.text?.length) {
        setErr("Respuesta vacía del modelo.");
        return;
      }

      const store = useEditorStore.getState();
      const ids = store.selectedIds;
      const single =
        ids.length === 1
          ? store.present.canvas.elements.find((e) => e.id === ids[0])
          : undefined;

      if (single && isTextElement(single)) {
        store.updateElement(single.id, { text: json.text }, { recordHistory: true });
        setPrompt("");
        return;
      }

      const el = createDefaultTextElement(store.present);
      store.addElement(el);
      store.select([el.id]);
      store.updateElement(el.id, { text: json.text }, { recordHistory: true });
      setPrompt("");
    } catch {
      setErr("No se pudo conectar con el servicio.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">
        Magic Text
      </p>
      <textarea
        className="mt-2 w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500/80"
        rows={3}
        placeholder='Ej: "Titular para flyer de café, 6 palabras, tono cercano"'
        value={prompt}
        disabled={busy}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void onGenerate()}
        className="mt-2 w-full rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
      >
        {busy ? "Generando…" : "✨ Generar y aplicar"}
      </button>
      {err ? <p className="mt-2 text-[11px] text-red-300">{err}</p> : null}
      {needsCredits ? (
        <a
          className="mt-2 block text-[11px] font-semibold text-amber-200 underline underline-offset-2"
          href="/dashboard/usage"
        >
          Ir a comprar créditos
        </a>
      ) : null}
    </div>
  );
}
