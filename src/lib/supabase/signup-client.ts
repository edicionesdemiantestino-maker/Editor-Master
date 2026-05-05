import { createClient } from "@supabase/supabase-js";

import { assertPublicSupabaseEnv } from "./env";

/**
 * Cliente **sin PKCE** para `auth.signUp` desde Server Actions.
 *
 * `createServerClient` (@supabase/ssr) fuerza `flowType: "pkce"`. En el POST
 * `/signup` eso añade `code_challenge` y `redirect_to` en la query; en algunos
 * entornos GoTrue responde **"Invalid path specified in request URL"** aunque
 * el redirect esté en la allowlist. Con `flowType: "implicit"` el signup no
 * envía PKCE; el flujo de confirmación por email sigue siendo el estándar.
 */
export function createSignUpSupabaseClient() {
  const { url, anonKey } = assertPublicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
