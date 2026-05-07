import { redirect } from "next/navigation";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { CmsClient } from "./cms-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Site = { id: string; name: string; subdomain: string };
type Collection = { id: string; name: string; slug: string; site_id: string };

export default async function CmsPage() {
  const auth = await requireServerUser();
  if (!auth.ok) redirect("/login");

  const { userId, supabase } = auth;

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, subdomain")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: collections } = await supabase
    .from("cms_collections")
    .select("id, name, slug, site_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400">
            CMS
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Content Manager
          </h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Administrá el contenido dinámico de tus sitios publicados.
        </p>
      </div>

      <CmsClient
        sites={(sites ?? []) as Site[]}
        initialCollections={(collections ?? []) as Collection[]}
        userId={userId}
      />
    </main>
  );
}