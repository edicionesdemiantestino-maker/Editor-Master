import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmailRedirectOrigin } from "@/lib/supabase/email-redirect-origin";
import { createSignUpSupabaseClient } from "@/lib/supabase/signup-client";

import { signUpEmailPasswordWithRedirectFallback } from "./sign-up-with-fallback";

export async function signInWithEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * No usa `createServerSupabaseClient`: el registro va con cliente sin PKCE
 * (`createSignUpSupabaseClient`) para evitar el error de GoTrue con `redirect_to`.
 */
export async function signUpWithEmailPassword(email: string, password: string) {
  const supabase = createSignUpSupabaseClient();
  const origin = await getEmailRedirectOrigin();
  const emailRedirectTo = new URL("/auth/callback", origin).href;
  return signUpEmailPasswordWithRedirectFallback(supabase, {
    email,
    password,
    emailRedirectTo,
  });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
