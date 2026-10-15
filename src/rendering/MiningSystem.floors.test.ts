import { describe, expect, it } from 'vitest';
import type { MineFloor, MineTile } from '../types/game';
import {
  MINE_FLOOR_SIZE,
  MINE_MAX_FLOOR,
  extractMineOre,
  generateMineFloor,
  mineFloorOreSpawns,
  smashMineRock,
} from './MiningSystem';

/** Mulberry32, a small seeded PRNG, so the distribution checks are repeatable. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A floor where every interior cell is open ground: a 0.99 roll is no ore and no boulder. */
function openFloor(depth = 5): MineFloor {
  return generateMineFloor(depth, () => 0.99);
}

function tileAt(floor: MineFloor, x: number, y: number): MineTile {
  const tile = floor.tiles[y * floor.width + x];
  if (!tile) throw new Error(`no cell at ${x},${y}`);
  return tile;
}

function placeTiles(floor: MineFloor, cells: Array<[number, number, MineTile]>): MineFloor {
  const tiles = floor.tiles.slice();
  for (const [x, y, tile] of cells) {
    tiles[y * floor.width + x] = tile;
  }
  return { ...floor, tiles };
}

/** Share of interior cells (the walled border is excluded) whose tile matches. */
function interiorShare(floors: MineFloor[], matches: (tile: MineTile) => boolean): number {
  let cells = 0;
  let hits = 0;
  for (const floor of floors) {
    for (let y = 1; y < floor.height - 1; y++) {
      for (let x = 1; x < floor.width - 1; x++) {
        cells += 1;
        if (matches(tileAt(floor, x, y))) hits += 1;
      }
    }
  }
  return hits / cells;
}

function sampleFloors(depth: number, count: number): MineFloor[] {
  return Array.from({ length: count }, (_, index) => generateMineFloor(depth, seededRandom(1000 + index)));
}

describe('mineFloorOreSpawns', () => {
  it('uses the spec table for each depth band', () => {
    expect(mineFloorOreSpawns(1)).toEqual([
      { oreType: 'copper', chance: 0.15 },
      { oreType: 'coal', chance: 0.1 },
    ]);
    expect(mineFloorOreSpawns(10)).toEqual([
      { oreType: 'iron', chance: 0.15 },
      { oreType: 'topaz', chance: 0.025 },
      { oreType: 'amethyst', chance: 0.025 },
    ]);
    expect(mineFloorOreSpawns(20)).toEqual([
      { oreType: 'gold', chance: 0.15 },
      { oreType: 'diamond', chance: 0.015 },
      { oreType: 'ruby', chance: 0.015 },
    ]);
  });

  it('switches bands exactly at floors 10 and 20', () => {
    expect(mineFloorOreSpawns(9).map((spawn) => spawn.oreType)).toEqual(['copper', 'coal']);
    expect(mineFloorOreSpawns(19).map((spawn) => spawn.oreType)).toEqual(['iron', 'topaz', 'amethyst']);
    expect(mineFloorOreSpawns(25).map((spawn) => spawn.oreType)).toEqual(['gold', 'diamond', 'ruby']);
  });
});

