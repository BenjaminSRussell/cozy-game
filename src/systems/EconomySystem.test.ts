import { describe, expect, it } from 'vitest';
import { demandMultiplierForVolume, EconomySystem } from './EconomySystem';

describe('EconomySystem.getInstance', () => {
  it('returns the same object and shares market prices', () => {
    const a = EconomySystem.getInstance();
    const b = EconomySystem.getInstance();
    expect(a).toBe(b);

    const saved = a.getSaveData();
    a.loadSaveData({
      prices: { ...saved.prices, wheat: 42 },
    });
    try {
      expect(b.getPrice('wheat')).toBe(42);
    } finally {
      a.loadSaveData(saved);
    }
  });
});

describe('EconomySystem 7-day demand', () => {
  it('lowers the multiplier after sales and forgets them on the 7th day', () => {
    const economy = EconomySystem.getInstance();
    const snapshot = structuredClone(economy.getSaveData());

    try {
      expect(demandMultiplierForVolume(0)).toBe(1);
      expect(economy.getDemandMultiplier('strawberry')).toBe(1);

      economy.noteSale('strawberry', 10);
      expect(economy.getRecentSoldVolume('strawberry')).toBe(10);
      expect(economy.getDemandMultiplier('strawberry')).toBe(0.8);
      expect(economy.getDemandMultiplier('wheat')).toBe(1);

      const priced = economy.sellItem('strawberry', 1);
      const unit = economy.getPrice('strawberry') * economy.getDemandMultiplier('strawberry');
      expect(priced).toBe(economy.getPrice('strawberry') * 0.8);
      expect(economy.getRecentSoldVolume('strawberry')).toBe(11);
      expect(unit).toBe(economy.getPrice('strawberry') * demandMultiplierForVolume(11));

      for (let day = 0; day < 6; day++) economy.advanceDay('summer');
      expect(economy.getRecentSoldVolume('strawberry')).toBe(11);

      economy.advanceDay('summer');
      expect(economy.getRecentSoldVolume('strawberry')).toBe(0);
      expect(economy.getDemandMultiplier('strawberry')).toBe(1);
    } finally {
      economy.loadSaveData(snapshot);
    }
  });
});
