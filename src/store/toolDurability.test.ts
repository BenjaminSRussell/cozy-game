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

import { ToolTier, ToolType, type Item, type Tool } from '../types/game';
import { createTool, useGameStore } from './gameStore';

function toolWith(type: ToolType, durability: number): Tool {
  return { ...createTool(type, ToolTier.WOOD), durability };
}

function equip(tool: Tool) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    const previous = state.world.player.inventory;
    const inventory = [
      tool,
      ...previous.filter((item) => item.id !== tool.id),
    ];
    return {
      world: {
        ...state.world,
        player: {
          ...state.world.player,
          inventory,
          tools: {
            ...state.world.player.tools,
            [tool.toolType]: { ...tool },
          },
        },
      },
    };
  });
}

function inventoryItem(id: string): Item | undefined {
  return useGameStore.getState().world?.player.inventory.find((item) => item.id === id);
}

function addTree(id: string) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        woodSources: [
          ...state.world.woodSources,
          {
            id,
            position: { x: 1, y: 1 },
            treeType: 'oak',
            health: 100,
            regrowthTime: 1,
          },
        ],
      },
    };
  });
}

function addDeposit(id: string) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return {
      world: {
        ...state.world,
        oreDeposits: [
          ...state.world.oreDeposits,
          {
            id,
            position: { x: 2, y: 2 },
            depth: 1,
            oreType: 'copper',
            quantity: 20,
            durability: 100,
          },
        ],
      },
    };
  });
}

describe('tool durability break', () => {
  it('removes a tool with durability 1 after one use', () => {
    useGameStore.getState().createNewGame('Farmer');
    const hay = useGameStore.getState().world?.player.inventory.find((item) => item.id === 'item_hay_starting');

    const hoe = toolWith(ToolType.HOE, 1);
    equip(hoe);
    useGameStore.getState().createFarmPlot({ x: 4, y: 5 });
    expect(inventoryItem(hoe.id)).toBeUndefined();
    expect(useGameStore.getState().world?.farmPlots).toHaveLength(1);
    expect(hay?.quantity).toBe(50);

    const axe = toolWith(ToolType.AXE, 1);
    equip(axe);
    addTree('tree_break');
    useGameStore.getState().harvestWood('tree_break');
    expect(inventoryItem(axe.id)).toBeUndefined();

    const pickaxe = toolWith(ToolType.PICKAXE, 1);
    equip(pickaxe);
    addDeposit('ore_break');
    useGameStore.getState().mineOre('ore_break');
    expect(inventoryItem(pickaxe.id)).toBeUndefined();
    expect(inventoryItem('item_hay_starting')?.quantity).toBe(50);
  });

  it('keeps a tool with durability 5 after four uses at durability 1', () => {
    useGameStore.getState().createNewGame('Farmer');
    const hoe = toolWith(ToolType.HOE, 5);
    const before = useGameStore.getState().world?.player.inventory;
    equip(hoe);

    for (let plot = 0; plot < 4; plot += 1) {
      useGameStore.getState().createFarmPlot({ x: plot, y: 0 });
    }

    const kept = inventoryItem(hoe.id);
    expect(kept).toEqual(expect.objectContaining({
      id: 'tool_hoe_wood',
      durability: 1,
    }));
    expect(useGameStore.getState().world?.player.tools[ToolType.HOE]?.durability).toBe(1);
    expect(hoe.durability).toBe(5);
    expect(useGameStore.getState().world?.player.inventory).not.toBe(before);
    expect(before?.find((item) => item.id === hoe.id)).toBeUndefined();

    const axe = toolWith(ToolType.AXE, 5);
    equip(axe);
    for (let swing = 0; swing < 4; swing += 1) {
      addTree(`tree_wear_${swing}`);
      useGameStore.getState().harvestWood(`tree_wear_${swing}`);
    }
    expect(inventoryItem(axe.id)).toEqual(expect.objectContaining({
      id: 'tool_axe_wood',
      durability: 1,
    }));

    const pickaxe = toolWith(ToolType.PICKAXE, 5);
    equip(pickaxe);
    addDeposit('ore_wear');
    for (let swing = 0; swing < 4; swing += 1) {
      useGameStore.getState().mineOre('ore_wear');
    }
    expect(inventoryItem(pickaxe.id)).toEqual(expect.objectContaining({
      id: 'tool_pickaxe_wood',
      durability: 1,
    }));
  });

  it('shows the breaking notification exactly once', () => {
    useGameStore.getState().createNewGame('Farmer');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const hoe = toolWith(ToolType.HOE, 1);
    equip(hoe);
    useGameStore.getState().createFarmPlot({ x: 1, y: 1 });
    useGameStore.getState().createFarmPlot({ x: 2, y: 2 });
    expect(log.mock.calls.filter((args) => args[0] === `Your ${hoe.name} broke!`)).toHaveLength(1);

    log.mockClear();
    const axe = toolWith(ToolType.AXE, 1);
    equip(axe);
    addTree('tree_notice');
    useGameStore.getState().harvestWood('tree_notice');
    addTree('tree_notice_again');
    useGameStore.getState().harvestWood('tree_notice_again');
    expect(log.mock.calls.filter((args) => args[0] === `Your ${axe.name} broke!`)).toHaveLength(1);

    log.mockClear();
    const pickaxe = toolWith(ToolType.PICKAXE, 1);
    equip(pickaxe);
    addDeposit('ore_notice');
    useGameStore.getState().mineOre('ore_notice');
    useGameStore.getState().mineOre('ore_notice');
    expect(log.mock.calls.filter((args) => args[0] === `Your ${pickaxe.name} broke!`)).toHaveLength(1);

    log.mockRestore();
  });
});
