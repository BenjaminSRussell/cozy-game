import { describe, expect, it } from 'vitest';
import { demandMultiplierForVolume } from './EconomySystem';
import { EconomyManager } from './EconomyManager';
import { InventoryManager } from './InventoryManager';
import { TimeSystem } from './TimeSystem';

function manager(): EconomyManager {
  return new EconomyManager(new InventoryManager(), new TimeSystem());
}

describe('EconomyManager demand', () => {
  it('lowers a later quote from sales in the last 7 days and ignores older ones', () => {
    const economy = manager();

    expect(economy.getDemandMultiplier('wheat')).toBe(1);
    economy.noteSale('wheat', 10);
    economy.noteSale('wheat', 50, 0);

    expect(economy.getRecentSoldQuantity('wheat')).toBe(10);
    expect(economy.getDemandMultiplier('wheat')).toBe(demandMultiplierForVolume(10));
    expect(economy.quoteSellPrice(10, 'wheat')).toBe(Math.floor(10 * 0.8 * 0.8));
    expect(economy.quoteSellPrice(10, 'wheat', 2)).toBe(Math.floor(10 * 0.8 * 0.8 * 2));
    expect(economy.quoteSellPrice(10, 'egg')).toBe(Math.floor(10 * 0.8));
  });

  it('does not record a sale when the sell fails', () => {
    const economy = manager();
    expect(economy.sellItem('general_store', 'wheat', 1)).toBe(false);
    expect(economy.getRecentSoldQuantity('wheat')).toBe(0);
    expect(economy.getDemandMultiplier('wheat')).toBe(1);
  });

  it('reloads recent sales and treats a missing list as no demand', () => {
    const economy = manager();
    economy.noteSale('milk', 4);
    const saved = economy.save();

    const restored = manager();
    restored.load(saved);
    expect(restored.getRecentSoldQuantity('milk')).toBe(4);

    const fresh = manager();
    fresh.load({ ...saved, recentSales: undefined });
    expect(fresh.getDemandMultiplier('milk')).toBe(1);
  });
});
