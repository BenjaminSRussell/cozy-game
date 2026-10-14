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

import { minutesUntilNextSunrise } from '../components/shippingSummary';
import { CropStage, getQualityMultiplier, ItemType, type Animal, type Item, type ShippedTodayEntry } from '../types/game';
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

describe('quality applied once from harvest and collection', () => {
  it('stores wheat base sellValue and pays gold once when the harvested stack is sold', () => {
    useGameStore.getState().createNewGame('Seller');
    const plotId = 'plot_quality_sale';
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return {
        world: {
          ...state.world,
          player: { ...state.world.player, level: 1 },
          farmPlots: [
            {
              id: plotId,
              position: { x: 2, y: 3 },
              size: { x: 1, y: 1 },
              tilled: true,
              tilledAt: 1,
              crop: {
                id: 'crop_quality_sale',
                type: 'wheat',
                stage: CropStage.HARVESTABLE,
                position: { x: 2, y: 3 },
                plantedTime: 1,
                waterLevel: 100,
                health: 100,
              },
            },
          ],
        },
      };
    });

    // Level 1, no quality fertilizer: gold is roll < 0.17. Iridium also needs level >= 10.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      useGameStore.getState().harvestCrop(plotId);
    } finally {
      random.mockRestore();
    }

    const harvested = useGameStore.getState().world?.player.inventory.find((item) => item.spriteId === 'wheat');
    expect(harvested?.quality).toBe('gold');
    expect(harvested?.sellValue).toBe(10);

    const quantity = harvested?.quantity ?? 0;
    expect(quantity).toBeGreaterThan(0);
    const coinsBefore = useGameStore.getState().world?.player.coins ?? 0;
    const earned = useGameStore.getState().sellInventoryItem(harvested!.id, quantity);
    const once = 10 * 1.5 * quantity;
    const doubled = Math.floor(10 * 1.5) * 1.5 * quantity;

    expect(earned).toBe(once);
    expect(earned).not.toBe(doubled);
    expect(useGameStore.getState().world?.player.coins).toBe(coinsBefore + once);
  });

  it('stores silver milk at 100 and pays 125 for one sale', () => {
    useGameStore.getState().createNewGame('Seller');
    const cow: Animal = {
      id: 'cow_silver',
      type: 'cow',
      name: 'Bessie',
      buildingId: 'barn',
      hunger: 100,
      affection: 500,
      lastFedDay: 0,
      hasProduct: true,
      position: { x: 1, y: 1 },
      rotation: 0,
    };
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return { world: { ...state.world, animals: [cow] } };
    });

    useGameStore.getState().collectAnimalProduct('cow_silver');

    const milk = useGameStore.getState().world?.player.inventory.find((item) => item.spriteId === 'milk');
    expect(milk?.quality).toBe('silver');
    expect(milk?.sellValue).toBe(100);

    const coinsBefore = useGameStore.getState().world?.player.coins ?? 0;
    const earned = useGameStore.getState().sellInventoryItem(milk!.id, 1);

    expect(earned).toBe(125);
    expect(earned).not.toBe(156.25);
    expect(useGameStore.getState().world?.player.coins).toBe(coinsBefore + 125);
  });
});

function shippedToday(): ShippedTodayEntry[] {
  return useGameStore.getState().world?.shippedToday ?? [];
}

