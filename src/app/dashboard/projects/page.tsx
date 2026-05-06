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
        <h1 className="text-2xl font-semibold">Proyectos</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Supabase no está configurado en el servidor.
        </p>
        <Link href="/editor/demo" className="text-sm underline">
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
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Proyectos
          </h1>
          {user?.email ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </p>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <NewProjectButton />
          <SignOutButton />
        </nav>
      </header>

      <section className="flex flex-col gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Todavía no hay proyectos. Creá uno con &quot;Nuevo proyecto&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/editor/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span className="max-w-[60%] truncate font-medium text-zinc-800 dark:text-zinc-100">
                    {p.name?.trim() ? p.name : `Proyecto ${p.id.slice(0, 8)}…`}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {new Date(p.created_at).toLocaleString("es")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        <Link href="/editor/demo" className="underline">
          Editor demo (sin cuenta)
        </Link>
      </p>
    </main>
  );
}

