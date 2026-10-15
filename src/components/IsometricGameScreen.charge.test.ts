import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const memory = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, String(value));
    },
    removeItem: (key) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
    key: (index) => Array.from(memory.keys())[index] ?? null,
    get length() {
      return memory.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
});

vi.mock('react-native', () => ({
  View: () => null,
  Text: () => null,
  TouchableOpacity: () => null,
  Pressable: () => null,
  ScrollView: () => null,
  Image: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  Dimensions: { get: () => ({ width: 800, height: 600 }) },
  Alert: { alert: () => undefined },
  Platform: { OS: 'web' },
  Animated: {
    View: () => null,
    Value: class AnimatedValue {
      constructor(public value: number) {}
    },
    spring: () => ({ start() {} }),
  },
}));

import {
  CHARGE_DRAG_TOLERANCE_PX,
  DEFAULT_CHARGE_FACING,
  chargeActionFor,
  chargeAreaFor,
  chargeDragged,
  chargeSpecForHold,
  facingFromVelocity,
  sameGridCells,
  type GridCell,
  type GridFacing,
} from './IsometricGameScreen';

const origin: GridCell = { x: 10, y: 10 };
const EAST: GridFacing = { x: 1, y: 0 };
const WEST: GridFacing = { x: -1, y: 0 };
const NORTH: GridFacing = { x: 0, y: -1 };
const SOUTH: GridFacing = { x: 0, y: 1 };

function keysOf(cells: readonly GridCell[]): string[] {
  return cells.map((cell) => `${cell.x},${cell.y}`).sort();
}

describe('charge tiers by hold time', () => {
  it.each([
    [0, null],
    [799, null],
    [800, 'copper'],
    [1499, 'copper'],
    [1500, 'steel'],
    [2199, 'steel'],
    [2200, 'gold'],
    [2999, 'gold'],
    [3000, 'iridium'],
    [60_000, 'iridium'],
    [Number.NaN, null],
  ])('a %s ms hold reaches %s', (holdMs, tier) => {
    expect(chargeSpecForHold(holdMs)?.tier ?? null).toBe(tier);
  });
});

describe('charge areas measured from the player', () => {
  it('copper is a 1x3 line ahead of the player', () => {
    expect(chargeAreaFor(800, origin, EAST)).toEqual({
      tier: 'copper',
      cells: [{ x: 11, y: 10 }, { x: 12, y: 10 }, { x: 13, y: 10 }],
    });
  });

  it('steel is a 1x5 line ahead of the player, facing north', () => {
    const { cells } = chargeAreaFor(1500, origin, NORTH);
    expect(cells.map((cell) => cell.y)).toEqual([9, 8, 7, 6, 5]);
    expect(cells.every((cell) => cell.x === 10)).toBe(true);
  });

  it('gold is a 3x3 grid centered on the tile in front', () => {
    const { cells } = chargeAreaFor(2200, origin, EAST);
    const expected: GridCell[] = [];
    for (const x of [10, 11, 12]) {
      for (const y of [9, 10, 11]) expected.push({ x, y });
    }
    expect(cells).toHaveLength(9);
    expect(keysOf(cells)).toEqual(keysOf(expected));
    expect(cells.some((cell) => cell.x === 11 && cell.y === 10)).toBe(true);
  });

  it('gold facing west is centered on the tile in front of the player', () => {
    const { cells } = chargeAreaFor(2200, origin, WEST);
    const expected: GridCell[] = [];
    for (const x of [8, 9, 10]) {
      for (const y of [9, 10, 11]) expected.push({ x, y });
    }
    expect(keysOf(cells)).toEqual(keysOf(expected));
  });

  it('iridium is a 3x6 grid that starts at the tile in front and never covers the player tile', () => {
    const { cells } = chargeAreaFor(3000, origin, SOUTH);
    expect(cells).toHaveLength(18);
    expect(Math.min(...cells.map((cell) => cell.y))).toBe(11);
    expect(Math.max(...cells.map((cell) => cell.y))).toBe(16);
    expect(Math.min(...cells.map((cell) => cell.x))).toBe(9);
    expect(Math.max(...cells.map((cell) => cell.x))).toBe(11);
    expect(cells.some((cell) => cell.x === 10 && cell.y === 10)).toBe(false);
  });

  it('a 1x3 line facing west runs along -x', () => {
    const { cells } = chargeAreaFor(800, origin, WEST);
    expect(cells.map((cell) => cell.x)).toEqual([9, 8, 7]);
    expect(cells.every((cell) => cell.y === 10)).toBe(true);
  });

  it('no hold means no area at all', () => {
    expect(chargeAreaFor(799, origin, EAST)).toEqual({ tier: null, cells: [] });
  });
});

describe('charge facing', () => {
  it('turns to the dominant axis of motion', () => {
    expect(facingFromVelocity(3, 1, DEFAULT_CHARGE_FACING)).toEqual({ x: 1, y: 0 });
    expect(facingFromVelocity(-2, 0.5, DEFAULT_CHARGE_FACING)).toEqual({ x: -1, y: 0 });
    expect(facingFromVelocity(0.2, -4, DEFAULT_CHARGE_FACING)).toEqual({ x: 0, y: -1 });
  });

  it('a player who is still keeps the last facing', () => {
    expect(facingFromVelocity(0.001, -0.004, WEST)).toEqual(WEST);
  });

  it('a tie goes to the x axis', () => {
    expect(facingFromVelocity(2, -2, DEFAULT_CHARGE_FACING)).toEqual({ x: 1, y: 0 });
  });
});

describe('charge action and drag rule', () => {
  it('plant charges the hoe, water charges the can, and other actions do not charge', () => {
    expect(chargeActionFor('plant')).toBe('till');
    expect(chargeActionFor('water')).toBe('water');
    expect(chargeActionFor('harvest')).toBeNull();
    expect(chargeActionFor(null)).toBeNull();
  });

  it('a press that stays inside the tolerance is not a drag', () => {
    const start = { x: 100, y: 100 };
    expect(chargeDragged(start, { x: 100 + CHARGE_DRAG_TOLERANCE_PX, y: 100 })).toBe(false);
    expect(chargeDragged(start, { x: 100 + CHARGE_DRAG_TOLERANCE_PX + 1, y: 100 })).toBe(true);
  });

  it('compares cells in order so an unchanged area does not repaint', () => {
    const first = chargeAreaFor(800, origin, EAST).cells;
    expect(sameGridCells(first, chargeAreaFor(900, origin, EAST).cells)).toBe(true);
    expect(sameGridCells(first, chargeAreaFor(800, origin, WEST).cells)).toBe(false);
    expect(sameGridCells(first, first.slice(1))).toBe(false);
  });
});
