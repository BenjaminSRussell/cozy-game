import { describe, expect, it } from 'vitest';
import { DIRT_BURST_GRAINS, DIRT_BURST_LIFE_SECONDS, DirtBurstSystem } from './DirtBurst';

const FRAME = 1 / 60;

describe('DirtBurstSystem', () => {
  it('throws a grain burst up from the centre of the tile', () => {
    const burst = new DirtBurstSystem(() => 0.5);

    burst.spawn(3, 4);

    const grains = burst.getGrains();
    expect(grains).toHaveLength(DIRT_BURST_GRAINS);
    for (const grain of grains) {
      expect(grain).toMatchObject({ x: 3, y: 4, z: 0, life: DIRT_BURST_LIFE_SECONDS });
      expect(grain.vz).toBeGreaterThan(0);
    }
  });

  it('keeps every grain on or above the ground while it is in the air', () => {
    const burst = new DirtBurstSystem(() => 0.9);
    burst.spawn(1, 1);

    for (let frame = 0; frame < 30; frame++) {
      burst.update(FRAME);
      for (const grain of burst.getGrains()) {
        expect(grain.z).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('removes every grain once its life has run out', () => {
    const burst = new DirtBurstSystem(() => 0.5);
    burst.spawn(1, 1);

    burst.update(DIRT_BURST_LIFE_SECONDS / 2);
    expect(burst.getGrains()).toHaveLength(DIRT_BURST_GRAINS);

    burst.update(DIRT_BURST_LIFE_SECONDS);
    expect(burst.getGrains()).toHaveLength(0);
  });
});