describe('generateMineFloor', () => {
  it('builds an 18x18 cavern with a solid wall border and no ladder yet', () => {
    const floor = generateMineFloor(4, seededRandom(1));

    expect(floor.depth).toBe(4);
    expect(floor.width).toBe(MINE_FLOOR_SIZE);
    expect(floor.height).toBe(MINE_FLOOR_SIZE);
    expect(floor.tiles).toHaveLength(MINE_FLOOR_SIZE * MINE_FLOOR_SIZE);
    expect(floor.ladder).toBeNull();

    const last = MINE_FLOOR_SIZE - 1;
    for (let i = 0; i < MINE_FLOOR_SIZE; i++) {
      expect(tileAt(floor, i, 0).kind).toBe('wall');
      expect(tileAt(floor, i, last).kind).toBe('wall');
      expect(tileAt(floor, 0, i).kind).toBe('wall');
      expect(tileAt(floor, last, i).kind).toBe('wall');
    }
  });

  it('scatters boulders, open ground and ore through the interior', () => {
    const floors = sampleFloors(3, 5);
    expect(interiorShare(floors, (tile) => tile.kind === 'boulder')).toBeGreaterThan(0);
    expect(interiorShare(floors, (tile) => tile.kind === 'floor')).toBeGreaterThan(0);
    expect(interiorShare(floors, (tile) => tile.kind === 'ore')).toBeGreaterThan(0);
  });

  it('places only the ores its depth band allows', () => {
    for (const depth of [1, 9, 10, 19, 20, 25]) {
      const allowed = mineFloorOreSpawns(depth).map((spawn) => spawn.oreType);
      const floor = generateMineFloor(depth, seededRandom(depth));
      const oreTiles = floor.tiles.filter((tile) => tile.kind === 'ore');

      expect(oreTiles.length).toBeGreaterThan(0);
      for (const tile of oreTiles) {
        expect(allowed).toContain(tile.oreType);
      }
    }
  });

  it('rolls the spec ore and boulder shares for each band', () => {
    const shallow = sampleFloors(5, 40);
    const middle = sampleFloors(15, 40);
    const deep = sampleFloors(22, 40);
    const oreIs = (oreType: string) => (tile: MineTile) => tile.kind === 'ore' && tile.oreType === oreType;

    expect(Math.abs(interiorShare(shallow, oreIs('copper')) - 0.15)).toBeLessThan(0.015);
    expect(Math.abs(interiorShare(shallow, oreIs('coal')) - 0.1)).toBeLessThan(0.012);
    expect(Math.abs(interiorShare(shallow, (tile) => tile.kind === 'boulder') - 0.12)).toBeLessThan(0.015);

    expect(Math.abs(interiorShare(middle, oreIs('iron')) - 0.15)).toBeLessThan(0.015);
    expect(Math.abs(interiorShare(middle, oreIs('topaz')) - 0.025)).toBeLessThan(0.008);
    expect(Math.abs(interiorShare(middle, oreIs('amethyst')) - 0.025)).toBeLessThan(0.008);
    expect(interiorShare(middle, oreIs('copper'))).toBe(0);

    expect(Math.abs(interiorShare(deep, oreIs('gold')) - 0.15)).toBeLessThan(0.015);
    expect(Math.abs(interiorShare(deep, oreIs('diamond')) - 0.015)).toBeLessThan(0.007);
    expect(Math.abs(interiorShare(deep, oreIs('ruby')) - 0.015)).toBeLessThan(0.007);
    expect(interiorShare(deep, oreIs('iron'))).toBe(0);
  });

  it('makes different layouts from different random streams', () => {
    expect(generateMineFloor(3, seededRandom(1)).tiles).not.toEqual(generateMineFloor(3, seededRandom(2)).tiles);
  });

  it('rejects depths outside 1 to 25', () => {
    expect(() => generateMineFloor(0)).toThrow(RangeError);
    expect(() => generateMineFloor(MINE_MAX_FLOOR + 1)).toThrow(RangeError);
    expect(() => generateMineFloor(2.5)).toThrow(RangeError);
    expect(() => mineFloorOreSpawns(0)).toThrow(RangeError);
  });
});

