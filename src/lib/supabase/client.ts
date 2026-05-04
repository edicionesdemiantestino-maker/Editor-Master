"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertPublicSupabaseEnv } from "./env";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = assertPublicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
