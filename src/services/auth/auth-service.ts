import type { SupabaseClient } from "@supabase/supabase-js";

import { createSignUpSupabaseClient } from "@/lib/supabase/signup-client";

export async function signInWithEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmailPassword(email: string, password: string) {
  const supabase = createSignUpSupabaseClient();
  return supabase.auth.signUp({ email, password });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
