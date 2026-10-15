import { describe, expect, it } from 'vitest';
import type { Building } from '../types/game';
import { FARMHOUSE_TYPE, createStartingFarmhouse, findFarmhouse, isNextToFarmhouse } from './farmhouseBed';

const garage: Building = {
  id: 'starting_garage',
  type: 'garage',
  position: { x: 55, y: 45, z: 0 },
  rotation: 0,
  unlocked: true,
  level: 1,
  spriteId: 'building_garage',
};

describe('farmhouse bed', () => {
  const farmhouse = createStartingFarmhouse();

  it('starts as a farmhouse the starting player is not beside', () => {
    expect(farmhouse.type).toBe(FARMHOUSE_TYPE);
    expect(isNextToFarmhouse({ x: 50.5, y: 50.5 }, farmhouse)).toBe(false);
  });

  it('finds the farmhouse among other buildings', () => {
    expect(findFarmhouse([garage, farmhouse])).toBe(farmhouse);
  });

  it('is undefined on a save that has no farmhouse', () => {
    expect(findFarmhouse([garage])).toBeUndefined();
    expect(findFarmhouse(undefined)).toBeUndefined();
  });

  it('counts the farmhouse tile and the eight tiles around it', () => {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        expect(isNextToFarmhouse({ x: 47 + dx + 0.5, y: 47 + dy + 0.5 }, farmhouse)).toBe(true);
      }
    }
  });

  it('does not count tiles two away', () => {
    expect(isNextToFarmhouse({ x: 45.5, y: 47.5 }, farmhouse)).toBe(false);
    expect(isNextToFarmhouse({ x: 49.5, y: 47.5 }, farmhouse)).toBe(false);
    expect(isNextToFarmhouse({ x: 47.5, y: 49.99 }, farmhouse)).toBe(false);
  });

  it('judges by the tile a fractional position sits in', () => {
    expect(isNextToFarmhouse({ x: 48.99, y: 48.99 }, farmhouse)).toBe(true);
    expect(isNextToFarmhouse({ x: 45.99, y: 45.99 }, farmhouse)).toBe(false);
  });
});
