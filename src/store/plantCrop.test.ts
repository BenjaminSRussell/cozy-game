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

import { CropStage, type Crop, type FarmPlot } from '../types/game';
import { useGameStore } from './gameStore';

const plotId = 'plot_plant_test';

function plotWith(crop: Crop | null): FarmPlot {
  return {
    id: plotId,
    position: { x: 3, y: 4 },
    size: { x: 1, y: 1 },
    tilled: true,
    tilledAt: 1,
    crop,
  };
}

function livingCrop(): Crop {
  return {
    id: 'crop_living',
    type: 'carrot',
    stage: CropStage.GROWING,
    position: { x: 3, y: 4 },
    plantedTime: 1,
    waterLevel: 80,
    health: 90,
  };
}

function deadCrop(): Crop {
  return {
    id: 'crop_dead',
    type: 'carrot',
    stage: CropStage.DEAD,
    position: { x: 3, y: 4 },
    plantedTime: 1,
    waterLevel: 0,
    health: 0,
  };
}

function setOnlyPlot(plot: FarmPlot) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, farmPlots: [plot] } };
  });
}

function plotCrop() {
  return useGameStore.getState().world?.farmPlots.find((plot) => plot.id === plotId)?.crop;
}

describe('plantCrop', () => {
  it('returns early and leaves a living crop unchanged', () => {
    useGameStore.getState().createNewGame('Planter');
    const crop = livingCrop();
    setOnlyPlot(plotWith(crop));

    const worldBefore = useGameStore.getState().world;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    useGameStore.getState().plantCrop(plotId, 'wheat');

    expect(useGameStore.getState().world).toBe(worldBefore);
    expect(plotCrop()).toBe(crop);
    expect(plotCrop()?.type).toBe('carrot');
    expect(plotCrop()?.stage).toBe(CropStage.GROWING);
    expect(log).toHaveBeenCalledWith('This plot already has a crop!');
    log.mockRestore();
  });

  it('replaces a dead crop with the new planting', () => {
    useGameStore.getState().createNewGame('Planter');
    setOnlyPlot(plotWith(deadCrop()));

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    useGameStore.getState().plantCrop(plotId, 'wheat');

    const planted = plotCrop();
    expect(planted?.id).not.toBe('crop_dead');
    expect(planted?.type).toBe('wheat');
    expect(planted?.stage).toBe(CropStage.SEED);
    expect(planted?.waterLevel).toBe(100);
    expect(planted?.health).toBe(100);
    expect(log).not.toHaveBeenCalledWith('This plot already has a crop!');
    log.mockRestore();
  });

  it('plants on an empty plot', () => {
    useGameStore.getState().createNewGame('Planter');
    setOnlyPlot(plotWith(null));

    useGameStore.getState().plantCrop(plotId, 'wheat');

    const planted = plotCrop();
    expect(planted?.type).toBe('wheat');
    expect(planted?.stage).toBe(CropStage.SEED);
    expect(planted?.waterLevel).toBe(100);
    expect(planted?.health).toBe(100);
  });
});
