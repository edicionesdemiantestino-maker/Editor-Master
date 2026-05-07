"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GradientButton } from "@/components/ui/gradient-button";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/logger";

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpErr) {
      logError("auth_client_signup_error", { message: signUpErr.message });
      setError(signUpErr.message || "No se pudo registrar.");
      setLoading(false);
      return;
    }

    router.push("/login?message=check_email_or_login");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-300">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-400/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-300">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-400/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}
      <GradientButton type="submit" disabled={loading} className="w-full disabled:opacity-50">
        {loading ? "Creando cuenta…" : "Registrarme"}
      </GradientButton>
    </form>
  );
}
