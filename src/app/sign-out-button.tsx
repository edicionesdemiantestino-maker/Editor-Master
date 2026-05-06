"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      logError("auth_client_signout_exception", { name: (e as any)?.name });
    } finally {
      router.refresh();
      router.push("/login");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={`rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 ${className}`}
    >
      {loading ? "Saliendo…" : "Salir"}
    </button>
  );
}

