import Link from "next/link";

import { signInAction } from "@/app/actions/auth";
import { parseSafeInternalPath } from "@/lib/auth/form-validation";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

const LOGIN_MESSAGES: Record<string, string> = {
  "confirm-email":
    "Si tu proyecto Supabase exige confirmación, revisá tu correo y luego ingresá acá.",
  required: "Iniciá sesión para continuar.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const q = await searchParams;
  const nextPath = parseSafeInternalPath(q.next);
  const infoMessage =
    q.message != null && q.message in LOGIN_MESSAGES
      ? LOGIN_MESSAGES[q.message as keyof typeof LOGIN_MESSAGES]
      : q.message;

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Ingresar
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Email y contraseña (Supabase Auth).
        </p>
      </div>

      <form action={signInAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={nextPath} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        {q.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{q.error}</p>
        ) : null}
        {infoMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {infoMessage}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Registrate
        </Link>
      </p>
      <p className="text-center text-sm">
        <Link href="/" className="text-zinc-500 underline dark:text-zinc-400">
          Volver al inicio
        </Link>
      </p>
    </main>
  );
}
