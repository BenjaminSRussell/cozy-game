import { describe, expect, it } from 'vitest';
import { CropStage, type Season } from '../types/game';
import { TimeSystem } from '../systems/TimeSystem';
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

describe('CropSystem seasonal withering', () => {
  function crossSeason(from: Season, to: Season) {
    const time = new TimeSystem();
    time.setSeasonCalendar(from, 28);
    const advance = time.advanceSeasonCalendar();
    expect(advance.seasonChanged).toBe(true);
    expect(advance.previous).toEqual({ season: from, day: 28 });
    expect(advance.current).toEqual({ season: to, day: 1 });
    return advance;
  }

  it('withers out-of-season crops on summer 28 → autumn 1 and leaves in-season crops', () => {
    const crops = new CropSystem();
    expect(crops.plantCrop(0, 0, 'corn')).toBe(true);
    expect(crops.plantCrop(1, 0, 'strawberry')).toBe(true);
    expect(crops.plantCrop(2, 0, 'blueberry')).toBe(true);
    expect(crops.plantCrop(3, 0, 'wheat')).toBe(true);
    expect(crops.plantCrop(4, 0, 'carrot')).toBe(true);
    expect(crops.plantCrop(5, 0, 'tomato')).toBe(true);
    expect(crops.plantCrop(6, 0, 'cranberry')).toBe(true);

    crops.updateCrops(0, 'summer');
    const advance = crossSeason('summer', 'autumn');
    crops.updateCrops(0, advance.current.season);

    expect(crops.getCropAt(0, 0)?.stage).toBe(CropStage.DEAD);
    expect(crops.getCropAt(1, 0)?.stage).toBe(CropStage.DEAD);
    expect(crops.getCropAt(2, 0)?.stage).toBe(CropStage.DEAD);
    expect(crops.getCropAt(3, 0)?.stage).toBe(CropStage.SEED);
    expect(crops.getCropAt(4, 0)?.stage).toBe(CropStage.SEED);
    expect(crops.getCropAt(5, 0)?.stage).toBe(CropStage.SEED);
    expect(crops.getCropAt(6, 0)?.stage).toBe(CropStage.SEED);

    const deadHarvest = crops.harvestCrop(0, 0);
    expect(deadHarvest.success).toBe(false);
    expect(deadHarvest.yield).toBeUndefined();
    expect(crops.getCropAt(0, 0)?.stage).toBe(CropStage.DEAD);
  });

  it('does not wither corn or wheat when spring 28 becomes summer 1', () => {
    const crops = new CropSystem();
    expect(crops.plantCrop(0, 0, 'corn')).toBe(true);
    expect(crops.plantCrop(1, 0, 'wheat')).toBe(true);
    crops.updateCrops(0, 'spring');

    const advance = crossSeason('spring', 'summer');
    crops.witherOnSeasonAdvance(advance.current.season);

    expect(crops.getCropAt(0, 0)?.stage).toBe(CropStage.SEED);
    expect(crops.getCropAt(1, 0)?.stage).toBe(CropStage.SEED);
  });

  it('withers every current crop on autumn 28 → winter 1, and not wheat on winter 28 → spring 1', () => {
    const winter = new CropSystem();
    expect(winter.plantCrop(0, 0, 'wheat')).toBe(true);
    expect(winter.plantCrop(1, 0, 'cranberry')).toBe(true);
    winter.updateCrops(0, 'autumn');
    const toWinter = crossSeason('autumn', 'winter');
    winter.witherOnSeasonAdvance(toWinter.current.season);
    expect(winter.getCropAt(0, 0)?.stage).toBe(CropStage.DEAD);
    expect(winter.getCropAt(1, 0)?.stage).toBe(CropStage.DEAD);

    const spring = new CropSystem();
    expect(spring.plantCrop(0, 0, 'wheat')).toBe(true);
    spring.updateCrops(0, 'winter');
    const toSpring = crossSeason('winter', 'spring');
    spring.witherOnSeasonAdvance(toSpring.current.season);
    expect(spring.getCropAt(0, 0)?.stage).toBe(CropStage.SEED);
  });

  it('does not wither on a day that stays inside the season', () => {
    const crops = new CropSystem();
    expect(crops.plantCrop(0, 0, 'corn')).toBe(true);
    crops.updateCrops(0, 'summer');

    const time = new TimeSystem();
    time.setSeasonCalendar('summer', 10);
    const advance = time.advanceSeasonCalendar();
    expect(advance.seasonChanged).toBe(false);
    expect(advance.current).toEqual({ season: 'summer', day: 11 });
    crops.updateCrops(0, advance.current.season);
    expect(crops.getCropAt(0, 0)?.stage).toBe(CropStage.SEED);
  });

  it('keeps harvestable wheat across summer 28 → autumn 1', () => {
    const crops = new CropSystem();
    expect(crops.plantCrop(1, 0, 'wheat')).toBe(true);
    growUntilHarvestable(crops, 1, 0);

    const advance = crossSeason('summer', 'autumn');
    crops.witherOnSeasonAdvance(advance.current.season);

    expect(crops.getCropAt(1, 0)?.stage).toBe(CropStage.HARVESTABLE);
    expect(crops.harvestCrop(1, 0).success).toBe(true);
  });

  it('withers harvestable corn on summer 28 → autumn 1 and yields nothing', () => {
    const crops = new CropSystem();
    expect(crops.plantCrop(0, 0, 'corn')).toBe(true);
    growUntilHarvestable(crops, 0, 0);

    const advance = crossSeason('summer', 'autumn');
    crops.witherOnSeasonAdvance(advance.current.season);

    expect(crops.getCropAt(0, 0)?.stage).toBe(CropStage.DEAD);
    expect(crops.harvestCrop(0, 0).success).toBe(false);
    expect(crops.harvestCrop(0, 0).yield).toBeUndefined();
    expect(crops.getCropAt(0, 0)).not.toBeNull();
  });
});
