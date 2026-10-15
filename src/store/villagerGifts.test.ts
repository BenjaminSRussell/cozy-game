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

import { ItemType, type GameWorld, type Item, type VillagerId, type VillagerRelationship } from '../types/game';
import { emptyRelationship, villagerPlaceAt } from '../systems/VillagerSystem';
import { useGameStore } from './gameStore';

function stack(id: string, type: ItemType, quantity: number): Item {
  return { id, name: id, type, quantity, sellValue: 1, spriteId: id, rarity: 'common' };
}

function setInventory(inventory: Item[]) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, player: { ...state.world.player, inventory } } };
  });
}

function setWorld(patch: Partial<GameWorld>) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    return { world: { ...state.world, ...patch } };
  });
}

function setRelationship(villagerId: VillagerId, patch: Partial<VillagerRelationship>) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    const current = state.world.villagerRelationships?.[villagerId] ?? emptyRelationship();
    return {
      world: {
        ...state.world,
        villagerRelationships: {
          ...state.world.villagerRelationships,
          [villagerId]: { ...current, ...patch },
        },
      },
    };
  });
}

function currentWorld(): GameWorld {
  const world = useGameStore.getState().world;
  if (!world) throw new Error('no world');
  return world;
}

function woodQuantity(): number | undefined {
  return currentWorld().player.inventory.find((entry) => entry.id === 'wood_stack')?.quantity;
}

describe('talkToVillager', () => {
  it('opens the greeting, earns 20 points once a day, and saves the relationship', () => {
    useGameStore.getState().createNewGame('Farmer');

    const first = useGameStore.getState().talkToVillager('pierre');
    expect(first?.node.id).toBe('greet');
    expect(first?.pointsChange).toBe(20);
    expect(currentWorld().villagerRelationships?.pierre).toMatchObject({ points: 20, lastTalkDay: 0 });

    const second = useGameStore.getState().talkToVillager('pierre');
    expect(second?.pointsChange).toBe(0);
    expect(currentWorld().villagerRelationships?.pierre?.points).toBe(20);
  });

  it('returns null for an unknown villager or with no world', () => {
    useGameStore.getState().createNewGame('Farmer');
    expect(useGameStore.getState().talkToVillager('gus' as VillagerId)).toBeNull();

    useGameStore.setState({ world: null });
    expect(useGameStore.getState().talkToVillager('robin')).toBeNull();
  });

  it('adds a milestone letter when a heart level is crossed', () => {
    useGameStore.getState().createNewGame('Farmer');
    setRelationship('robin', { points: 740 });

    const result = useGameStore.getState().talkToVillager('robin');
    expect(result?.milestones.map((m) => m.hearts)).toEqual([3]);
    expect(currentWorld().villagerMailbox).toEqual([
      expect.objectContaining({
        id: 'mail_robin_3',
        from: 'robin',
        claimed: false,
        recipeId: 'robin_birdhouse',
      }),
    ]);
  });

  it('loads older worlds that have no villager fields', () => {
    useGameStore.getState().createNewGame('Farmer');
    setWorld({ villagerRelationships: undefined, villagerMailbox: undefined, unlockedRecipeIds: undefined });

    const result = useGameStore.getState().talkToVillager('willy');
    expect(result?.pointsChange).toBe(20);
    expect(currentWorld().villagerRelationships?.willy?.points).toBe(20);
    expect(currentWorld().villagerMailbox).toEqual([]);
  });
});

