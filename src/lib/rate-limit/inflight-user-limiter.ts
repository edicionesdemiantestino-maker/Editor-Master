/**
 * Limita peticiones concurrentes por usuario (evita ráfagas contra Replicate).
 * Misma advertencia multi-instancia que memory-sliding-window.
 */

export function createInflightLimiter(maxConcurrent: number) {
  const counts = new Map<string, number>();

  return {
    tryAcquire(userId: string): boolean {
      const n = counts.get(userId) ?? 0;
      if (n >= maxConcurrent) return false;
      counts.set(userId, n + 1);
      return true;
    },
    release(userId: string): void {
      const n = counts.get(userId) ?? 0;
      if (n <= 1) counts.delete(userId);
      else counts.set(userId, n - 1);
    },
  };
}
