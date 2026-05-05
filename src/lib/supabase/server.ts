import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertPublicSupabaseEnv } from "./env";

export async function createServerSupabaseClient() {
  const { url, anonKey: key } = assertPublicSupabaseEnv();
  const cookieStore = await cookies();
  return createSupabaseServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* En RSC el refresh de tokens lo resuelve middleware. */
        }
      },
    },
  });
}

// Alias legacy (para rutas API que esperan este nombre).
export const createServerClient = createServerSupabaseClient;
export const createClient = createServerSupabaseClient;
