/**
 * Evita devolver al cliente textos de error crudos de Postgres / red interna.
 */

const SUSPICIOUS = /localhost|127\.0\.0\.1|postgres|sqlstate|internal server/i;

export function safePublicErrorMessage(
  e: unknown,
  fallback: string,
): string {
  if (!(e instanceof Error)) return fallback;
  const m = e.message.replace(/\s+/g, " ").trim();
  if (m.length === 0) return fallback;
  if (m.length > 220 || SUSPICIOUS.test(m)) return fallback;
  if (/permission denied|row-level security|rls policy/i.test(m)) {
    return "No tenés permiso para esta operación.";
  }
  return m.slice(0, 220);
}
