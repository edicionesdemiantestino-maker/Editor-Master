import Link from "next/link";

import { NewProjectButton } from "@/app/new-project-button";
import { SignOutButton } from "@/app/sign-out-button";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjectsForUser } from "@/services/projects/projects-service";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">Proyectos</h1>
        <p className="text-sm text-zinc-400">Supabase no está configurado en el servidor.</p>
        <Link href="/editor/demo" className="text-sm text-indigo-300 underline decoration-indigo-300/40 hover:text-indigo-200">
          Abrir editor demo (sin cuenta)
        </Link>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projects = user ? await listProjectsForUser(supabase) : [];

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Proyectos</h1>
          {user?.email ? (
            <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <NewProjectButton />
          <SignOutButton />
        </nav>
      </header>

      <section className="flex flex-col gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Todavía no hay proyectos. Creá uno con &quot;Nuevo proyecto&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/editor/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-white/[0.06]"
                >
                  <span className="max-w-[60%] truncate font-medium text-zinc-100">
                    {p.name?.trim() ? p.name : `Proyecto ${p.id.slice(0, 8)}…`}
                  </span>
                  <span className="text-zinc-500">{new Date(p.created_at).toLocaleString("es")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-500">
        <Link href="/editor/demo" className="text-indigo-300 underline decoration-indigo-300/40 hover:text-indigo-200">
          Editor demo (sin cuenta)
        </Link>
      </p>
    </main>
  );
}
