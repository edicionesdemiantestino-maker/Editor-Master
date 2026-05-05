import type { SupabaseClient } from "@supabase/supabase-js";

import { getSiteOrigin } from "@/lib/supabase/env";

export async function signInWithEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  const emailRedirectTo = new URL("/auth/callback", getSiteOrigin()).href;
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