describe('shippedToday ledger', () => {
  it('records one row and adds that gold to coins once', () => {
    useGameStore.getState().createNewGame('Seller');
    setInventory([wheat(4, 'gold', 10)]);
    const coinsBefore = useGameStore.getState().world?.player.coins ?? 0;

    const earned = useGameStore.getState().sellInventoryItem('wheat', 4);

    const rows = shippedToday();
    expect(rows).toEqual([{ name: 'Wheat', quantity: 4, gold: 15 * 4 }]);
    expect(earned).toBe(15 * 4);
    expect(earned).not.toBe(10 * 1.5 * 1.5 * 4);
    expect(rows).toHaveLength(1);
    expect(useGameStore.getState().world?.player.coins).toBe(coinsBefore + rows[0].gold);
    expect(useGameStore.getState().world?.player.coins).toBe(coinsBefore + earned);
  });

  it('records silver milk once at 125', () => {
    useGameStore.getState().createNewGame('Seller');
    setInventory([{
      id: 'milk',
      name: 'Milk (silver)',
      type: ItemType.ANIMAL_PRODUCT,
      quantity: 1,
      sellValue: 100,
      spriteId: 'milk',
      rarity: 'uncommon',
      quality: 'silver',
    }]);
    const coinsBefore = useGameStore.getState().world?.player.coins ?? 0;

    const earned = useGameStore.getState().sellInventoryItem('milk', 1);
    const rows = shippedToday();

    expect(rows).toEqual([{ name: 'Milk (silver)', quantity: 1, gold: 125 }]);
    expect(earned).toBe(125);
    expect(useGameStore.getState().world?.player.coins).toBe(coinsBefore + 125);
  });

  it('appends nothing when removeItem fails', () => {
    useGameStore.getState().createNewGame('Seller');
    const existing: ShippedTodayEntry = { name: 'Hay', quantity: 1, gold: 5 };
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return { world: { ...state.world, shippedToday: [existing] } };
    });
    setInventory([wheat(1, 'gold', 10)]);
    const coinsBefore = useGameStore.getState().world?.player.coins ?? 0;

    const earned = useGameStore.getState().sellInventoryItem('wheat', 5);

    expect(earned).toBe(0);
    expect(useGameStore.getState().world?.player.coins).toBe(coinsBefore);
    expect(shippedToday()).toEqual([existing]);
  });

  it('records harvest sales once and skips crops that did not sell', () => {
    useGameStore.getState().createNewGame('Seller');
    const coinsBefore = useGameStore.getState().world?.player.coins ?? 0;
    useGameStore.setState((state) => {
      if (!state.world) return state;
      return {
        world: {
          ...state.world,
          farmPlots: [
            {
              id: 'plot_wheat',
              position: { x: 1, y: 1 },
              size: { x: 1, y: 1 },
              tilled: true,
              crop: {
                id: 'crop_wheat',
                type: 'wheat',
                stage: CropStage.HARVESTABLE,
                position: { x: 1, y: 1 },
                plantedTime: 1,
                waterLevel: 100,
                health: 100,
              },
            },
            {
              id: 'plot_tomato',
              position: { x: 2, y: 1 },
              size: { x: 1, y: 1 },
              tilled: true,
              crop: {
                id: 'crop_tomato',
                type: 'tomato',
                stage: CropStage.HARVESTABLE,
                position: { x: 2, y: 1 },
                plantedTime: 1,
                waterLevel: 100,
                health: 100,
              },
            },
            {
              id: 'plot_growing',
              position: { x: 3, y: 1 },
              size: { x: 1, y: 1 },
              tilled: true,
              crop: {
                id: 'crop_growing',
                type: 'corn',
                stage: CropStage.GROWING,
                position: { x: 3, y: 1 },
                plantedTime: 1,
                waterLevel: 100,
                health: 100,
              },
            },
          ],
        },
      };
    });

    const earned = useGameStore.getState().sellHarvestableCrops([
      'plot_wheat',
      'plot_tomato',
      'plot_growing',
    ]);
    const again = useGameStore.getState().sellHarvestableCrops(['plot_wheat', 'plot_tomato']);
    const rows = shippedToday();
    const gold = rows.reduce((sum, row) => sum + row.gold, 0);

    expect(earned).toBe(2);
    expect(again).toBe(0);
    expect(rows).toEqual([
      { name: 'wheat', quantity: 1, gold: 1 },
      { name: 'tomato', quantity: 1, gold: 1 },
    ]);
    expect(gold).toBe(earned);
    expect(useGameStore.getState().world?.player.coins).toBe(coinsBefore + gold);
    expect(useGameStore.getState().world?.player.coins).not.toBe(coinsBefore + gold * 2);
  });

  it('keeps the list through the same day and clears it when the day rolls', () => {
    useGameStore.getState().createNewGame('Seller');
    setInventory([wheat(1, 'normal', 10)]);
    useGameStore.getState().sellInventoryItem('wheat', 1);
    const season = useGameStore.getState().world?.season;
    const startDay = useGameStore.getState().world?.totalDaysPlayed ?? 0;
    const coins = useGameStore.getState().world?.player.coins;

    useGameStore.getState().advanceTime(1079);
    expect(useGameStore.getState().world?.dayTime).toBe(1439);
    expect(useGameStore.getState().world?.totalDaysPlayed).toBe(startDay);
    expect(shippedToday()).toHaveLength(1);

    useGameStore.getState().advanceTime(1);
    expect(useGameStore.getState().world?.totalDaysPlayed).toBe(startDay + 1);
    expect(shippedToday()).toEqual([]);
    expect(useGameStore.getState().world?.season).toBe(season);
    expect(useGameStore.getState().world?.player.coins).toBe(coins);
  });

  it('clears the ledger when Continue advances from evening to sunrise', () => {
    useGameStore.getState().createNewGame('Seller');
    setInventory([wheat(2, 'gold', 10)]);
    useGameStore.getState().sellInventoryItem('wheat', 2);
    expect(shippedToday()).toHaveLength(1);

    useGameStore.setState((state) => {
      if (!state.world) return state;
      return { world: { ...state.world, dayTime: 23 * 60 } };
    });
    const startDay = useGameStore.getState().world?.totalDaysPlayed ?? 0;
    const season = useGameStore.getState().world?.season;
    const minutes = minutesUntilNextSunrise(23 * 60);

    useGameStore.getState().advanceTime(minutes);

    expect(minutes).toBe(420);
    expect(useGameStore.getState().world?.dayTime).toBe(360);
    expect(useGameStore.getState().world?.totalDaysPlayed).toBe(startDay + 1);
    expect(shippedToday()).toEqual([]);
    expect(useGameStore.getState().world?.season).toBe(season);
  });
});
