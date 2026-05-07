"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createProjectAction } from "@/app/actions/projects";

export function NewProjectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <motion.button
      type="button"
      disabled={busy}
      whileHover={{ scale: busy ? 1 : 1.03 }}
      whileTap={{ scale: busy ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-purple-500/20 disabled:opacity-50"
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
    </motion.button>
  );
}
