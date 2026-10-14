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

import { CropSystem } from '../rendering/CropSystem';
import { demandMultiplierForVolume, EconomySystem } from '../systems/EconomySystem';
import {
  applySeedQuantity,
  canPurchaseSeeds,
  DECORATION_OFFERS,
  FERTILIZER_OFFERS,
  filterSeedPacketsBySeason,
  growthDurationBadge,
  listedSellPrice,
  MARKET_ITEMS,
  SEED_COST_COLOR,
  SEED_COST_UNAFFORDABLE_COLOR,
  SEED_PACKETS,
  SEED_QUANTITY_BUTTONS,
  seedCostTextColor,
  seedOffersForSeason,
  seasonalSeedOffers,
  seedTotalCost,
  skippedSeasonalCropIds,
  SKIPPED_YEAR_ROUND_ITEMS,
  STORE_TABS,
  storeGrowthLabel,
  walletAfterPurchase,
} from './MarketplaceScreen';

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

describe('MarketplaceScreen season-filtered seed store', () => {
  const ids = (season: 'spring' | 'summer' | 'autumn' | 'winter') =>
    filterSeedPacketsBySeason(SEED_PACKETS, season).map((packet) => packet.id);

  it('lists in-season packets with a growth badge, description, yield, and buy price', () => {
    const spring = filterSeedPacketsBySeason(SEED_PACKETS, 'spring');
    const tomato = spring.find((packet) => packet.id === 'tomato_seeds');

    expect(tomato).toBeDefined();
    expect(growthDurationBadge(tomato!.growthDays)).toBe('⚡ 4 Days');
    expect(tomato!.description.length).toBeGreaterThan(0);
    expect(tomato!.harvestYield).toBe(4);
    expect(tomato!.buyPrice).toBe(20);
    expect(tomato!.icon).toBe(MARKET_ITEMS.tomato.icon);

    expect(ids('spring')).toEqual(['wheat_seeds', 'carrot_seeds', 'tomato_seeds', 'corn_seeds']);
    expect(ids('summer')).toEqual(ids('spring'));
    expect(ids('autumn')).toEqual(['wheat_seeds', 'carrot_seeds', 'tomato_seeds']);
    expect(ids('autumn')).not.toContain('corn_seeds');
    expect(filterSeedPacketsBySeason(SEED_PACKETS, 'winter')).toEqual([]);
    expect(filterSeedPacketsBySeason(SEED_PACKETS, undefined)).toEqual([]);

    for (const packet of spring) {
      expect(packet.seasons).toContain('spring');
      expect(packet.description.length).toBeGreaterThan(0);
      expect(packet.harvestYield).toBeGreaterThan(0);
      expect(packet.buyPrice).toBeGreaterThan(0);
      expect(growthDurationBadge(packet.growthDays)).toMatch(/^⚡ \d+ Days$/);
    }
  });

  it('steps bulk quantity and turns the cost unaffordable when coins are short', () => {
    expect(SEED_QUANTITY_BUTTONS.map((button) => button.label)).toEqual([
      '[-1]',
      '[+1]',
      '[+5]',
      '[+25]',
      '[MAX]',
    ]);

    expect(applySeedQuantity(1, -1, 100, 20)).toBe(1);
    expect(applySeedQuantity(1, 1, 100, 20)).toBe(2);
    expect(applySeedQuantity(1, 5, 100, 20)).toBe(6);
    expect(applySeedQuantity(1, 25, 100, 20)).toBe(26);
    expect(applySeedQuantity(3, 'max', 100, 20)).toBe(5);
    expect(applySeedQuantity(4, 'max', 0, 20)).toBe(1);

    const totalCost = seedTotalCost(20, 6);
    expect(totalCost).toBe(120);
    expect(canPurchaseSeeds(119, totalCost)).toBe(false);
    expect(canPurchaseSeeds(120, totalCost)).toBe(true);
    expect(seedCostTextColor(119, totalCost)).toBe(SEED_COST_UNAFFORDABLE_COLOR);
    expect(seedCostTextColor(120, totalCost)).toBe(SEED_COST_COLOR);
  });
});

