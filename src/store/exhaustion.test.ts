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

import { EXHAUSTED_MESSAGE } from '../rendering/IsometricRenderer';
import { CropStage, type FarmPlot } from '../types/game';
import { useGameStore } from './gameStore';

function setStamina(stamina: number, isExhausted?: boolean) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        player: { ...state.world.player, stamina, isExhausted },
      },
    };
  });
}

function addTree(id: string) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        woodSources: [
          ...state.world.woodSources,
          { id, position: { x: 1, y: 1 }, treeType: 'oak', health: 100, regrowthTime: 1 },
        ],
      },
    };
  });
}

function addDeposit(id: string) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        oreDeposits: [
          ...state.world.oreDeposits,
          { id, position: { x: 2, y: 2 }, depth: 1, oreType: 'copper', quantity: 20, durability: 100 },
        ],
      },
    };
  });
}

function addPlot(): FarmPlot {
  const plot: FarmPlot = {
    id: 'plot_exhausted',
    position: { x: 4, y: 4 },
    size: { x: 1, y: 1 },
    tilled: true,
    tilledAt: 1,
    crop: {
      id: 'crop_exhausted',
      type: 'carrot',
      stage: CropStage.GROWING,
      position: { x: 4, y: 4 },
      plantedTime: 1,
      waterLevel: 10,
      health: 80,
    },
  };
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, farmPlots: [plot] } };
  });
  return plot;
}

describe('exhaustion debuff', () => {
  it('flags empty stamina and refuses mining, chopping, tilling, and watering', () => {
    useGameStore.getState().createNewGame('Tired');
    expect(useGameStore.getState().world?.player.isExhausted).toBe(false);

    setStamina(0, false);
    addTree('tree_tired');
    addDeposit('ore_tired');
    addPlot();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    useGameStore.getState().mineOre('ore_tired');
    useGameStore.getState().harvestWood('tree_tired');
    useGameStore.getState().createFarmPlot({ x: 8, y: 8 });
    useGameStore.getState().waterCrop('plot_exhausted');

    const world = useGameStore.getState().world;
    expect(world?.player.isExhausted).toBe(true);
    expect(world?.player.stamina).toBe(0);
    expect(world?.oreDeposits.find((deposit) => deposit.id === 'ore_tired')?.durability).toBe(100);
    expect(world?.woodSources.find((tree) => tree.id === 'tree_tired')?.health).toBe(100);
    expect(world?.farmPlots.some((plot) => plot.position.x === 8)).toBe(false);
    expect(world?.farmPlots.find((plot) => plot.id === 'plot_exhausted')?.crop?.waterLevel).toBe(10);
    expect(world?.player.inventory.some((item) => item.type === 'ore' || item.name === 'Wood')).toBe(false);
    expect(log.mock.calls.filter((args) => args[0] === EXHAUSTED_MESSAGE).length).toBeGreaterThanOrEqual(4);
    log.mockRestore();
  });

  it('lets a swing through again after sleep, including a pass-out at half stamina', () => {
    useGameStore.getState().createNewGame('Sleeper');
    setStamina(0, true);
    addDeposit('ore_rest');

    useGameStore.getState().sleep(false);
    expect(useGameStore.getState().world?.player).toEqual(expect.objectContaining({
      stamina: 100,
      isExhausted: false,
    }));
    useGameStore.getState().mineOre('ore_rest');
    expect(useGameStore.getState().world?.oreDeposits.find((deposit) => deposit.id === 'ore_rest')?.durability).toBe(90);
    expect(useGameStore.getState().world?.player.inventory.some((item) => item.type === 'ore')).toBe(true);

    setStamina(0, true);
    useGameStore.getState().sleep(true);
    expect(useGameStore.getState().world?.player).toEqual(expect.objectContaining({
      stamina: 50,
      isExhausted: false,
    }));

    setStamina(0);
    useGameStore.getState().syncExhaustion();
    expect(useGameStore.getState().world?.player.isExhausted).toBe(true);
    useGameStore.getState().sleep(false);
    useGameStore.getState().syncExhaustion();
    expect(useGameStore.getState().world?.player.isExhausted).toBe(false);
  });
});
