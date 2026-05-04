/**
 * Validación ligera en Server Actions (reduce abuso y payloads absurdos).
 * La política fuerte sigue siendo la de Supabase Auth.
 */

export const AUTH_EMAIL_MAX = 254;
export const AUTH_PASSWORD_MAX = 128;
export const AUTH_PASSWORD_MIN = 6;

export type ParsedAuthForm = {
  email: string;
  password: string;
};

export function parseAuthForm(formData: FormData): ParsedAuthForm {
  const email = String(formData.get("email") ?? "")
    .trim()
    .slice(0, AUTH_EMAIL_MAX);
  const password = String(formData.get("password") ?? "").slice(
    0,
    AUTH_PASSWORD_MAX,
  );
  return { email, password };
}

export function isPlausibleEmail(email: string): boolean {
  if (email.length < 5 || email.length > AUTH_EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPlausiblePassword(password: string): boolean {
  return (
    password.length >= AUTH_PASSWORD_MIN &&
    password.length <= AUTH_PASSWORD_MAX
  );
}

/** Mensaje seguro para query string (redirect), sin saltos de línea. */
export function safeAuthRedirectSnippet(message: string, max = 180): string {
  return message.replace(/[\r\n\u0000]/g, " ").trim().slice(0, max);
}

/**
 * Path interno permitido post-login (evita open redirect a dominios externos).
 * Solo rutas relativas que empiezan con `/` y no con `//`.
 */
export function parseSafeInternalPath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  if (t.length > 2048) return "/";
  return t;
}
