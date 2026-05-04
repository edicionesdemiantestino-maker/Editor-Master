/**
 * Cede el hilo principal entre pasos pesados de exportación para que el navegador
 * pueda pintar / atender input (evita “long task” monolíticos).
 */
export function yieldToMain(): Promise<void> {
  const g = globalThis as unknown as {
    scheduler?: { yield?: () => Promise<void> };
  };
  if (typeof g.scheduler?.yield === "function") {
    return g.scheduler.yield();
  }
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
