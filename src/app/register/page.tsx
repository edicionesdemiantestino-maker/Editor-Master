import Link from "next/link";

import { RegisterForm } from "@/app/register/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-white">Crear cuenta</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Registro con email. Si tu proyecto Supabase exige confirmación, revisá
          la bandeja de entrada.
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-zinc-400">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-indigo-300 underline decoration-indigo-300/40 hover:text-indigo-200">
          Ingresar
        </Link>
      </p>
    </main>
  );
}
