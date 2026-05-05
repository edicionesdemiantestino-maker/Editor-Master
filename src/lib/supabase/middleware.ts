import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicSupabaseEnv, isSupabaseConfigured } from "./env";

/**
 * Refresca la sesión JWT en cada request compatible con el matcher.
 * Usa `getUser()` (validación contra Auth server), no `getSession()` sola.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const { url, anonKey } = getPublicSupabaseEnv()!;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // `NextRequest.cookies` solo acepta (name, value); las `options` van en la `NextResponse`.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) =>
          supabaseResponse.headers.set(k, v),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
