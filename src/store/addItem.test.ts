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

describe('addItem', () => {
  it('stacks wheat 3 then wheat 2 into one entry with quantity 5', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([]);

    const first = stack({ id: 'wheat', name: 'Wheat', type: ItemType.CROP, quantity: 3 });
    useGameStore.getState().addItem(first);

    const before = useGameStore.getState().world?.player.inventory;
    const beforeEntry = before?.[0];
    expect(beforeEntry).not.toBe(first);
    expect(beforeEntry?.quantity).toBe(3);

    useGameStore.getState().addItem(
      stack({ id: 'wheat', name: 'Wheat', type: ItemType.CROP, quantity: 2 }),
    );

    const inventory = useGameStore.getState().world?.player.inventory;
    expect(inventory).toEqual([
      expect.objectContaining({ id: 'wheat', quantity: 5 }),
    ]);
    expect(inventory).not.toBe(before);
    expect(inventory?.[0]).not.toBe(beforeEntry);
    expect(beforeEntry?.quantity).toBe(3);
  });

  it('keeps copper and iron as two entries', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([]);

    useGameStore.getState().addItem(
      stack({ id: 'copper', name: 'Copper', type: ItemType.ORE, quantity: 1 }),
    );
    useGameStore.getState().addItem(
      stack({ id: 'iron', name: 'Iron', type: ItemType.ORE, quantity: 1 }),
    );

    const inventory = useGameStore.getState().world?.player.inventory ?? [];
    expect(inventory).toHaveLength(2);
    expect(inventory.map((item) => ({ id: item.id, quantity: item.quantity }))).toEqual([
      { id: 'copper', quantity: 1 },
      { id: 'iron', quantity: 1 },
    ]);
  });

  it('creates a new entry for a new id', () => {
    useGameStore.getState().createNewGame('Farmer');
    const wheat = stack({ id: 'wheat', name: 'Wheat', type: ItemType.CROP, quantity: 1 });
    setInventory([wheat]);

    const stone = stack({ id: 'stone', name: 'Stone', type: ItemType.STONE, quantity: 4 });
    useGameStore.getState().addItem(stone);

    const inventory = useGameStore.getState().world?.player.inventory ?? [];
    expect(inventory).toHaveLength(2);
    expect(inventory[0]).toEqual(expect.objectContaining({ id: 'wheat', quantity: 1 }));
    expect(wheat.quantity).toBe(1);
    expect(inventory[1]).toEqual(expect.objectContaining({ id: 'stone', quantity: 4 }));
    expect(inventory[1]).not.toBe(stone);
  });
});
