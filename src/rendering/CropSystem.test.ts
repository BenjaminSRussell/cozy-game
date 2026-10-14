import { describe, expect, it } from 'vitest';
import { CropStage } from '../types/game';
import { CropSystem } from './CropSystem';

const SEASON = 'summer';

function growUntilHarvestable(crops: CropSystem, x: number, y: number) {
  for (let i = 0; i < 8; i++) {
    const crop = crops.getCropAt(x, y);
    if (crop?.stage === CropStage.HARVESTABLE) return crop;
    crops.waterCrop(x, y, 100);
    crops.updateCrops(300_000, SEASON);
  }
  throw new Error(`crop at ${x},${y} did not become harvestable`);
}

describe('CropSystem multi-harvest regrowth', () => {
  it('removes a single-harvest crop and leaves the plot empty', () => {
    const crops = new CropSystem();
    expect(crops.plantCrop(0, 0, 'wheat')).toBe(true);
    growUntilHarvestable(crops, 0, 0);

    const result = crops.harvestCrop(0, 0);
    expect(result.success).toBe(true);
    expect(result.cropType).toBe('wheat');
    expect((result.yield ?? 0) > 0).toBe(true);
    expect(crops.getCropAt(0, 0)).toBeNull();
  });

  it.each([
    ['strawberry', 2],
    ['blueberry', 3],
    ['cranberry', 2],
    ['tomato', 3],
  ] as const)('%s stays planted and fruits again after %i watered days', (type, days) => {
    const crops = new CropSystem();
    expect(crops.plantCrop(1, 2, type)).toBe(true);
    expect(crops.harvestCrop(1, 2).success).toBe(false);
    expect(crops.getCropAt(1, 2)?.stage).toBe(CropStage.SEED);

    growUntilHarvestable(crops, 1, 2);
    const first = crops.harvestCrop(1, 2);
    expect(first.success).toBe(true);
    expect((first.yield ?? 0) > 0).toBe(true);

    const after = crops.getCropAt(1, 2);
    expect(after).not.toBeNull();
    expect(after?.stage).toBe(CropStage.MATURE);
    expect(after?.regrowthStage).toBe(CropStage.MATURE);
    expect(after?.regrowthDays).toBe(days);
    expect(after?.daysUntilNextHarvest).toBe(days);

    // A dry bush does not move closer to the next harvest.
    crops.waterCrop(1, 2, 30 - (after?.waterLevel ?? 0));
    expect(crops.getCropAt(1, 2)?.waterLevel).toBeLessThanOrEqual(30);
    for (let day = 0; day < days; day++) {
      crops.updateCrops(CropSystem.REGROWTH_DAY_MS, SEASON);
    }
    const dry = crops.getCropAt(1, 2);
    expect(dry?.stage).toBe(CropStage.MATURE);
    expect(dry?.daysUntilNextHarvest).toBe(days);
    expect(dry?.health).toBeGreaterThan(0);

    crops.waterCrop(1, 2, 100);
    crops.updateCrops(CropSystem.REGROWTH_DAY_MS, SEASON);
    expect(crops.getCropAt(1, 2)?.daysUntilNextHarvest).toBe(days - 1);
    expect(crops.getCropAt(1, 2)?.stage).toBe(CropStage.MATURE);

    for (let day = 1; day < days; day++) {
      crops.waterCrop(1, 2, 100);
      crops.updateCrops(CropSystem.REGROWTH_DAY_MS, SEASON);
    }

    const ready = crops.getCropAt(1, 2);
    expect(ready?.stage).toBe(CropStage.HARVESTABLE);
    expect(ready?.daysUntilNextHarvest).toBe(0);

    const second = crops.harvestCrop(1, 2);
    expect(second.success).toBe(true);
    expect((second.yield ?? 0) > 0).toBe(true);
    const again = crops.getCropAt(1, 2);
    expect(again?.stage).toBe(CropStage.MATURE);
    expect(again?.daysUntilNextHarvest).toBe(days);
    expect(again?.x).toBe(1);
    expect(again?.y).toBe(2);
  });
});
