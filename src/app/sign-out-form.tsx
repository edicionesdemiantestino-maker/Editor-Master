import { signOutAction } from "@/app/actions/auth";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Salir
      </button>
    </form>
  );
}
