"use server";

import { createServerClient } from "@/lib/supabase/server";
import { enforceLimit } from "@/services/plans/enforce-limit";

export async function getBrandKit() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return null;

  const { data: kit } = await supabase
    .from("brand_kits")
    .select("*, brand_fonts(*), brand_colors(*)")
    .eq("user_id", user.id)
    .single();

  return kit ?? null;
}

export async function createBrandKit() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return null;

  const { count } = await supabase
    .from("brand_kits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  await enforceLimit("brand_kits", count ?? 0);

  const { data: kit } = await supabase
    .from("brand_kits")
    .insert({ user_id: user.id })
    .select()
    .single();

  return kit ?? null;
}

export async function addBrandColor(kitId: string, hex: string) {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return;

  await supabase.from("brand_colors").insert({
    kit_id: kitId,
    hex,
  });
}

