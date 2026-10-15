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

import { ItemType, type Item } from '../types/game';
import { fishCatchItem, useGameStore } from './gameStore';

function setInventory(inventory: Item[]) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        player: {
          ...state.world.player,
          inventory,
        },
      },
    };
  });
}

function inventory(): Item[] {
  return useGameStore.getState().world?.player.inventory ?? [];
}

describe('fishing bite', () => {
  beforeEach(() => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([]);
    useGameStore.setState({ fishingBite: null });
  });

  it('opens a bite for the fish that struck', () => {
    useGameStore.getState().startFishingBite('bass');
    const bite = useGameStore.getState().fishingBite;
    expect(bite?.fishType).toBe('bass');
    expect(typeof bite?.startedAt).toBe('number');
  });

  it('keeps the open bite when another one arrives', () => {
    const store = useGameStore.getState();
    store.startFishingBite('bass');
    const first = useGameStore.getState().fishingBite;
    store.startFishingBite('trout');
    expect(useGameStore.getState().fishingBite).toBe(first);
  });

  it('ignores a bite when no game is loaded', () => {
    useGameStore.setState({ world: null });
    useGameStore.getState().startFishingBite('bass');
    expect(useGameStore.getState().fishingBite).toBeNull();
  });

  it('a caught fish goes into the inventory and closes the game', () => {
    useGameStore.getState().startFishingBite('bass');
    useGameStore.getState().resolveFishingBite('caught');
    expect(useGameStore.getState().fishingBite).toBeNull();
    expect(inventory()).toEqual([fishCatchItem('bass')]);
  });

  it('stacks a second bass with the first', () => {
    const store = useGameStore.getState();
    store.startFishingBite('bass');
    store.resolveFishingBite('caught');
    store.startFishingBite('bass');
    store.resolveFishingBite('caught');
    expect(inventory()).toHaveLength(1);
    expect(inventory()[0]).toMatchObject({
      id: 'fish_bass',
      name: 'Bass',
      type: ItemType.CROP,
      quantity: 2,
    });
  });

  it('an escape closes the game and adds nothing', () => {
    useGameStore.getState().startFishingBite('bass');
    useGameStore.getState().resolveFishingBite('escaped');
    expect(useGameStore.getState().fishingBite).toBeNull();
    expect(inventory()).toEqual([]);
  });

  it('resolving with no bite open changes nothing', () => {
    useGameStore.getState().resolveFishingBite('caught');
    expect(useGameStore.getState().fishingBite).toBeNull();
    expect(inventory()).toEqual([]);
  });

  it('is left out of saved data, so a reload cannot reopen a stale bite', () => {
    useGameStore.getState().startFishingBite('bass');
    const saved = JSON.parse(localStorage.getItem('cozy-haven-storage') ?? '{}') as {
      state?: Record<string, unknown>;
    };
    expect(saved.state).toBeDefined();
    expect(saved.state).toHaveProperty('world');
    expect(saved.state).not.toHaveProperty('fishingBite');
  });
});
