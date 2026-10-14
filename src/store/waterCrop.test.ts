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

const plotId = 'plot_water_test';

function cropAt(waterLevel: number, stage: CropStage = CropStage.GROWING): Crop {
  return {
    id: 'crop_water_test',
    type: 'carrot',
    stage,
    position: { x: 5, y: 6 },
    plantedTime: 1,
    waterLevel,
    health: 77,
  };
}

function setPlot(waterLevel: number, stage: CropStage = CropStage.GROWING) {
  const plot: FarmPlot = {
    id: plotId,
    position: { x: 5, y: 6 },
    size: { x: 1, y: 1 },
    tilled: true,
    tilledAt: 1,
    crop: cropAt(waterLevel, stage),
  };
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, farmPlots: [plot] } };
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

  it('waters a living stage 2 crop and leaves stamina unchanged', () => {
    useGameStore.getState().createNewGame('Waterer');
    setStamina(64);
    setPlot(50, CropStage.GROWING);
    const before = plotCrop();
    expect(before?.stage).toBe(2);

    useGameStore.getState().waterCrop(plotId);

    const after = plotCrop();
    expect(after?.waterLevel).toBe(Math.min(100, 50 + 30));
    expect(after).toEqual({ ...before, waterLevel: 80 });
    expect(useGameStore.getState().world?.player.stamina).toBe(64);
  });

  it('returns silently for a dead crop without changing stamina or waterLevel', () => {
    useGameStore.getState().createNewGame('Waterer');
    setStamina(64);
    setPlot(40, CropStage.DEAD);
    const before = plotCrop();
    const canBefore = useGameStore.getState().world?.player.tools[ToolType.WATERING_CAN]?.durability;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    useGameStore.getState().waterCrop(plotId);

    expect(plotCrop()).toBe(before);
    expect(plotCrop()?.waterLevel).toBe(40);
    expect(plotCrop()?.stage).toBe(CropStage.DEAD);
    expect(useGameStore.getState().world?.player.stamina).toBe(64);
    expect(useGameStore.getState().world?.player.tools[ToolType.WATERING_CAN]?.durability).toBe(canBefore);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
