"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/logger";

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        logError("auth_client_signout_error", { message: error.message });
      }
    } catch (e) {
      logError("auth_client_signout_exception", { name: (e as Error)?.name });
    } finally {
      router.refresh();
      router.push("/login");
      setLoading(false);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={loading}
      whileHover={{ scale: loading ? 1 : 1.03 }}
      whileTap={{ scale: loading ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 440, damping: 30 }}
      className={`rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 backdrop-blur-xl hover:border-white/25 hover:bg-white/10 disabled:opacity-60 ${className}`}
    >
      {loading ? "Saliendo…" : "Salir"}
    </motion.button>
  );
}
