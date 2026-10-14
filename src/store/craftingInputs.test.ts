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
import {
  consumeCraftingInputs,
  countCraftingInput,
  hasCraftingInputs,
  inventoryItemMatchesInput,
} from './craftingInputs';
import { useGameStore } from './gameStore';

function stack(partial: Pick<Item, 'id' | 'name' | 'type' | 'quantity'> & Partial<Item>): Item {
  return {
    sellValue: 1,
    spriteId: partial.spriteId ?? partial.id,
    rarity: 'common',
    ...partial,
  };
}

describe('crafting input matching', () => {
  it('matches a resource key on type when the stack id is a unique instance', () => {
    const wood = stack({
      id: 'wood_1710000000000',
      name: 'Timber',
      type: ItemType.WOOD,
      quantity: 5,
    });
    expect(inventoryItemMatchesInput(wood, 'wood')).toBe(true);
    expect(countCraftingInput([wood], 'wood')).toBe(5);
    expect(countCraftingInput([wood], 'stone')).toBe(0);
  });

  it('still matches an exact stack id or a case-insensitive name', () => {
    const ore = stack({ id: 'iron', name: 'Iron Ore', type: ItemType.ORE, quantity: 3 });
    const named = stack({ id: 'uuid-stone', name: 'Stone', type: ItemType.DECORATION, quantity: 2 });
    expect(inventoryItemMatchesInput(ore, 'iron')).toBe(true);
    expect(inventoryItemMatchesInput(named, 'stone')).toBe(true);
    expect(inventoryItemMatchesInput({ id: 'x', type: ItemType.CROP, name: undefined as unknown as string }, 'wood')).toBe(false);
  });

  it('sums every matching stack and will not craft when the total is short', () => {
    const inventory = [
      stack({ id: 'wood_1', name: 'Timber', type: ItemType.WOOD, quantity: 10 }),
      stack({ id: 'wood_2', name: 'Logs', type: ItemType.WOOD, quantity: 20 }),
      stack({ id: 'item_hay_starting', name: 'Hay', type: ItemType.CROP, quantity: 50 }),
    ];
    expect(countCraftingInput(inventory, 'wood')).toBe(30);
    expect(hasCraftingInputs(inventory, { wood: 25 })).toBe(true);
    expect(hasCraftingInputs(inventory, { wood: 31 })).toBe(false);
    expect(consumeCraftingInputs(inventory, { wood: 31 })).toBeNull();
  });

  it('deducts a recipe across stacks and leaves unrelated items', () => {
    const hay = stack({ id: 'item_hay_starting', name: 'Hay', type: ItemType.CROP, quantity: 50 });
    const inventory = [
      stack({ id: 'wood_1', name: 'Timber', type: ItemType.WOOD, quantity: 10 }),
      stack({ id: 'wood_2', name: 'Logs', type: ItemType.WOOD, quantity: 20 }),
      stack({ id: 'stone_9', name: 'Rubble', type: ItemType.STONE, quantity: 15 }),
      hay,
    ];
    const next = consumeCraftingInputs(inventory, { wood: 25, stone: 15 });
    expect(next).toEqual([
      { ...inventory[1], quantity: 5 },
      hay,
    ]);
  });
});

describe('craftItem inventory keys', () => {
  it('crafts a stone hoe from type-keyed stacks whose ids are not the recipe keys', () => {
    useGameStore.getState().createNewGame('Crafter');
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return {
        world: {
          ...state.world,
          player: {
            ...state.world.player,
            level: 2,
            coins: 500,
            inventory: [
              stack({ id: 'wood_1', name: 'Timber', type: ItemType.WOOD, quantity: 10 }),
              stack({ id: 'wood_2', name: 'Logs', type: ItemType.WOOD, quantity: 20 }),
              stack({ id: 'stone_9', name: 'Rubble', type: ItemType.STONE, quantity: 15 }),
              stack({ id: 'item_hay_starting', name: 'Hay', type: ItemType.CROP, quantity: 50 }),
            ],
          },
        },
      };
    });

    useGameStore.getState().craftItem('upgrade_hoe_stone');

    const player = useGameStore.getState().world?.player;
    expect(player?.coins).toBe(300);
    expect(player?.tools[ToolType.HOE]?.tier).toBe(ToolTier.STONE);
    expect(countCraftingInput(player?.inventory ?? [], 'wood')).toBe(5);
    expect(countCraftingInput(player?.inventory ?? [], 'stone')).toBe(0);
    expect(player?.inventory.find((item) => item.id === 'item_hay_starting')?.quantity).toBe(50);
  });

  it('does not spend coins or items when the matching stacks are short', () => {
    useGameStore.getState().createNewGame('Crafter');
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return {
        world: {
          ...state.world,
          player: {
            ...state.world.player,
            level: 2,
            coins: 500,
            inventory: [
              stack({ id: 'wood_1', name: 'Timber', type: ItemType.WOOD, quantity: 4 }),
            ],
          },
        },
      };
    });

    useGameStore.getState().craftItem('upgrade_hoe_stone');

    const player = useGameStore.getState().world?.player;
    expect(player?.coins).toBe(500);
    expect(player?.tools[ToolType.HOE]?.tier).toBe(ToolTier.WOOD);
    expect(player?.inventory).toHaveLength(1);
    expect(player?.inventory[0]?.quantity).toBe(4);
  });
});
