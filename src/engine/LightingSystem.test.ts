import { describe, expect, it } from 'vitest';
import { DynamicLightingSystem, type Season, type TimeOfDay } from './LightingSystem';

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
