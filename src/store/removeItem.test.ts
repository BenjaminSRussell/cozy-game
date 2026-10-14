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

function wheat(quantity: number): Item {
  return {
    id: 'wheat',
    name: 'Wheat',
    type: ItemType.CROP,
    quantity,
    sellValue: 1,
    spriteId: 'wheat',
    rarity: 'common',
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

describe('removeItem', () => {
  it('returns false and leaves inventory unchanged when wheat 3 cannot cover 10', () => {
    useGameStore.getState().createNewGame('Farmer');
    const stack = wheat(3);
    const inventory = [stack];
    setInventory(inventory);
    const coins = useGameStore.getState().world?.player.coins;

    const removed = useGameStore.getState().removeItem('wheat', 10);

    const after = useGameStore.getState().world?.player.inventory;
    expect(removed).toBe(false);
    expect(after).toBe(inventory);
    expect(after).toEqual([expect.objectContaining({ id: 'wheat', quantity: 3 })]);
    expect(stack.quantity).toBe(3);
    expect(useGameStore.getState().world?.player.coins).toBe(coins);
  });

  it('returns true and removes wheat when the stack is exactly 3', () => {
    useGameStore.getState().createNewGame('Farmer');
    const stack = wheat(3);
    const inventory = [stack];
    setInventory(inventory);

    const removed = useGameStore.getState().removeItem('wheat', 3);

    const after = useGameStore.getState().world?.player.inventory ?? [];
    expect(removed).toBe(true);
    expect(after.find((item) => item.id === 'wheat')).toBeUndefined();
    expect(after).not.toBe(inventory);
    expect(inventory).toEqual([stack]);
    expect(stack.quantity).toBe(3);
  });

  it('returns true and lowers wheat 5 by 2', () => {
    useGameStore.getState().createNewGame('Farmer');
    const stack = wheat(5);
    const inventory = [stack];
    setInventory(inventory);

    const removed = useGameStore.getState().removeItem('wheat', 2);

    const after = useGameStore.getState().world?.player.inventory ?? [];
    expect(removed).toBe(true);
    expect(after).toEqual([expect.objectContaining({ id: 'wheat', quantity: 3 })]);
    expect(after).not.toBe(inventory);
    expect(after[0]).not.toBe(stack);
    expect(stack.quantity).toBe(5);
    expect(inventory[0]?.quantity).toBe(5);
  });

  it('returns false when the item is missing', () => {
    useGameStore.getState().createNewGame('Farmer');
    const inventory = [wheat(3)];
    setInventory(inventory);

    const removed = useGameStore.getState().removeItem('stone', 1);

    expect(removed).toBe(false);
    expect(useGameStore.getState().world?.player.inventory).toBe(inventory);
  });
});
