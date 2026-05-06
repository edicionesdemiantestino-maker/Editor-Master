import { createServerClient } from "@/lib/supabase/server";

export type UserPlan = {
  id: string;
  name: string;
  price_usd?: number;
  inpaint_limit: number;
  export_print_limit: number;
  max_brand_kits: number;
};

export async function getUserPlan(): Promise<UserPlan | null> {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return null;

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan_id, status, current_period_end")
    .eq("user_id", user.id)
    .single();

  const planId =
    sub &&
    sub.status === "active" &&
    sub.current_period_end &&
    new Date(sub.current_period_end as any).getTime() > Date.now()
      ? String(sub.plan_id)
      : "free";

  const { data: plan } = await supabase
    .from("billing_plans")
    .select("id, name, price_usd, inpaint_limit, export_print_limit, max_brand_kits")
    .eq("id", planId)
    .single();

  if (!plan) return null;

  return {
    id: String(plan.id),
    name: String(plan.name),
    price_usd: Number(plan.price_usd ?? 0),
    inpaint_limit: Number(plan.inpaint_limit ?? 0),
    export_print_limit: Number(plan.export_print_limit ?? 0),
    max_brand_kits: Number((plan as any).max_brand_kits ?? 1),
  };
}

