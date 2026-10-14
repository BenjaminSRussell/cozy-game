import { describe, expect, it, vi } from 'vitest';

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

import { CropStage, ItemType, type Crop, type FarmPlot, type Item } from '../types/game';
import { useGameStore } from './gameStore';

function cropAt(position: { x: number; y: number }): Crop {
  return {
    id: `crop_${position.x}_${position.y}`,
    type: 'wheat',
    stage: CropStage.GROWING,
    position,
    plantedTime: 1,
    waterLevel: 80,
    health: 90,
  };
}

function plotAt(id: string, position: { x: number; y: number }, crop: Crop | null): FarmPlot {
  return {
    id,
    position,
    size: { x: 1, y: 1 },
    tilled: true,
    tilledAt: 1,
    crop,
  };
}

const speedFertilizer: Item = {
  id: 'fertilizer_speed',
  name: 'Speed-Grow',
  type: ItemType.DECORATION,
  quantity: 5,
  sellValue: 10,
  spriteId: 'fertilizer_speed',
  rarity: 'common',
};

function setPlots(plots: FarmPlot[], inventory?: Item[]) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        farmPlots: plots,
        player: inventory
          ? { ...state.world.player, inventory }
          : state.world.player,
      },
    };
  });
}

describe('applyFertilizer', () => {
  it('finds the plot at (3, 5) and applies speed fertilizer', () => {
    useGameStore.getState().createNewGame('Farmer');
    const target = plotAt('plot_1700000000000', { x: 3.4, y: 5.2 }, cropAt({ x: 3.4, y: 5.2 }));
    const derivedId = plotAt('plot_3_5', { x: 0, y: 0 }, cropAt({ x: 0, y: 0 }));
    setPlots([derivedId, target], [speedFertilizer]);
    const beforeCrop = { ...target.crop };

    useGameStore.getState().applyFertilizer({ x: 3, y: 5 }, 'speed');

    const plots = useGameStore.getState().world?.farmPlots ?? [];
    const fertilized = plots.find((plot) => plot.id === 'plot_1700000000000');
    const untouched = plots.find((plot) => plot.id === 'plot_3_5');
    expect(Math.floor(target.position.x)).toBe(3);
    expect(Math.floor(target.position.y)).toBe(5);
    expect(fertilized?.fertilizerType).toBe('speed');
    expect(fertilized?.crop).toEqual(beforeCrop);
    expect(untouched?.fertilizerType).toBeUndefined();
    expect(useGameStore.getState().world?.player.inventory.find((item) => item.id === 'fertilizer_speed')?.quantity).toBe(4);
  });

  it('is a no-op and does not throw when no plot matches', () => {
    useGameStore.getState().createNewGame('Farmer');
    const bare = plotAt('plot_empty', { x: 8, y: 8 }, null);
    const other = plotAt('plot_other', { x: 1, y: 2 }, cropAt({ x: 1, y: 2 }));
    setPlots([bare, other], [speedFertilizer]);
    const before = useGameStore.getState().world?.farmPlots;
    const inventoryBefore = useGameStore.getState().world?.player.inventory;

    expect(() => {
      useGameStore.getState().applyFertilizer({ x: 3, y: 5 }, 'speed');
    }).not.toThrow();
    expect(useGameStore.getState().world?.farmPlots).toBe(before);
    expect(useGameStore.getState().world?.player.inventory).toBe(inventoryBefore);

    expect(() => {
      useGameStore.getState().applyFertilizer({ x: 8, y: 8 }, 'quality');
    }).not.toThrow();
    expect(useGameStore.getState().world?.farmPlots.find((plot) => plot.id === 'plot_empty')?.fertilizerType).toBeUndefined();
    expect(useGameStore.getState().world?.farmPlots).toBe(before);
    expect(useGameStore.getState().world?.player.inventory).toBe(inventoryBefore);
  });
});
