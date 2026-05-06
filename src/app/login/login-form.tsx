"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/logger";
import { parseSafeInternalPath } from "@/lib/auth/form-validation";

const LOGIN_ERRORS: Record<string, string> = {
  auth_failed: "No pudimos validar el email o la contraseña.",
  session_failed:
    "No se pudo confirmar la sesión en el servidor. Revisá cookies, dominio o probá de nuevo.",
};

const LOGIN_MESSAGES: Record<string, string> = {
  "confirm-email":
    "Si tu proyecto Supabase exige confirmación, revisá tu correo y luego ingresá acá.",
  check_email_or_login:
    "Si tu cuenta requiere confirmación, revisá el email. Después podés entrar con tu contraseña.",
  required: "Iniciá sesión para continuar.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const nextPath = parseSafeInternalPath(searchParams.get("next"));
  const qpError = searchParams.get("error");
  const qpMessage = searchParams.get("message");
  const infoMessage =
    qpMessage != null && qpMessage in LOGIN_MESSAGES
      ? LOGIN_MESSAGES[qpMessage as keyof typeof LOGIN_MESSAGES]
      : qpMessage;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logError("auth_client_login_error", { message: error.message });
      setClientError(
        error.message || "Credenciales incorrectas o error de conexión.",
      );
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(nextPath ?? "/");
    setLoading(false);
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Contraseña</span>
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
      {qpError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {LOGIN_ERRORS[qpError] ?? qpError}
        </p>
      ) : null}
      {clientError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{clientError}</p>
      ) : null}
      {infoMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {infoMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
