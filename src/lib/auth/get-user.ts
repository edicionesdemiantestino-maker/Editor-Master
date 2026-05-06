import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getUserSafe() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

