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

import { ItemType, type Item } from '../types/game';
import { useGameStore } from './gameStore';

function stack(partial: Pick<Item, 'id' | 'name' | 'type' | 'quantity'>): Item {
  return {
    sellValue: 1,
    spriteId: partial.id,
    rarity: 'common',
    ...partial,
  };
}

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

describe('moveInventoryStack', () => {
  it('merges a stack dragged onto a matching stack and reports the change', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([
      stack({ id: 'wheat', name: 'Wheat', type: ItemType.CROP, quantity: 2 }),
      stack({ id: 'stone', name: 'Stone', type: ItemType.STONE, quantity: 5 }),
      stack({ id: 'wheat', name: 'Wheat', type: ItemType.CROP, quantity: 3 }),
    ]);

    expect(useGameStore.getState().moveInventoryStack(2, 0)).toBe(true);

    expect(useGameStore.getState().world?.player.inventory).toEqual([
      expect.objectContaining({ id: 'wheat', quantity: 5 }),
      expect.objectContaining({ id: 'stone', quantity: 5 }),
    ]);
  });

  it('swaps two different stacks', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([
      stack({ id: 'wheat', name: 'Wheat', type: ItemType.CROP, quantity: 2 }),
      stack({ id: 'stone', name: 'Stone', type: ItemType.STONE, quantity: 5 }),
    ]);

    expect(useGameStore.getState().moveInventoryStack(0, 1)).toBe(true);

    expect(useGameStore.getState().world?.player.inventory.map((entry) => entry.id)).toEqual([
      'stone',
      'wheat',
    ]);
  });

  it('returns false and leaves the inventory object untouched when nothing changes', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([stack({ id: 'wheat', name: 'Wheat', type: ItemType.CROP, quantity: 2 })]);
    const before = useGameStore.getState().world?.player.inventory;

    expect(useGameStore.getState().moveInventoryStack(0, 0)).toBe(false);
    expect(useGameStore.getState().moveInventoryStack(4, 0)).toBe(false);

    expect(useGameStore.getState().world?.player.inventory).toBe(before);
  });
});
