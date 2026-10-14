import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: () => null,
  Text: () => null,
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
  TouchableOpacity: () => null,
  ScrollView: () => null,
  Modal: () => null,
  Alert: { alert: () => undefined },
}));

vi.mock('../store/gameStore', () => ({
  useGameStore: () => ({}),
}));

import { EconomySystem } from '../systems/EconomySystem';
import { listedSellPrice, MARKET_ITEMS } from './MarketplaceScreen';

const CORN_CATALOG_BASE = 5;

describe('MarketplaceScreen listed sell price', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the updated economy price for corn after advanceDay, not the catalog base', () => {
    const economy = EconomySystem.getInstance();
    const snapshot = structuredClone(economy.getSaveData());
    vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      const before = economy.getPrice('corn');
      for (let day = 0; day < 7; day++) economy.advanceDay('summer');

      const updated = economy.getPrice('corn');
      expect(updated).not.toBe(before);
      expect(listedSellPrice('corn', economy)).toBe(updated);
      expect(listedSellPrice('corn', economy)).not.toBe(CORN_CATALOG_BASE);
    } finally {
      economy.loadSaveData(snapshot);
    }
  });

  it('falls back to the catalog base price when the economy does not track the item', () => {
    const economy = EconomySystem.getInstance();

    expect(economy.getPrice('honey')).toBe(0);
    expect(listedSellPrice('honey', economy)).toBe(15);
    expect(economy.getPrice('carrot')).toBe(0);
    expect(listedSellPrice('carrot', economy)).toBe(3);
    expect(listedSellPrice('not-a-market-item', economy)).toBe(0);
  });
});

describe('MarketplaceScreen catalog icons', () => {
  it('does not give iron and coal the same icon', () => {
    expect(MARKET_ITEMS.iron.icon).toBe('🔩');
    expect(MARKET_ITEMS.coal.icon).toBe('🪨');
    expect(MARKET_ITEMS.iron.icon).not.toBe(MARKET_ITEMS.coal.icon);
    expect(MARKET_ITEMS.silver.icon).toBe('⚪');
    expect(MARKET_ITEMS.gold.icon).toBe('🟡');

    const icons = Object.values(MARKET_ITEMS).map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
