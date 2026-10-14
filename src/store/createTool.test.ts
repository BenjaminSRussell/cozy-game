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

import { ToolType } from '../types/game';
import { PersistenceManager } from '../systems/PersistenceManager';
import { createTool, useGameStore } from './gameStore';

describe('createTool', () => {
  it('uses tool_hoe_wood for a wood hoe', () => {
    expect(createTool('hoe', 'wood').id).toBe('tool_hoe_wood');
  });

  it('returns the same id for two iron axes', () => {
    const first = createTool('axe', 'iron');
    const second = createTool('axe', 'iron');

    expect(first.id).toBe(second.id);
    expect(first.id).toBe('tool_axe_iron');
    expect(second).not.toBe(first);
  });

  it('keeps the equipped tool id equal to the inventory tool id after save and load', async () => {
    useGameStore.getState().createNewGame('Farmer');
    const equipped = createTool('hoe', 'wood');
    const stored = createTool('hoe', 'wood');

    useGameStore.setState((state) => {
      if (!state.world) return state;
      return {
        world: {
          ...state.world,
          player: {
            ...state.world.player,
            inventory: [stored],
            tools: {
              ...state.world.player.tools,
              [ToolType.HOE]: equipped,
            },
          },
        },
      };
    });

    const world = useGameStore.getState().world;
    expect(world).toBeTruthy();
    expect(equipped.id).toBe(stored.id);

    const manager = new PersistenceManager();
    await manager.saveWorld(world!);
    const loaded = await manager.loadWorld(world!.id);

    const equippedId = loaded?.player.tools[ToolType.HOE]?.id;
    const inventoryId = loaded?.player.inventory.find((item) => item.id === equipped.id)?.id;
    expect(equippedId).toBe('tool_hoe_wood');
    expect(inventoryId).toBe(equippedId);
  });
});
