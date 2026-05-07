import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { requireServerUser } from "@/lib/supabase/require-server-user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireServerUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.publicCode }, { status: auth.status });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, preview_url, document, is_premium, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("templates_list_error", error);
    return NextResponse.json({ error: "templates_failed" }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}
