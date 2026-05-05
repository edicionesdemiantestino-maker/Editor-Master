import { createClient } from "@supabase/supabase-js";

import { assertPublicSupabaseEnv } from "./env";

/**
 * Cliente Supabase para `auth.signUp` desde Server Actions (sin persistencia en browser).
 * Usa defaults de auth de `@supabase/supabase-js` (PKCE donde aplique el SDK).
 */
export function createSignUpSupabaseClient() {
  const { url, anonKey } = assertPublicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
