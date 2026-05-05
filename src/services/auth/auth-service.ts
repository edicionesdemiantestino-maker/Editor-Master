import type { SupabaseClient } from "@supabase/supabase-js";

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
  // Force canonical origin to avoid GoTrue "Invalid path specified..." from mismatched hosts.
  const rawOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://editor-master.vercel.app";
  const origin = rawOrigin.replace(/\/$/, "");
  const emailRedirectTo = `${origin}/auth/callback`;
  return signUpEmailPasswordWithRedirectFallback(supabase, {
    email,
    password,
    emailRedirectTo,
  });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
