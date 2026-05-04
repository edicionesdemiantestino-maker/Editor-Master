"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createProjectAction } from "@/app/actions/projects";

export function NewProjectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      onClick={async () => {
        setBusy(true);
        try {
          const r = await createProjectAction();
          if (r.ok) {
            router.push(`/editor/${r.id}`);
            return;
          }
          window.alert(r.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Creando…" : "Nuevo proyecto"}
    </button>
  );
}