describe('smashMineRock', () => {
  it('leaves the floor unchanged when the cell is not a boulder', () => {
    const floor = openFloor();
    const result = smashMineRock(floor, 5, 5, () => 0);

    expect(result.smashed).toBe(false);
    expect(result.ladderRevealed).toBe(false);
    expect(result.floor).toBe(floor);
  });

  it('ignores cells off the floor', () => {
    const floor = placeTiles(openFloor(), [[1, 1, { kind: 'boulder' }]]);

    expect(smashMineRock(floor, -1, 1, () => 0).smashed).toBe(false);
    expect(smashMineRock(floor, MINE_FLOOR_SIZE, 1, () => 0).smashed).toBe(false);
    expect(smashMineRock(floor, 1.5, 1, () => 0).smashed).toBe(false);
  });

  it('clears the boulder and reveals the ladder on a roll under 10%', () => {
    const floor = placeTiles(openFloor(), [
      [5, 5, { kind: 'boulder' }],
      [6, 5, { kind: 'boulder' }],
    ]);
    const result = smashMineRock(floor, 5, 5, () => 0.05);

    expect(result.smashed).toBe(true);
    expect(result.ladderRevealed).toBe(true);
    expect(result.floor.ladder).toEqual({ x: 5, y: 5 });
    expect(tileAt(result.floor, 5, 5).kind).toBe('floor');
    expect(tileAt(result.floor, 6, 5).kind).toBe('boulder');
    expect(tileAt(floor, 5, 5).kind).toBe('boulder');
  });

  it('keeps the ladder hidden when the roll misses and boulders remain', () => {
    const floor = placeTiles(openFloor(), [
      [5, 5, { kind: 'boulder' }],
      [6, 5, { kind: 'boulder' }],
    ]);

    // Exactly 0.1 is a miss: the roll must be strictly under the chance.
    const result = smashMineRock(floor, 5, 5, () => 0.1);
    expect(result.smashed).toBe(true);
    expect(result.ladderRevealed).toBe(false);
    expect(result.floor.ladder).toBeNull();
  });

  it('reveals the ladder on the last boulder even when every roll missed', () => {
    const floor = placeTiles(openFloor(), [[4, 4, { kind: 'boulder' }]]);
    const result = smashMineRock(floor, 4, 4, () => 0.99);

    expect(result.ladderRevealed).toBe(true);
    expect(result.floor.ladder).toEqual({ x: 4, y: 4 });
  });

  it('never reveals a ladder on the deepest floor', () => {
    const floor = placeTiles(openFloor(MINE_MAX_FLOOR), [[4, 4, { kind: 'boulder' }]]);
    const result = smashMineRock(floor, 4, 4, () => 0);

    expect(result.smashed).toBe(true);
    expect(result.ladderRevealed).toBe(false);
    expect(result.floor.ladder).toBeNull();
  });

  it('keeps a ladder that is already revealed', () => {
    const base = placeTiles(openFloor(), [
      [4, 4, { kind: 'boulder' }],
      [5, 5, { kind: 'boulder' }],
    ]);
    const floor = { ...base, ladder: { x: 2, y: 2 } };
    const result = smashMineRock(floor, 4, 4, () => 0);

    expect(result.ladderRevealed).toBe(false);
    expect(result.floor.ladder).toEqual({ x: 2, y: 2 });
  });
});

describe('extractMineOre', () => {
  it('mines the vein and opens the cell', () => {
    const floor = placeTiles(openFloor(20), [[3, 3, { kind: 'ore', oreType: 'gold' }]]);
    const result = extractMineOre(floor, 3, 3);

    expect(result.oreType).toBe('gold');
    expect(tileAt(result.floor, 3, 3).kind).toBe('floor');
    expect(tileAt(floor, 3, 3)).toEqual({ kind: 'ore', oreType: 'gold' });
  });

  it('returns null and the same floor for cells without a vein', () => {
    const floor = placeTiles(openFloor(), [[3, 3, { kind: 'boulder' }]]);

    const onFloor = extractMineOre(floor, 2, 2);
    expect(onFloor.oreType).toBeNull();
    expect(onFloor.floor).toBe(floor);

    const onBoulder = extractMineOre(floor, 3, 3);
    expect(onBoulder.oreType).toBeNull();
    expect(onBoulder.floor).toBe(floor);
  });
});
