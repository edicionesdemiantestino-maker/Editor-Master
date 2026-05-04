import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireServerUser } from "@/lib/supabase/require-server-user";
import { getProjectById } from "@/services/projects/projects-service";

import { EditorPageClient } from "./editor-page-client";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

/**
 * `demo` sigue siendo solo cliente (sin Supabase).
 * UUID remoto: gate en servidor con `getUser` + fila `projects` (defensa junto a RLS).
 */
export default async function EditorProjectPage({ params }: PageProps) {
  const { projectId } = await params;

  if (projectId === "demo") {
    return <EditorPageClient projectId={projectId} />;
  }

  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const auth = await requireServerUser();
  if (!auth.ok) {
    redirect(
      `/login?next=${encodeURIComponent(`/editor/${projectId}`)}&message=required`,
    );
  }

  const row = await getProjectById(auth.supabase, projectId);
  if (!row || row.user_id !== auth.userId) {
    redirect("/?error=project-not-found");
  }

  return (
    <EditorPageClient projectId={projectId} initialDocument={row.data} />
  );
}
