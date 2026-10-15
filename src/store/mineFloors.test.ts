import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Node's experimental localStorage has no methods unless --localstorage-file is set.
// The game store persists through it, so install a memory shim before the store loads.
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

import { MINE_FLOOR_SIZE, MINE_MAX_FLOOR, generateMineFloor } from '../rendering/MiningSystem';
import { ItemType, ToolTier, ToolType, type Item, type MineFloor, type MineTile, type Tool } from '../types/game';
import { createTool, useGameStore } from './gameStore';

/** Open ground everywhere inside the walls: a 0.99 roll is no ore and no boulder. */
function openFloor(depth: number): MineFloor {
  return generateMineFloor(depth, () => 0.99);
}

function placeTiles(floor: MineFloor, cells: Array<[number, number, MineTile]>): MineFloor {
  const tiles = floor.tiles.slice();
  for (const [x, y, tile] of cells) {
    tiles[y * floor.width + x] = tile;
  }
  return { ...floor, tiles };
}

function mineFloor(): MineFloor {
  const floor = useGameStore.getState().world?.mine?.floor;
  if (!floor) throw new Error('expected an open mine floor');
  return floor;
}

function setMineFloor(floor: MineFloor) {
  useGameStore.setState((state) => {
    if (!state.world?.mine) return state;
    return { world: { ...state.world, mine: { ...state.world.mine, floor } } };
  });
}

function equipPickaxe(durability: number) {
  const pickaxe: Tool = { ...createTool(ToolType.PICKAXE, ToolTier.WOOD), durability };
  useGameStore.setState((state) => {
    if (!state.world) return state;
    const inventory = [
      pickaxe,
      ...state.world.player.inventory.filter((item) => item.id !== pickaxe.id),
    ];
    return {
      world: {
        ...state.world,
        player: {
          ...state.world.player,
          inventory,
          tools: { ...state.world.player.tools, [pickaxe.toolType]: { ...pickaxe } },
        },
      },
    };
  });
}

function pickaxeDurability(): number | undefined {
  return useGameStore.getState().world?.player.tools[ToolType.PICKAXE]?.durability;
}

function inventoryItem(id: string): Item | undefined {
  return useGameStore.getState().world?.player.inventory.find((item) => item.id === id);
}

function startMine() {
  useGameStore.getState().createNewGame('Miner');
  equipPickaxe(50);
  useGameStore.getState().enterMine();
}

