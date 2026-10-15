import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  CropStage,
  type Crop,
  type FarmPlot,
  type GameWorld,
  type ShippedTodayEntry,
} from '../types/game';
import { useGameStore } from './gameStore';

type SoilTile = { position: { x: number; y: number }; state?: string; type?: string };
type WorldWithTiles = GameWorld & { tiles?: SoilTile[] };

const SUNRISE = 6 * 60;

function currentWorld(): WorldWithTiles {
  const world = useGameStore.getState().world;
  if (!world) throw new Error('expected a world');
  return world as WorldWithTiles;
}

function setWorld(patch: Partial<WorldWithTiles>) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, ...patch } as WorldWithTiles };
  });
}

function wheatPlot(): FarmPlot {
  const crop: Crop = {
    id: 'crop_sleep',
    type: 'wheat',
    stage: CropStage.SEED,
    position: { x: 4, y: 4 },
    plantedTime: 1,
    waterLevel: 100,
    health: 100,
  };
  return {
    id: 'plot_sleep',
    position: { x: 4, y: 4 },
    size: { x: 1, y: 1 },
    tilled: true,
    crop,
  };
}

const sale: ShippedTodayEntry = { name: 'Wheat', quantity: 2, gold: 30 };

describe('goToBed', () => {
  beforeEach(() => {
    useGameStore.getState().createNewGame('Farmer');
  });

  it('wakes at 6:00 AM on the next day when bed is in the evening', () => {
    setWorld({ dayTime: 18 * 60, totalDaysPlayed: 4 });

    useGameStore.getState().goToBed();

    expect(currentWorld().dayTime).toBe(SUNRISE);
    expect(currentWorld().totalDaysPlayed).toBe(5);
  });

  it('wakes at 6:00 AM on the next day when bed is at 11:30 PM', () => {
    setWorld({ dayTime: 23 * 60 + 30, totalDaysPlayed: 4 });

    useGameStore.getState().goToBed();

    expect(currentWorld().dayTime).toBe(SUNRISE);
    expect(currentWorld().totalDaysPlayed).toBe(5);
  });

  it('does not roll a second day when midnight already rolled it', () => {
    setWorld({ dayTime: 30, totalDaysPlayed: 5 });

    useGameStore.getState().goToBed();

    expect(currentWorld().dayTime).toBe(SUNRISE);
    expect(currentWorld().totalDaysPlayed).toBe(5);
  });

  it('clears the shipping ledger once the day rolls', () => {
    setWorld({ dayTime: 17 * 60, totalDaysPlayed: 2, shippedToday: [sale] });

    useGameStore.getState().goToBed();

    expect(currentWorld().shippedToday).toEqual([]);
  });

  it('restores stamina to max and clears exhaustion', () => {
    setWorld({
      dayTime: 20 * 60,
      player: { ...currentWorld().player, stamina: 0, isExhausted: true },
    });

    useGameStore.getState().goToBed();

    expect(currentWorld().player.stamina).toBe(currentWorld().player.maxStamina);
    expect(currentWorld().player.isExhausted).toBe(false);
  });

  it('grows crops across the night', () => {
    setWorld({ dayTime: 20 * 60, farmPlots: [wheatPlot()] });

    useGameStore.getState().goToBed();

    expect(Number(currentWorld().farmPlots[0]?.crop?.stage)).toBeGreaterThan(CropStage.SEED);
  });

  it('dries wet soil overnight and leaves other soil alone', () => {
    setWorld({
      dayTime: 20 * 60,
      tiles: [
        { position: { x: 3, y: 3 }, state: 'tilled_wet' },
        { position: { x: 4, y: 3 }, state: 'grass' },
      ],
    });

    useGameStore.getState().goToBed();

    expect(currentWorld().tiles?.[0]?.state).toBe('tilled_dry');
    expect(currentWorld().tiles?.[1]?.state).toBe('grass');
  });
});
