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

import { ItemType, ToolTier, ToolType, type Item } from '../types/game';
import { checkCanCraft, CRAFTING_RECIPES, useGameStore } from './gameStore';

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

describe('upgrade_hoe_iron recipe', () => {
  it('keeps the iron hoe fields and uses mineOre item ids', () => {
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === 'upgrade_hoe_iron');
    expect(recipe).toEqual({
      id: 'upgrade_hoe_iron',
      name: 'Iron Hoe',
      description: 'Professional farming tool.',
      inputs: { wood: 50, iron: 10 },
      output: { type: 'tool', id: ToolType.HOE, toolTier: ToolTier.IRON },
      type: 'upgrade',
      cost: 1000,
      requiredLevel: 5,
    });
  });

  it('does not throw when the inventory is empty', () => {
    useGameStore.getState().createNewGame('Crafter');
    setInventory([]);

    expect(() => checkCanCraft('upgrade_hoe_iron')).not.toThrow();
    expect(checkCanCraft('upgrade_hoe_iron')).toBe(false);
  });

  it('returns true when the inventory has 50 wood and 10 iron', () => {
    useGameStore.getState().createNewGame('Crafter');
    setInventory([
      stack({ id: 'wood_1', name: 'Wood', type: ItemType.WOOD, quantity: 50 }),
      stack({ id: 'iron', name: 'iron', type: ItemType.ORE, quantity: 10 }),
    ]);

    expect(checkCanCraft('upgrade_hoe_iron')).toBe(true);
  });

  it('does not treat ore_iron as the mined iron id', () => {
    useGameStore.getState().createNewGame('Crafter');
    setInventory([
      stack({ id: 'wood_1', name: 'Wood', type: ItemType.WOOD, quantity: 50 }),
      stack({ id: 'ore_iron', name: 'ore_iron', type: ItemType.ORE, quantity: 10 }),
    ]);

    expect(checkCanCraft('upgrade_hoe_iron')).toBe(false);
  });
});