describe('mine floors in the store', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts outside the mine, and descend and smash do nothing there', () => {
    useGameStore.getState().createNewGame('Miner');
    expect(useGameStore.getState().world?.mine).toEqual({ currentFloor: 0, deepestFloor: 0, floor: null });

    useGameStore.getState().descendMine();
    useGameStore.getState().smashRock(5, 5);
    useGameStore.getState().mineVein(5, 5);
    expect(useGameStore.getState().world?.mine).toEqual({ currentFloor: 0, deepestFloor: 0, floor: null });
  });

  it('enterMine opens floor 1 and does nothing once underground', () => {
    useGameStore.getState().createNewGame('Miner');
    useGameStore.getState().enterMine();

    const mine = useGameStore.getState().world?.mine;
    expect(mine?.currentFloor).toBe(1);
    expect(mine?.deepestFloor).toBe(1);
    expect(mine?.floor?.depth).toBe(1);
    expect(mine?.floor?.tiles).toHaveLength(MINE_FLOOR_SIZE * MINE_FLOOR_SIZE);
    expect(mine?.floor?.ladder).toBeNull();

    useGameStore.getState().enterMine();
    expect(useGameStore.getState().world?.mine?.floor).toBe(mine?.floor);
  });

  it('refuses to descend until a smash has revealed the ladder', () => {
    startMine();
    useGameStore.getState().descendMine();
    expect(useGameStore.getState().world?.mine?.currentFloor).toBe(1);
  });

  it('reveals the ladder on a roll under 10%, then descends to the next floor', () => {
    startMine();
    setMineFloor(placeTiles(openFloor(1), [
      [5, 5, { kind: 'boulder' }],
      [6, 5, { kind: 'boulder' }],
    ]));

    const random = vi.spyOn(Math, 'random').mockReturnValue(0.05);
    useGameStore.getState().smashRock(5, 5);
    random.mockRestore();

    expect(mineFloor().ladder).toEqual({ x: 5, y: 5 });
    expect(mineFloor().tiles[5 * MINE_FLOOR_SIZE + 5]?.kind).toBe('floor');
    expect(pickaxeDurability()).toBe(49);

    useGameStore.getState().descendMine();
    const mine = useGameStore.getState().world?.mine;
    expect(mine?.currentFloor).toBe(2);
    expect(mine?.deepestFloor).toBe(2);
    expect(mine?.floor?.depth).toBe(2);
    expect(mine?.floor?.ladder).toBeNull();
  });

  it('keeps the ladder hidden on a missed roll, and the swing still costs durability', () => {
    startMine();
    setMineFloor(placeTiles(openFloor(1), [
      [5, 5, { kind: 'boulder' }],
      [6, 5, { kind: 'boulder' }],
    ]));

    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().smashRock(5, 5);
    random.mockRestore();

    expect(mineFloor().ladder).toBeNull();
    expect(mineFloor().tiles[5 * MINE_FLOOR_SIZE + 5]?.kind).toBe('floor');
    expect(mineFloor().tiles[5 * MINE_FLOOR_SIZE + 6]?.kind).toBe('boulder');
    expect(pickaxeDurability()).toBe(49);
  });

  it('ignores smashes on open ground and without a working pickaxe', () => {
    startMine();
    const floor = placeTiles(openFloor(1), [[5, 5, { kind: 'boulder' }]]);
    setMineFloor(floor);

    useGameStore.getState().smashRock(3, 3);
    expect(mineFloor()).toBe(floor);
    expect(pickaxeDurability()).toBe(50);

    equipPickaxe(0);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().smashRock(5, 5);
    random.mockRestore();

    expect(mineFloor()).toBe(floor);
    expect(mineFloor().ladder).toBeNull();
  });

  it('never descends past floor 25', () => {
    startMine();
    for (let depth = 1; depth < MINE_MAX_FLOOR; depth++) {
      setMineFloor({ ...mineFloor(), ladder: { x: 1, y: 1 } });
      useGameStore.getState().descendMine();
    }
    expect(useGameStore.getState().world?.mine?.currentFloor).toBe(MINE_MAX_FLOOR);

    setMineFloor({ ...mineFloor(), ladder: { x: 1, y: 1 } });
    useGameStore.getState().descendMine();

    const mine = useGameStore.getState().world?.mine;
    expect(mine?.currentFloor).toBe(MINE_MAX_FLOOR);
    expect(mine?.deepestFloor).toBe(MINE_MAX_FLOOR);
    expect(mine?.floor?.depth).toBe(MINE_MAX_FLOOR);
  });

  it('mineVein adds the ore to the inventory, opens the vein and costs one swing', () => {
    startMine();
    setMineFloor(placeTiles(openFloor(1), [[4, 4, { kind: 'ore', oreType: 'copper' }]]));

    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().mineVein(4, 4);
    random.mockRestore();

    expect(inventoryItem('copper')).toMatchObject({
      id: 'copper',
      name: 'Copper',
      type: ItemType.ORE,
      quantity: 1,
      sellValue: 25,
      rarity: 'common',
    });
    expect(mineFloor().tiles[4 * MINE_FLOOR_SIZE + 4]?.kind).toBe('floor');
    expect(pickaxeDurability()).toBe(49);
  });

  it('stacks repeat ore finds with the same id', () => {
    startMine();
    setMineFloor(placeTiles(openFloor(1), [
      [4, 4, { kind: 'ore', oreType: 'copper' }],
      [5, 5, { kind: 'ore', oreType: 'copper' }],
    ]));

    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.getState().mineVein(4, 4);
    random.mockReturnValue(0.99);
    useGameStore.getState().mineVein(5, 5);
    random.mockRestore();

    expect(inventoryItem('copper')?.quantity).toBe(4);
  });

  it('mineVein does nothing on boulders or open ground', () => {
    startMine();
    const floor = placeTiles(openFloor(1), [[5, 5, { kind: 'boulder' }]]);
    setMineFloor(floor);

    useGameStore.getState().mineVein(5, 5);
    useGameStore.getState().mineVein(3, 3);

    expect(mineFloor()).toBe(floor);
    expect(inventoryItem('copper')).toBeUndefined();
    expect(pickaxeDurability()).toBe(50);
  });
});
