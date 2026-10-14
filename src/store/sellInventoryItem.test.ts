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

import { getQualityMultiplier, ItemType, type Item } from '../types/game';
import { useGameStore } from './gameStore';

function wheat(quantity: number, quality?: Item['quality'], sellValue = 10): Item {
  return {
    id: 'wheat',
    name: 'Wheat',
    type: ItemType.CROP,
    quantity,
    sellValue,
    spriteId: 'wheat',
    rarity: 'common',
    quality,
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

describe('getQualityMultiplier', () => {
  it('returns the base rate for undefined and normal', () => {
    expect(getQualityMultiplier(undefined)).toBe(1.0);
    expect(getQualityMultiplier('normal')).toBe(1.0);
  });

  it('returns the silver, gold, and iridium rates', () => {
    expect(getQualityMultiplier('silver')).toBe(1.25);
    expect(getQualityMultiplier('gold')).toBe(1.5);
    expect(getQualityMultiplier('iridium')).toBe(2.0);
  });
});

describe('sellInventoryItem', () => {
  it('pays sellValue times the quality multiplier', () => {
    useGameStore.getState().createNewGame('Seller');
    const stack = wheat(2, 'gold', 10);
    setInventory([stack]);
    const coins = useGameStore.getState().world?.player.coins ?? 0;

    const earned = useGameStore.getState().sellInventoryItem('wheat', 2);

    expect(getQualityMultiplier('gold')).toBe(1.5);
    expect(earned).toBe(10 * 1.5 * 2);
    expect(useGameStore.getState().world?.player.coins).toBe(coins + earned);
    expect(useGameStore.getState().world?.player.inventory.find((item) => item.id === 'wheat')).toBeUndefined();
    expect(stack.quantity).toBe(2);
  });

  it('pays the base rate when quality is omitted', () => {
    useGameStore.getState().createNewGame('Seller');
    setInventory([wheat(3, undefined, 8)]);
    const coins = useGameStore.getState().world?.player.coins ?? 0;

    const earned = useGameStore.getState().sellInventoryItem('wheat', 1);

    expect(earned).toBe(8 * 1.0);
    expect(useGameStore.getState().world?.player.coins).toBe(coins + 8);
    expect(useGameStore.getState().world?.player.inventory).toEqual([
      expect.objectContaining({ id: 'wheat', quantity: 2, quality: undefined }),
    ]);
  });

  it('grants no coins when removeItem returns false', () => {
    useGameStore.getState().createNewGame('Seller');
    const stack = wheat(3, 'iridium', 10);
    const inventory = [stack];
    setInventory(inventory);
    const coins = useGameStore.getState().world?.player.coins ?? 0;

    const earned = useGameStore.getState().sellInventoryItem('wheat', 10);

    expect(earned).toBe(0);
    expect(useGameStore.getState().world?.player.coins).toBe(coins);
    expect(useGameStore.getState().world?.player.inventory).toBe(inventory);
    expect(stack.quantity).toBe(3);
  });
});
