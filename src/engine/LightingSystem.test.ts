import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DynamicLightingSystem,
  LightingSystem,
  PLACED_LIGHT_RADIUS,
  placedLightSources,
  type Season,
  type TimeOfDay,
} from './LightingSystem';

function lightingAt(time: TimeOfDay, season: Season) {
  const lighting = new DynamicLightingSystem();
  lighting.setSeason(season);
  lighting.setTime(time.hour, time.minute);
  return lighting.getLightingState();
}

describe('DynamicLightingSystem seasonal day length', () => {
  it('is still day at 16:30 in winter, just before sunset', () => {
    const state = lightingAt({ hour: 16, minute: 30, totalMinutes: 990 }, 'winter');
    expect(state.isNight).toBe(false);
  });

  it('is still day at 20:00 in summer', () => {
    const state = lightingAt({ hour: 20, minute: 0, totalMinutes: 1200 }, 'summer');
    expect(state.isNight).toBe(false);
  });

  it('is night at 20:00 in winter', () => {
    const state = lightingAt({ hour: 20, minute: 0, totalMinutes: 1200 }, 'winter');
    expect(state.isNight).toBe(true);
  });
});

describe('LightingSystem.getAmbientColor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fades dawn gold to a clear day, then warms to amber and navy', () => {
    expect(LightingSystem.getAmbientColor(6 * 60).css).toBe('rgba(255, 200, 150, 0.2)');
    expect(LightingSystem.getAmbientColor(8 * 60).css).toBe('rgba(0, 0, 0, 0)');
    expect(LightingSystem.getAmbientColor(12 * 60).css).toBe('rgba(0, 0, 0, 0)');
    expect(LightingSystem.getAmbientColor(17 * 60).css).toBe('rgba(0, 0, 0, 0)');
    expect(LightingSystem.getAmbientColor(20 * 60).css).toBe('rgba(255, 120, 50, 0.25)');
    expect(LightingSystem.getAmbientColor(2 * 60).css).toBe('rgba(15, 20, 60, 0.6)');
    expect(LightingSystem.getAmbientColor(4 * 60 + 30).css).toBe('rgba(15, 20, 60, 0.6)');
    expect(LightingSystem.getAmbientColor(5 * 60 + 59).css).toBe('rgba(15, 20, 60, 0.6)');

    const dawn = LightingSystem.getAmbientColor(7 * 60);
    expect(dawn.r).toBeCloseTo(255 / 2);
    expect(dawn.g).toBeCloseTo(200 / 2);
    expect(dawn.b).toBeCloseTo(150 / 2);
    expect(dawn.a).toBeCloseTo(0.1);

    const sunset = LightingSystem.getAmbientColor(18 * 60 + 30);
    expect(sunset.r).toBeCloseTo(255 / 2);
    expect(sunset.g).toBeCloseTo(120 / 2);
    expect(sunset.b).toBeCloseTo(50 / 2);
    expect(sunset.a).toBeCloseTo(0.125);

    const night = LightingSystem.getAmbientColor(23 * 60);
    expect(night.r).toBeCloseTo((255 + 15) / 2);
    expect(night.g).toBeCloseTo((120 + 20) / 2);
    expect(night.b).toBeCloseTo((50 + 60) / 2);
    expect(night.a).toBeCloseTo((0.25 + 0.6) / 2);
  });

  it('wraps the clock and ignores a non-finite minute', () => {
    expect(LightingSystem.getAmbientColor(1440 + 20 * 60).css).toBe('rgba(255, 120, 50, 0.25)');
    expect(LightingSystem.getAmbientColor(26 * 60).css).toBe('rgba(15, 20, 60, 0.6)');

    const beforeDawn = LightingSystem.getAmbientColor(-120);
    const t = 120 / 360;
    expect(beforeDawn.r).toBeCloseTo(255 + (15 - 255) * t);
    expect(beforeDawn.g).toBeCloseTo(120 + (20 - 120) * t);
    expect(beforeDawn.b).toBeCloseTo(50 + (60 - 50) * t);
    expect(beforeDawn.a).toBeCloseTo(0.25 + (0.6 - 0.25) * t);

    expect(LightingSystem.getAmbientColor(Number.NaN).css).toBe('rgba(0, 0, 0, 0)');
    expect(LightingSystem.getAmbientColor(Number.POSITIVE_INFINITY).css).toBe('rgba(0, 0, 0, 0)');
  });

  it('does not read prefers-reduced-motion or change between identical calls', () => {
    let calls = 0;
    vi.stubGlobal('matchMedia', () => {
      calls += 1;
      return { matches: true };
    });
    const first = LightingSystem.getAmbientColor(20 * 60);
    const second = LightingSystem.getAmbientColor(20 * 60);
    expect(first).toEqual(second);
    expect(first.css).toBe('rgba(255, 120, 50, 0.25)');
    expect(calls).toBe(0);
  });
});

describe('placedLightSources', () => {
  it('keeps placed lanterns, torches, and lamps and skips other buildings', () => {
    expect(placedLightSources(null)).toEqual([]);
    expect(placedLightSources({
      buildings: [
        { type: 'barn', position: { x: 1, y: 1, z: 0 } },
        { type: 'Wall-Lantern', spriteId: 'lamp', position: { x: 3, y: 4, z: 1 } },
        { type: 'torch', position: { x: 0, y: 2 } },
        { type: 'house', position: { x: Number.NaN, y: 1 } },
      ],
      homeBuildings: [
        { type: 'shed', spriteId: 'porch_lamp', position: { x: 8, y: 1, z: 2 } },
      ],
    })).toEqual([
      { kind: 'lantern', radius: PLACED_LIGHT_RADIUS.lantern, gridX: 3, gridY: 4, gridZ: 1 },
      { kind: 'torch', radius: PLACED_LIGHT_RADIUS.torch, gridX: 0, gridY: 2, gridZ: 0 },
      { kind: 'lamp', radius: PLACED_LIGHT_RADIUS.lamp, gridX: 8, gridY: 1, gridZ: 2 },
    ]);
  });
});
