"use client";

import { useRef, useState } from "react";

import { createImageElementFromFile } from "../store/document-mutations";
import { useEditorStore } from "../store/editor-store";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT_MIME = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/i;

export function AddImageControl() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
        className="sr-only"
        aria-hidden
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;

          if (!ACCEPT_MIME.test(file.type)) {
            window.alert(
              "Formato no soportado. Usá PNG, JPEG, WebP, GIF o SVG.",
            );
            return;
          }
          if (file.size > MAX_BYTES) {
            window.alert("El archivo supera el límite de 20 MB.");
            return;
          }

          setBusy(true);
          try {
            const state = useEditorStore.getState();
            const element = await createImageElementFromFile(state.present, file);
            state.addElement(element);
          } catch (err) {
            console.error(err);
            window.alert("No se pudo cargar la imagen. Probá con otro archivo.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Importando…" : "+ Imagen"}
      </button>
    </>
  );
}
