/** Linear interpolation from a to b by factor t (not clamped) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamped lerp: t is clamped to [0, 1] */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Frame-rate independent smoothing factor */
export function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}
