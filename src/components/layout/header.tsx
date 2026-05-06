import Link from "next/link";

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

export function Header({
  ctaHref = "/login",
  ctaLabel = "Empezar gratis",
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">Editor Maestro</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-zinc-600 dark:text-zinc-300 md:flex">
          <a href="#features" className="hover:text-zinc-900 dark:hover:text-white">
            Features
          </a>
          <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="hover:text-zinc-900 dark:hover:text-white">
            Login
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={ctaHref}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}

