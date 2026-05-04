"use client";

/**
 * Unifica escalas para mantener proporción del bitmap (scaleX === scaleY en modelo Fabric típico).
 */
export function pickUniformImageScale(scaleX: number, scaleY: number): number {
  const ax = Math.abs(scaleX);
  const ay = Math.abs(scaleY);
  const m = Math.max(ax, ay);
  const sign = Math.sign(scaleX) || 1;
  return sign * m;
}
