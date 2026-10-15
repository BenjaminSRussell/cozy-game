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

vi.mock('react-native', () => ({
  View: () => null,
  Text: () => null,
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
  TouchableOpacity: () => null,
  ScrollView: () => null,
  Modal: () => null,
  Alert: { alert: () => undefined },
}));

import { ToolType, type FarmPlot, type GameWorld, type PlayerState } from '../types/game';
import { useGameStore } from './gameStore';

/** A new game with an empty map, so each test controls every object on the farm. */
function startFarm(patch: Partial<GameWorld> = {}) {
  useGameStore.getState().createNewGame('Tiller');
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        farmPlots: [],
        oreDeposits: [],
        woodSources: [],
        buildings: [],
        roads: [],
        ...patch,
      },
    };
  });
}

function setPlayer(patch: Partial<PlayerState>) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, player: { ...state.world.player, ...patch } } };
  });
}

function currentWorld(): GameWorld {
  const world = useGameStore.getState().world;
  if (!world) throw new Error('expected a world after createNewGame');
  return world;
}

function hoeDurability(): number | undefined {
  return currentWorld().player.tools[ToolType.HOE]?.durability;
}

function plotAt(x: number, y: number): FarmPlot {
  return { id: `plot_${x}_${y}`, position: { x, y }, size: { x: 1, y: 1 }, tilled: true, tilledAt: 1 };
}

describe('tillSoil', () => {
  it('tills empty grass for 2 stamina and one hoe swing', () => {
    startFarm();
    const stamina = currentWorld().player.stamina;
    const durability = hoeDurability();

    expect(useGameStore.getState().tillSoil(4, 5)).toBe(true);

    expect(currentWorld().farmPlots).toHaveLength(1);
    expect(currentWorld().farmPlots[0]).toMatchObject({ position: { x: 4, y: 5 }, tilled: true });
    expect(currentWorld().player.stamina).toBe(stamina - 2);
    expect(hoeDurability()).toBe((durability ?? 0) - 1);
  });

  it('refuses an exhausted player and spends nothing', () => {
    startFarm();
    setPlayer({ stamina: 0, isExhausted: true });
    const durability = hoeDurability();

    expect(useGameStore.getState().tillSoil(4, 5)).toBe(false);

    expect(currentWorld().farmPlots).toHaveLength(0);
    expect(currentWorld().player.stamina).toBe(0);
    expect(hoeDurability()).toBe(durability);
  });

  it('drains stamina below the cost to zero and flags exhaustion', () => {
    startFarm();
    setPlayer({ stamina: 1 });

    expect(useGameStore.getState().tillSoil(4, 5)).toBe(true);

    expect(currentWorld().player.stamina).toBe(0);
    expect(currentWorld().player.isExhausted).toBe(true);
    expect(currentWorld().farmPlots).toHaveLength(1);
  });

  it('refuses a tile that already holds a plot, with no second plot and no cost', () => {
    startFarm({ farmPlots: [plotAt(4, 5)] });
    const stamina = currentWorld().player.stamina;
    const durability = hoeDurability();

    expect(useGameStore.getState().tillSoil(4, 5)).toBe(false);

    expect(currentWorld().farmPlots).toHaveLength(1);
    expect(currentWorld().player.stamina).toBe(stamina);
    expect(hoeDurability()).toBe(durability);
  });

  it('refuses rocks and trees on the tile', () => {
    startFarm({
      oreDeposits: [
        { id: 'rock_1', position: { x: 4, y: 5 }, depth: 1, oreType: 'copper', quantity: 20, durability: 100 },
      ],
      woodSources: [
        { id: 'tree_1', position: { x: 6, y: 6 }, treeType: 'oak', health: 100, regrowthTime: 1 },
      ],
    });
    const stamina = currentWorld().player.stamina;

    expect(useGameStore.getState().tillSoil(4, 5)).toBe(false);
    expect(useGameStore.getState().tillSoil(6, 6)).toBe(false);

    expect(currentWorld().farmPlots).toHaveLength(0);
    expect(currentWorld().player.stamina).toBe(stamina);
  });

  it('refuses when no hoe is equipped', () => {
    startFarm();
    setPlayer({ tools: { ...currentWorld().player.tools, [ToolType.HOE]: undefined } });

    expect(useGameStore.getState().tillSoil(4, 5)).toBe(false);

    expect(currentWorld().farmPlots).toHaveLength(0);
  });
});
