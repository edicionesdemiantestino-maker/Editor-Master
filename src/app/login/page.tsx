import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Ingresar
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Email y contraseña (sesión en el navegador).
        </p>
      </div>

      <Suspense
        fallback={<p className="text-sm text-zinc-500">Cargando formulario…</p>}
      >
        <LoginForm />
      </Suspense>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿No tenés cuenta?{" "}
        <Link
          href="/register"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
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
