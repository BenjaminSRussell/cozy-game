import { describe, expect, it } from 'vitest';
import { EconomySystem } from './EconomySystem';

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
