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

import { CropStage, type FarmPlot } from '../types/game';
import { useGameStore } from './gameStore';

const plotId = 'plot_harvest_test';

function harvestablePlot(): FarmPlot {
  return {
    id: plotId,
    position: { x: 1, y: 2 },
    size: { x: 1, y: 1 },
    tilled: true,
    tilledAt: 1,
    crop: {
      id: 'crop_harvest_test',
      type: 'carrot',
      stage: CropStage.HARVESTABLE,
      position: { x: 1, y: 2 },
      plantedTime: 1,
      waterLevel: 100,
      health: 100,
    },
  };
}

function plotCrop() {
  return useGameStore.getState().world?.farmPlots.find((plot) => plot.id === plotId)?.crop;
}

describe('harvestCrop', () => {
  it('sets the plot crop to null so wheat can be planted immediately', () => {
    useGameStore.getState().createNewGame('Harvester');
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return { world: { ...state.world, farmPlots: [harvestablePlot()] } };
    });

    const experienceBefore = useGameStore.getState().world?.player.experience;
    const inventoryBefore = useGameStore.getState().world?.player.inventory.length ?? 0;

    useGameStore.getState().harvestCrop(plotId);

    expect(plotCrop()).toBeNull();
    expect(useGameStore.getState().world?.player.inventory.length).toBe(inventoryBefore + 1);
    expect(useGameStore.getState().world?.player.experience).toBe(experienceBefore);

    useGameStore.getState().plantCrop(plotId, 'wheat');

    const replanted = plotCrop();
    expect(replanted?.type).toBe('wheat');
    expect(replanted?.stage).toBe(CropStage.SEED);
  });

  it('returns early when the plot crop is already null', () => {
    useGameStore.getState().createNewGame('Harvester');
    const empty: FarmPlot = { ...harvestablePlot(), crop: null };
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return { world: { ...state.world, farmPlots: [empty] } };
    });

    const inventoryBefore = useGameStore.getState().world?.player.inventory.map((item) => ({ ...item }));

    useGameStore.getState().harvestCrop(plotId);

    expect(plotCrop()).toBeNull();
    expect(useGameStore.getState().world?.player.inventory).toEqual(inventoryBefore);
  });
});
