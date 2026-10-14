import { describe, expect, it } from 'vitest';
import { clamp, lerp, smoothstep } from './math';

describe('lerp', () => {
  it('interpolates without clamping t', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 1.5)).toBe(15);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('matches the inlined a + (b - a) * t expression', () => {
    const samples: Array<[number, number, number]> = [
      [0, 10, 0.5],
      [3, -7, 0.25],
      [1.25, 8.5, 1.5],
      [-4, -1, -0.2],
    ];
    for (const [a, b, t] of samples) {
      expect(lerp(a, b, t)).toBe(a + (b - a) * t);
    }
  });
});

describe('clamp', () => {
  it('clamps to the inclusive range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
  });
});

describe('smoothstep', () => {
  it('is zero outside the low end, one outside the high end, and 0.5 at the midpoint', () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(2)).toBe(1);
  });
});