describe('giveVillagerGift', () => {
  it('uses one unit, applies the reaction, and saves the relationship', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([stack('wood_stack', ItemType.WOOD, 3)]);
    const coins = currentWorld().player.coins;

    const result = useGameStore.getState().giveVillagerGift('robin', 'wood_stack');

    expect(result).toEqual({ ok: true, reaction: 'loved', pointsChange: 80, milestones: [] });
    expect(woodQuantity()).toBe(2);
    expect(currentWorld().player.coins).toBe(coins);
    expect(currentWorld().villagerRelationships?.robin).toMatchObject({ points: 80, giftCount: 1 });
  });

  it('removes the stack when its last unit is given', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([stack('wood_stack', ItemType.WOOD, 1)]);

    expect(useGameStore.getState().giveVillagerGift('robin', 'wood_stack').ok).toBe(true);
    expect(woodQuantity()).toBeUndefined();
  });

  it('refuses an item the player does not have and changes nothing', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([]);

    expect(useGameStore.getState().giveVillagerGift('robin', 'wood_stack')).toEqual({
      ok: false,
      reason: 'missing-item',
    });
    expect(currentWorld().villagerRelationships?.robin?.points).toBe(0);
  });

  it('accepts two gifts a week and refuses a third without using the item', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([stack('wood_stack', ItemType.WOOD, 5)]);

    expect(useGameStore.getState().giveVillagerGift('robin', 'wood_stack').ok).toBe(true);
    expect(useGameStore.getState().giveVillagerGift('robin', 'wood_stack').ok).toBe(true);
    expect(useGameStore.getState().giveVillagerGift('robin', 'wood_stack')).toEqual({
      ok: false,
      reason: 'weekly-limit',
    });
    expect(woodQuantity()).toBe(3);
  });

  it('refuses an unknown villager', () => {
    useGameStore.getState().createNewGame('Farmer');
    setInventory([stack('wood_stack', ItemType.WOOD, 1)]);

    expect(useGameStore.getState().giveVillagerGift('gus' as VillagerId, 'wood_stack')).toEqual({
      ok: false,
      reason: 'unknown-villager',
    });
    expect(woodQuantity()).toBe(1);
  });
});

describe('claimVillagerMail', () => {
  it('claims a milestone letter once and unlocks its recipe', () => {
    useGameStore.getState().createNewGame('Farmer');
    setRelationship('robin', { points: 740 });
    useGameStore.getState().talkToVillager('robin');

    expect(useGameStore.getState().claimVillagerMail('mail_robin_3')).toBe(true);
    expect(currentWorld().villagerMailbox?.find((m) => m.id === 'mail_robin_3')?.claimed).toBe(true);
    expect(currentWorld().unlockedRecipeIds).toEqual(['robin_birdhouse']);

    expect(useGameStore.getState().claimVillagerMail('mail_robin_3')).toBe(false);
    expect(useGameStore.getState().claimVillagerMail('mail_nobody_1')).toBe(false);
    expect(currentWorld().unlockedRecipeIds).toEqual(['robin_birdhouse']);
  });
});

describe('getVillagerPlace', () => {
  it('follows the in-game clock', () => {
    useGameStore.getState().createNewGame('Farmer');

    setWorld({ dayTime: 9 * 60 });
    expect(useGameStore.getState().getVillagerPlace('clint')).toBe('shop');

    setWorld({ dayTime: 22 * 60 });
    expect(useGameStore.getState().getVillagerPlace('clint')).toBe(villagerPlaceAt(22 * 60));
    expect(useGameStore.getState().getVillagerPlace('clint')).toBe('home');
  });

  it('returns null with no world or an unknown villager', () => {
    useGameStore.getState().createNewGame('Farmer');
    expect(useGameStore.getState().getVillagerPlace('gus' as VillagerId)).toBeNull();

    useGameStore.setState({ world: null });
    expect(useGameStore.getState().getVillagerPlace('robin')).toBeNull();
  });
});

describe('villager save data', () => {
  it('survives a JSON round trip, the way saves are written', () => {
    useGameStore.getState().createNewGame('Farmer');
    setRelationship('robin', { points: 740 });
    useGameStore.getState().talkToVillager('robin');
    useGameStore.getState().claimVillagerMail('mail_robin_3');

    const saved = JSON.parse(JSON.stringify(currentWorld())) as GameWorld;
    expect(saved.villagerRelationships?.robin).toMatchObject({ points: 760, rewardedHearts: [3] });
    expect(saved.villagerMailbox).toEqual([expect.objectContaining({ id: 'mail_robin_3', claimed: true })]);
    expect(saved.unlockedRecipeIds).toEqual(['robin_birdhouse']);
  });
});
