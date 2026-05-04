import Link from "next/link";

import { NewProjectButton } from "@/app/new-project-button";
import { SignOutForm } from "@/app/sign-out-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listProjectsForUser } from "@/services/projects/projects-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Editor Maestro
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Para cuenta y proyectos en la nube, configurá{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            y{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            en{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              .env.local
            </code>
            , ejecutá la migración en Supabase y reiniciá el servidor.
          </p>
        </div>
        <Link
          href="/editor/demo"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Abrir editor (demo local)
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
            Editor Maestro
          </h1>
          {user?.email ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </p>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <NewProjectButton />
              <SignOutForm />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
          Proyectos
        </h2>
        {!user ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Iniciá sesión para ver y crear proyectos guardados en Supabase.
          </p>
        ) : projects.length === 0 ? (
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