describe('MarketplaceScreen general store', () => {
  it('stocks issue prices only for crops that already have growth data', () => {
    const crops = new CropSystem();
    const seasonal = seasonalSeedOffers(crops);

    expect(seasonal.map((offer) => `${offer.cropId}:${offer.stockSeasons[0]}:${offer.buyPrice}`)).toEqual([
      'strawberry:spring:100',
      'blueberry:summer:80',
      'tomato:summer:50',
      'corn:summer:150',
      'cranberry:autumn:240',
    ]);
    expect(skippedSeasonalCropIds(crops)).toEqual([
      'parsnip',
      'potato',
      'cauliflower',
      'melon',
      'pumpkin',
      'eggplant',
      'yam',
    ]);

    for (const cropId of skippedSeasonalCropIds(crops)) {
      expect(crops.plantCrop(0, 0, cropId)).toBe(false);
      expect(crops.getCropConfig(cropId)).toBeUndefined();
    }

    const cranberry = seasonal.find((offer) => offer.cropId === 'cranberry');
    expect(cranberry?.harvestYield).toBe(crops.getCropConfig('cranberry')?.baseYield);
    expect(cranberry?.growthDays).toBeUndefined();
    expect(storeGrowthLabel(cranberry!)).toBe('5 stages');
    expect(cranberry?.sellValue).toBe(crops.getCropConfig('cranberry')?.sellValue);

    const tomato = seasonal.find((offer) => offer.cropId === 'tomato');
    expect(tomato?.growthDays).toBe(4);
    expect(tomato?.harvestYield).toBe(4);
    expect(storeGrowthLabel(tomato!)).toBe('⚡ 4 Days');
  });

  it('keeps packet prices except where the issue reprices that season', () => {
    const summer = seedOffersForSeason('summer');
    expect(summer.map((offer) => offer.cropId)).toEqual(['wheat', 'carrot', 'blueberry', 'tomato', 'corn']);
    expect(summer.find((offer) => offer.cropId === 'tomato')?.buyPrice).toBe(50);
    expect(summer.find((offer) => offer.cropId === 'corn')?.buyPrice).toBe(150);
    expect(summer.find((offer) => offer.cropId === 'wheat')?.buyPrice).toBe(10);
    expect(summer.filter((offer) => offer.cropId === 'tomato')).toHaveLength(1);

    const spring = seedOffersForSeason('spring');
    expect(spring.find((offer) => offer.cropId === 'strawberry')?.buyPrice).toBe(100);
    expect(spring.find((offer) => offer.cropId === 'tomato')?.buyPrice).toBe(20);
    expect(spring.find((offer) => offer.cropId === 'corn')?.buyPrice).toBe(25);

    expect(seedOffersForSeason('autumn').find((offer) => offer.cropId === 'cranberry')?.buyPrice).toBe(240);
    expect(seedOffersForSeason('autumn').some((offer) => offer.cropId === 'corn')).toBe(false);
    expect(seedOffersForSeason('winter')).toEqual([]);
    expect(seedOffersForSeason(undefined)).toEqual([]);
  });

  it('sells existing fertilizer and decorations, and skips missing year-round items', () => {
    expect(STORE_TABS.map((tab) => tab.label)).toEqual([
      'Seeds',
      'Fertilizer',
      'Decorations',
      'Sell Items',
    ]);
    expect(FERTILIZER_OFFERS.map((offer) => [offer.id, offer.name, offer.buyPrice])).toEqual([
      ['basic_fertilizer', 'Basic Fertilizer', 30],
      ['fertilizer_speed', 'Speed-Grow', 20],
    ]);
    expect(DECORATION_OFFERS.map((offer) => [offer.id, offer.buyPrice, offer.sellValue])).toEqual([
      ['bench', 50, 25],
      ['lamp', 75, 40],
      ['fountain', 200, 100],
      ['statue', 150, 75],
    ]);
    expect(SKIPPED_YEAR_ROUND_ITEMS).toEqual(['Grass Starter', 'Fruit Tree Saplings']);
    expect(FERTILIZER_OFFERS.some((offer) => offer.name === 'Grass Starter')).toBe(false);
    expect(DECORATION_OFFERS.some((offer) => offer.name.includes('Sapling'))).toBe(false);
  });

  it('previews the player balance after the selected cost', () => {
    expect(walletAfterPurchase(500, 80)).toBe('Coins: 500g -> 420g');
    expect(walletAfterPurchase(1000, 0)).toBe('Coins: 1,000g -> 1,000g');
    expect(walletAfterPurchase(500, 80)).not.toBe('Coins: 1,450g -> 1,250g');
  });

  it('applies demand once on top of the economy price', () => {
    const economy = EconomySystem.getInstance();
    const snapshot = structuredClone(economy.getSaveData());
    try {
      const base = economy.getPrice('corn');
      expect(listedSellPrice('corn', economy)).toBe(base);
      economy.noteSale('corn', 10);
      const once = Math.round(base * demandMultiplierForVolume(10));
      expect(listedSellPrice('corn', economy)).toBe(once);
      expect(listedSellPrice('corn', economy)).not.toBe(Math.round(once * demandMultiplierForVolume(10)));
    } finally {
      economy.loadSaveData(snapshot);
    }
  });
});
