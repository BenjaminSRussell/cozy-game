import { describe, expect, it } from 'vitest';
import { AdvancedCropSystem } from './CropSystem';

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
