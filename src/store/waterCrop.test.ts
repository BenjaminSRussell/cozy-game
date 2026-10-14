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

const plotId = 'plot_water_test';

function cropAt(waterLevel: number): Crop {
  return {
    id: 'crop_water_test',
    type: 'carrot',
    stage: CropStage.GROWING,
    position: { x: 5, y: 6 },
    plantedTime: 1,
    waterLevel,
    health: 77,
  };
}

function setPlot(waterLevel: number) {
  const plot: FarmPlot = {
    id: plotId,
    position: { x: 5, y: 6 },
    size: { x: 1, y: 1 },
    tilled: true,
    tilledAt: 1,
    crop: cropAt(waterLevel),
  };
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, farmPlots: [plot] } };
  });
}

function plotCrop() {
  return useGameStore.getState().world?.farmPlots.find((plot) => plot.id === plotId)?.crop;
}

describe('waterCrop', () => {
  it.each([
    [80, 100],
    [0, 30],
    [100, 100],
  ])('waterLevel %i becomes %i', (start, expected) => {
    useGameStore.getState().createNewGame('Waterer');
    setPlot(start);
    const before = plotCrop();

    useGameStore.getState().waterCrop(plotId);

    const after = plotCrop();
    expect(after?.waterLevel).toBe(expected);
    expect(after).toEqual({ ...before, waterLevel: expected });
  });

  it('does not leave waterLevel at 110 when starting from 80', () => {
    useGameStore.getState().createNewGame('Waterer');
    setPlot(80);

    useGameStore.getState().waterCrop(plotId);

    expect(plotCrop()?.waterLevel).toBe(100);
    expect(plotCrop()?.waterLevel).not.toBe(110);
  });
});
