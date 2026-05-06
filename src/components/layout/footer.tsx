import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <div className="font-medium text-zinc-900 dark:text-zinc-50">
            Editor Maestro
          </div>
          <div className="mt-1">Editor visual + IA para diseños.</div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/dashboard/upgrade" className="hover:text-zinc-900 dark:hover:text-white">
            Pricing
          </Link>
          <Link href="/dashboard/usage" className="hover:text-zinc-900 dark:hover:text-white">
            Usage
          </Link>
          <Link href="/editor/demo" className="hover:text-zinc-900 dark:hover:text-white">
            Demo
          </Link>
        </div>

        <div className="text-xs text-zinc-500">
          © {new Date().getFullYear()} Editor Maestro. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}

