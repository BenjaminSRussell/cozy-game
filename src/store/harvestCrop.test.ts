import { afterEach, describe, expect, it, vi } from 'vitest';

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

function seedPlot(plot: FarmPlot) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, farmPlots: [plot] } };
  });
}

describe('harvestCrop bag result', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [0.01, 'gold'],
    [0.3, 'silver'],
    [0.99, 'normal'],
  ] as Array<[number, 'gold' | 'silver' | 'normal']>)(
    'rolls %s into %s quality and returns the item it put in the bag',
    (roll, quality) => {
      useGameStore.getState().createNewGame('Harvester');
      seedPlot(harvestablePlot());
      vi.spyOn(Math, 'random').mockReturnValue(roll);

      const harvested = useGameStore.getState().harvestCrop(plotId);

      expect(harvested).toMatchObject({ quality, quantity: 4, spriteId: 'carrot', sellValue: 12 });
    },
  );

  it('returns null when the plot has no mature crop', () => {
    useGameStore.getState().createNewGame('Harvester');
    seedPlot({ ...harvestablePlot(), crop: null });

    expect(useGameStore.getState().harvestCrop(plotId)).toBeNull();
  });

  it('stacks repeat harvests of the same crop and quality into one bag entry', () => {
    useGameStore.getState().createNewGame('Harvester');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    seedPlot(harvestablePlot());
    useGameStore.getState().harvestCrop(plotId);
    seedPlot(harvestablePlot());
    useGameStore.getState().harvestCrop(plotId);

    const stacks = useGameStore.getState().world?.player.inventory.filter(
      (item) => item.id === 'harvest_carrot_normal',
    ) ?? [];
    expect(stacks).toHaveLength(1);
    expect(stacks[0].quantity).toBe(8);
  });
});
