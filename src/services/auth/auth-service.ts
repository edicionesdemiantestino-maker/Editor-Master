import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmailRedirectOrigin } from "@/lib/supabase/email-redirect-origin";

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
  const origin = await getEmailRedirectOrigin();
  const emailRedirectTo = new URL("/auth/callback", origin).href;
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
