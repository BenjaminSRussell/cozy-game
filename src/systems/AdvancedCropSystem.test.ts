import { describe, expect, it } from 'vitest';
import { AdvancedCropSystem } from './AdvancedCropSystem';

describe('AdvancedCropSystem seed day advance', () => {
  const crops = new AdvancedCropSystem();

  it('keeps freshly planted wheat at seed for 0.3 days, then sprouts', () => {
    expect(crops.getGrowthStage('wheat', 0)).toMatchObject({ name: 'seed', days: 0.3 });
    expect(crops.getGrowthStage('wheat', 0.29).name).toBe('seed');
    expect(crops.getGrowthStage('wheat', 0.3)).toMatchObject({ name: 'sprouting', days: 1 });
  });

  it('sprouts carrots after 0.25 days without changing later stage days', () => {
    expect(crops.getGrowthStage('carrot', 0)).toMatchObject({ name: 'seed', days: 0.25 });
    expect(crops.getGrowthStage('carrot', 0.24).name).toBe('seed');
    expect(crops.getGrowthStage('carrot', 0.25)).toMatchObject({ name: 'sprouting', days: 1 });
    expect(crops.getGrowthStage('carrot', 1.5).days).toBe(1.5);
    expect(crops.getGrowthStage('carrot', 2).days).toBe(2);
  });

  it('leaves wheat stages after seed, and zero-day seeds, unchanged', () => {
    expect(crops.getGrowthStage('wheat', 1).days).toBe(1);
    expect(crops.getGrowthStage('wheat', 2).days).toBe(2);
    expect(crops.getGrowthStage('wheat', 3).days).toBe(3);
    expect(crops.getGrowthStage('wheat', 4).days).toBe(4);
    expect(crops.getGrowthStage('tomato', 0)).toMatchObject({ name: 'seed', days: 0 });
    expect(crops.getGrowthStage('tomato', 1).name).toBe('sprouting');
    expect(crops.getGrowthStage('corn', 0)).toMatchObject({ name: 'seed', days: 0 });
    expect(crops.getGrowthStage('corn', 1).name).toBe('seed');
    expect(crops.getGrowthStage('corn', 2).name).toBe('sprouting');
  });
});

describe('AdvancedCropSystem corn sway', () => {
  const crops = new AdvancedCropSystem();

  it('leaves wheat, carrot, and tomato personalities unchanged', () => {
    expect(crops.getCropPersonality('wheat')).toEqual({
      type: 'calm',
      swayAmount: 0.3,
      bounceHeight: 2,
      glowIntensity: 0.2,
      animationSpeed: 0.02,
      specialEffects: ['gentle_sway', 'wind_response'],
    });
    expect(crops.getCropPersonality('carrot')).toEqual({
      type: 'shy',
      swayAmount: 0.1,
      bounceHeight: 1,
      glowIntensity: 0.4,
      animationSpeed: 0.015,
      specialEffects: ['peek_animation', 'growth_spurt'],
    });
    expect(crops.getCropPersonality('tomato')).toEqual({
      type: 'proud',
      swayAmount: 0.2,
      bounceHeight: 3,
      glowIntensity: 0.6,
      animationSpeed: 0.025,
      specialEffects: ['ripe_glow', 'weight_bounce'],
    });
  });

  it('keeps the corn sprite within half a tile after 10000 animation ticks', () => {
    expect(crops.getCropPersonality('corn')).toEqual({
      type: 'energetic',
      swayAmount: 0.2,
      bounceHeight: 4,
      glowIntensity: 0.3,
      animationSpeed: 0.025,
      specialEffects: ['dramatic_sway', 'height_growth'],
    });

    // Harvestable corn is size 1, so its sway is the largest x offset.
    let farthest = 0;
    for (let tick = 0; tick <= 10000; tick++) {
      const offset = crops.calculateAnimation('corn', 5, 100, 100, tick).x;
      farthest = Math.max(farthest, Math.abs(offset));
    }
    expect(farthest).toBeLessThan(0.5);
  });
});
