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

import { CropStage, ToolType, type Crop, type FarmPlot } from '../types/game';
import { useGameStore } from './gameStore';

function plot(id: string, x: number, y: number, crop?: Crop): FarmPlot {
  return {
    id,
    position: { x, y },
    size: { x: 1, y: 1 },
    tilled: true,
    tilledAt: 1,
    ...(crop ? { crop } : {}),
  };
}

function crop(id: string, waterLevel: number, stage: CropStage = CropStage.GROWING): Crop {
  return {
    id: `crop_${id}`,
    type: 'carrot',
    stage,
    position: { x: 0, y: 0 },
    plantedTime: 1,
    waterLevel,
    health: 77,
  };
}

function setPlots(farmPlots: FarmPlot[]) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, farmPlots } };
  });
}

function setStamina(stamina: number) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        player: { ...state.world.player, stamina },
      },
    };
  });
}

function farmPlots(): FarmPlot[] {
  return useGameStore.getState().world?.farmPlots ?? [];
}

function durabilityOf(tool: ToolType): number | undefined {
  return useGameStore.getState().world?.player.tools[tool]?.durability;
}

function cellsOf(plots: FarmPlot[]): string[] {
  return plots.map((entry) => `${entry.position.x},${entry.position.y}`).sort();
}

describe('applyToolArea till', () => {
  it('tills every open cell in one state update for one swing of durability', () => {
    useGameStore.getState().createNewGame('Hoer');
    setPlots([plot('plot_existing', 11, 10)]);
    const hoeBefore = durabilityOf(ToolType.HOE) ?? 0;
    const updates = vi.fn();
    const unsubscribe = useGameStore.subscribe(updates);

    const changed = useGameStore.getState().applyToolArea(
      [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }],
      'till',
    );
    unsubscribe();

    expect(changed).toBe(2);
    expect(updates).toHaveBeenCalledTimes(1);
    expect(cellsOf(farmPlots())).toEqual(['10,10', '11,10', '12,10']);
    expect(farmPlots().find((entry) => entry.id === 'plot_existing')).toBeDefined();
    expect(new Set(farmPlots().map((entry) => entry.id)).size).toBe(farmPlots().length);
    expect(durabilityOf(ToolType.HOE)).toBe(hoeBefore - 1);
  });

  it('never tills a cell outside the map', () => {
    useGameStore.getState().createNewGame('Hoer');
    setPlots([]);
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return { world: { ...state.world, mapSize: { x: 20, y: 20 } } };
    });

    const changed = useGameStore.getState().applyToolArea(
      [{ x: -1, y: 5 }, { x: 5, y: 5 }, { x: 20, y: 5 }],
      'till',
    );

    expect(changed).toBe(1);
    expect(cellsOf(farmPlots())).toEqual(['5,5']);
  });

  it('spends nothing when every cell is already tilled', () => {
    useGameStore.getState().createNewGame('Hoer');
    setPlots([plot('a', 10, 10), plot('b', 11, 10)]);
    const hoeBefore = durabilityOf(ToolType.HOE);

    const changed = useGameStore.getState().applyToolArea(
      [{ x: 10, y: 10 }, { x: 11, y: 10 }],
      'till',
    );

    expect(changed).toBe(0);
    expect(farmPlots()).toHaveLength(2);
    expect(durabilityOf(ToolType.HOE)).toBe(hoeBefore);
  });
});

describe('applyToolArea water', () => {
  it('waters only living crops inside the area, capped at 100, for one can swing', () => {
    useGameStore.getState().createNewGame('Waterer');
    setPlots([
      plot('in_a', 10, 10, crop('a', 80)),
      plot('in_b', 11, 10, crop('b', 40)),
      plot('outside', 14, 10, crop('c', 40)),
      plot('dead', 12, 10, crop('d', 40, CropStage.DEAD)),
      plot('bare', 13, 10),
    ]);
    const canBefore = durabilityOf(ToolType.WATERING_CAN) ?? 0;

    const changed = useGameStore.getState().applyToolArea(
      [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }, { x: 13, y: 10 }],
      'water',
    );

    expect(changed).toBe(2);
    const water = Object.fromEntries(farmPlots().map((entry) => [entry.id, entry.crop?.waterLevel]));
    expect(water).toEqual({ in_a: 100, in_b: 70, outside: 40, dead: 40, bare: undefined });
    expect(durabilityOf(ToolType.WATERING_CAN)).toBe(canBefore - 1);
  });

  it('spends nothing when no living crop sits in the area', () => {
    useGameStore.getState().createNewGame('Waterer');
    setPlots([plot('bare', 10, 10)]);
    const canBefore = durabilityOf(ToolType.WATERING_CAN);

    expect(useGameStore.getState().applyToolArea([{ x: 10, y: 10 }], 'water')).toBe(0);
    expect(durabilityOf(ToolType.WATERING_CAN)).toBe(canBefore);
  });

  it('refuses the whole area when stamina is empty', () => {
    useGameStore.getState().createNewGame('Waterer');
    setStamina(0);
    setPlots([plot('a', 10, 10, crop('a', 40))]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(useGameStore.getState().applyToolArea([{ x: 10, y: 10 }], 'water')).toBe(0);
    expect(farmPlots()[0]?.crop?.waterLevel).toBe(40);
    log.mockRestore();
  });
});
