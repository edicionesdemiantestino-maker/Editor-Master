import type { AuthResponse } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GoTrue rechaza `redirect_to` si no está en Redirect URLs del proyecto (mensaje típico:
 * "Invalid path specified in request URL"). En ese caso reintentamos **sin** redirect_to:
 * el email de confirmación usa la **Site URL** del dashboard de Supabase (configurala bien).
 *
 * No reintentamos si el error indica usuario ya existente (evita segundos intentos confusos).
 */
export function shouldRetrySignUpWithoutRedirect(errorMessage: string): boolean {
  const m = errorMessage.toLowerCase();
  if (/already\s+(registered|exists)|email\s+already|user\s+already/i.test(m)) {
    return false;
  }
  return (
    m.includes("invalid path") ||
    m.includes("redirect_to") ||
    m.includes("redirect url") ||
    m.includes("redirect uri") ||
    (m.includes("redirect") && (m.includes("allow") || m.includes("invalid")))
  );
}

export async function signUpEmailPasswordWithRedirectFallback(
  supabase: SupabaseClient,
  args: {
    email: string;
    password: string;
    emailRedirectTo: string;
  },
): Promise<AuthResponse> {
  const first = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: { emailRedirectTo: args.emailRedirectTo },
  });

  if (
    first.error &&
    shouldRetrySignUpWithoutRedirect(first.error.message ?? "")
  ) {
    return supabase.auth.signUp({
      email: args.email,
      password: args.password,
    });
  }

  return first;
}
