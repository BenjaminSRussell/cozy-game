import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CropStage, ItemType, type Item, type Season } from '../types/game';
import { EconomySystem } from '../systems/EconomySystem';
import { CropSystem, type CropConfig } from '../rendering/CropSystem';

export const MARKET_ITEMS: { [key: string]: { basePrice: number; demandMultiplier: number; icon: string } } = {
  // Crops - Common crops worth 1-5 bucks
  wheat: { basePrice: 2, demandMultiplier: 1.0, icon: '🌾' },
  carrot: { basePrice: 3, demandMultiplier: 1.2, icon: '🥕' },
  tomato: { basePrice: 4, demandMultiplier: 0.9, icon: '🍅' },
  corn: { basePrice: 5, demandMultiplier: 1.1, icon: '🌽' },
  potato: { basePrice: 3, demandMultiplier: 0.8, icon: '🥔' },
  lettuce: { basePrice: 2, demandMultiplier: 1.3, icon: '🥬' },
  onion: { basePrice: 3, demandMultiplier: 0.9, icon: '🧅' },
  garlic: { basePrice: 4, demandMultiplier: 1.4, icon: '🧄' },
  peppers: { basePrice: 5, demandMultiplier: 1.0, icon: '🌶️' },
  pumpkin: { basePrice: 8, demandMultiplier: 0.7, icon: '🎃' },
  strawberries: { basePrice: 6, demandMultiplier: 1.5, icon: '🍓' },
  blueberries: { basePrice: 7, demandMultiplier: 1.6, icon: '🫐' },

  // Ore - More valuable but still reasonable (5-20 bucks)
  copper: { basePrice: 5, demandMultiplier: 1.0, icon: '🟠' },
  iron: { basePrice: 8, demandMultiplier: 0.9, icon: '🔩' },
  silver: { basePrice: 12, demandMultiplier: 1.3, icon: '⚪' },
  gold: { basePrice: 18, demandMultiplier: 1.5, icon: '🟡' },
  diamond: { basePrice: 20, demandMultiplier: 2.0, icon: '💎' },
  coal: { basePrice: 3, demandMultiplier: 0.8, icon: '🪨' },

  // Wood - Common materials (1-5 bucks)
  oak: { basePrice: 4, demandMultiplier: 0.8, icon: '🪵' },
  pine: { basePrice: 3, demandMultiplier: 0.9, icon: '🌲' },
  maple: { basePrice: 5, demandMultiplier: 1.1, icon: '🍁' },
  birch: { basePrice: 3, demandMultiplier: 0.9, icon: '🌳' },

  // Special items - Premium prices (10-20 bucks)
  honey: { basePrice: 15, demandMultiplier: 1.4, icon: '🍯' },
  eggs: { basePrice: 8, demandMultiplier: 1.2, icon: '🥚' },
  milk: { basePrice: 6, demandMultiplier: 1.1, icon: '🥛' },
  wool: { basePrice: 10, demandMultiplier: 1.3, icon: '🐑' },
};

interface MarketplaceScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Current sell price for a market key.
 * EconomySystem.getPrice returns 0 when the item is not tracked (it does not return null).
 * Untracked keys fall back to the catalog base price.
 */
export function listedSellPrice(
  itemId: string,
  economy: {
    getPrice(itemId: string): number;
    getDemandMultiplier?(itemId: string): number;
  },
): number {
  const dynamicPrice = economy.getPrice(itemId);
  const base = dynamicPrice > 0 ? dynamicPrice : (MARKET_ITEMS[itemId]?.basePrice ?? 0);
  if (base <= 0) return 0;
  const demand = economy.getDemandMultiplier?.(itemId);
  const multiplier = typeof demand === 'number' && Number.isFinite(demand) && demand > 0 ? demand : 1;
  return Math.round(base * multiplier);
}

/**
 * Seed packets stocked by the general store.
 * Seasons and harvest yields match rendering CropSystem configs.
 * Growth days match the farm loop (wheat 3, carrot 2, tomato 4, corn 5).
 * Buy prices and sell values match TimeSystem shop stock and EconomyManager.
 */
export interface SeedPacket {
  id: string;
  cropId: string;
  name: string;
  description: string;
  icon: string;
  seasons: readonly Season[];
  growthDays: number;
  harvestYield: number;
  buyPrice: number;
  sellValue: number;
  rarity: Item['rarity'];
}

export const SEED_PACKETS: readonly SeedPacket[] = [
  {
    id: 'wheat_seeds',
    cropId: 'wheat',
    name: 'Wheat Seeds',
    description: 'Staple grain seed. Grows in spring, summer, and autumn.',
    icon: MARKET_ITEMS.wheat.icon,
    seasons: ['spring', 'summer', 'autumn'],
    growthDays: 3,
    harvestYield: 5,
    buyPrice: 10,
    sellValue: 5,
    rarity: 'common',
  },
  {
    id: 'carrot_seeds',
    cropId: 'carrot',
    name: 'Carrot Seeds',
    description: 'A quick root crop for spring through autumn.',
    icon: MARKET_ITEMS.carrot.icon,
    seasons: ['spring', 'summer', 'autumn'],
    growthDays: 2,
    harvestYield: 3,
    buyPrice: 15,
    sellValue: 8,
    rarity: 'common',
  },
  {
    id: 'tomato_seeds',
    cropId: 'tomato',
    name: 'Tomato Seeds',
    description: 'Juicy fruit that keeps producing after the first harvest.',
    icon: MARKET_ITEMS.tomato.icon,
    seasons: ['spring', 'summer', 'autumn'],
    growthDays: 4,
    harvestYield: 4,
    buyPrice: 20,
    sellValue: 12,
    rarity: 'common',
  },
  {
    id: 'corn_seeds',
    cropId: 'corn',
    name: 'Corn Seeds',
    description: 'Tall stalks with a heavy yield, sold in spring and summer.',
    icon: MARKET_ITEMS.corn.icon,
    seasons: ['spring', 'summer'],
    growthDays: 5,
    harvestYield: 6,
    buyPrice: 25,
    sellValue: 15,
    rarity: 'uncommon',
  },
];

export const SEED_COST_COLOR = '#333333';
export const SEED_COST_UNAFFORDABLE_COLOR = '#C62828';

export const SEED_QUANTITY_BUTTONS = [
  { label: '[-1]', action: -1 },
  { label: '[+1]', action: 1 },
  { label: '[+5]', action: 5 },
  { label: '[+25]', action: 25 },
  { label: '[MAX]', action: 'max' },
] as const;

export type SeedQuantityAction = (typeof SEED_QUANTITY_BUTTONS)[number]['action'];

export function growthDurationBadge(growthDays: number): string {
  const days = Math.max(0, Math.round(growthDays));
  return `⚡ ${days} ${days === 1 ? 'Day' : 'Days'}`;
}

export function filterSeedPacketsBySeason(
  packets: readonly SeedPacket[],
  season: Season | undefined,
): SeedPacket[] {
  if (!season) return [];
  return packets.filter((packet) => packet.seasons.includes(season));
}

export function applySeedQuantity(
  current: number,
  action: SeedQuantityAction,
  coins: number,
  unitPrice: number,
): number {
  const safeCurrent = Number.isFinite(current) ? Math.floor(current) : 1;
  if (action === 'max') {
    if (unitPrice <= 0) return Math.max(1, safeCurrent);
    const affordable = Math.floor(Math.max(0, coins) / unitPrice);
    return Math.max(1, affordable);
  }
  return Math.max(1, safeCurrent + action);
}

export function seedTotalCost(unitPrice: number, quantity: number): number {
  return unitPrice * Math.max(0, quantity);
}

export function canPurchaseSeeds(coins: number, totalCost: number): boolean {
  return totalCost >= 0 && coins >= totalCost;
}

export function seedCostTextColor(coins: number, totalCost: number): string {
  return canPurchaseSeeds(coins, totalCost) ? SEED_COST_COLOR : SEED_COST_UNAFFORDABLE_COLOR;
}

export const STORE_TABS = [
  { id: 'seeds', label: 'Seeds' },
  { id: 'fertilizer', label: 'Fertilizer' },
  { id: 'decorations', label: 'Decorations' },
  { id: 'sell', label: 'Sell Items' },
] as const;

export type StoreTab = (typeof STORE_TABS)[number]['id'];

/** Year-round names with no existing item. Kept out of the shop. */
export const SKIPPED_YEAR_ROUND_ITEMS = ['Grass Starter', 'Fruit Tree Saplings'] as const;

const ALL_SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/**
 * Issue catalog. Fall is the game's autumn.
 * A row is stocked only when CropSystem already has that crop in that season.
 */
const REQUESTED_SEASONAL_SEEDS: readonly { cropId: string; season: Season; buyPrice: number }[] = [
  { cropId: 'parsnip', season: 'spring', buyPrice: 20 },
  { cropId: 'potato', season: 'spring', buyPrice: 50 },
  { cropId: 'cauliflower', season: 'spring', buyPrice: 80 },
  { cropId: 'strawberry', season: 'spring', buyPrice: 100 },
  { cropId: 'blueberry', season: 'summer', buyPrice: 80 },
  { cropId: 'tomato', season: 'summer', buyPrice: 50 },
  { cropId: 'melon', season: 'summer', buyPrice: 80 },
  { cropId: 'corn', season: 'summer', buyPrice: 150 },
  { cropId: 'pumpkin', season: 'autumn', buyPrice: 100 },
  { cropId: 'eggplant', season: 'autumn', buyPrice: 20 },
  { cropId: 'cranberry', season: 'autumn', buyPrice: 240 },
  { cropId: 'yam', season: 'autumn', buyPrice: 60 },
];

export interface StoreOffer {
  id: string;
  name: string;
  description: string;
  icon: string;
  buyPrice: number;
  sellValue: number;
  itemType: ItemType;
  rarity: Item['rarity'];
  cropId?: string;
  harvestYield?: number;
  /** Farm-loop days. Set only when a seed packet already records them. */
  growthDays?: number;
  /** CropSystem.growthStages when the farm loop has no day count. */
  growthStages?: number;
  stockSeasons: readonly Season[];
}

const cropCatalog = new CropSystem();

function existingSeedIcon(cropId: string): string {
  if (cropId === 'strawberry') return MARKET_ITEMS.strawberries.icon;
  if (cropId === 'blueberry') return MARKET_ITEMS.blueberries.icon;
  return MARKET_ITEMS[cropId]?.icon ?? '🌱';
}

function packetToOffer(packet: SeedPacket): StoreOffer {
  return {
    id: packet.id,
    name: packet.name,
    description: packet.description,
    icon: packet.icon,
    buyPrice: packet.buyPrice,
    sellValue: packet.sellValue,
    itemType: ItemType.SEED,
    rarity: packet.rarity,
    cropId: packet.cropId,
    harvestYield: packet.harvestYield,
    growthDays: packet.growthDays,
    stockSeasons: packet.seasons,
  };
}

/** Issue-priced seeds whose crop config already exists for that season. */
export function seasonalSeedOffers(
  lookup: { getCropConfig(cropType: string): CropConfig | undefined } = cropCatalog,
): StoreOffer[] {
  const offers: StoreOffer[] = [];
  for (const request of REQUESTED_SEASONAL_SEEDS) {
    const config = lookup.getCropConfig(request.cropId);
    if (!config || !config.seasons.includes(request.season)) continue;
    const packet = SEED_PACKETS.find((entry) => entry.cropId === request.cropId);
    offers.push({
      id: packet?.id ?? `${request.cropId}_seeds`,
      name: packet?.name ?? `${config.name} Seeds`,
      description: packet?.description ?? `${config.name} seed. Grows in ${config.seasons.join(', ')}.`,
      icon: packet?.icon ?? existingSeedIcon(request.cropId),
      buyPrice: request.buyPrice,
      sellValue: packet?.sellValue ?? config.sellValue,
      itemType: ItemType.SEED,
      rarity: packet?.rarity ?? 'common',
      cropId: request.cropId,
      harvestYield: packet?.harvestYield ?? config.baseYield,
      growthDays: packet?.growthDays,
      growthStages: packet ? undefined : config.growthStages,
      stockSeasons: [request.season],
    });
  }
  return offers;
}

/** Requested crops with no matching crop config. */
export function skippedSeasonalCropIds(
  lookup: { getCropConfig(cropType: string): CropConfig | undefined } = cropCatalog,
): string[] {
  const stocked = new Set(seasonalSeedOffers(lookup).map((offer) => offer.cropId));
  const skipped: string[] = [];
  for (const request of REQUESTED_SEASONAL_SEEDS) {
    if (!stocked.has(request.cropId) && !skipped.includes(request.cropId)) skipped.push(request.cropId);
  }
  return skipped;
}

/**
 * In-season packets, with an issue price replacing the packet when both stock the same crop.
 */
export function seedOffersForSeason(
  season: Season | undefined,
  lookup: { getCropConfig(cropType: string): CropConfig | undefined } = cropCatalog,
): StoreOffer[] {
  if (!season) return [];
  const issue = seasonalSeedOffers(lookup).filter((offer) => offer.stockSeasons.includes(season));
  const replaced = new Set(issue.map((offer) => offer.cropId));
  const kept = filterSeedPacketsBySeason(SEED_PACKETS, season)
    .filter((packet) => !replaced.has(packet.cropId))
    .map(packetToOffer);
  return [...kept, ...issue];
}

/** TimeSystem shop base price for basic_fertilizer. */
const BASIC_FERTILIZER_PRICE = 30;
/** craft_fertilizer_speed spends 100 coins and outputs 5. */
const SPEED_GROW_UNIT_PRICE = 100 / 5;

export const FERTILIZER_OFFERS: readonly StoreOffer[] = [
  {
    id: 'basic_fertilizer',
    name: 'Basic Fertilizer',
    description: 'Year-round fertilizer from the general store stock.',
    icon: '🌿',
    buyPrice: BASIC_FERTILIZER_PRICE,
    sellValue: 25,
    itemType: ItemType.TOOL,
    rarity: 'common',
    stockSeasons: ALL_SEASONS,
  },
  {
    id: 'fertilizer_speed',
    name: 'Speed-Grow',
    description: 'Increases crop growth speed by 50%.',
    icon: '🧪',
    buyPrice: SPEED_GROW_UNIT_PRICE,
    sellValue: 10,
    itemType: ItemType.DECORATION,
    rarity: 'common',
    stockSeasons: ALL_SEASONS,
  },
];

/**
 * Placeable decorations that already have a cost in DecorationSystem.
 * Bench 50, lamp 75, fountain 200, statue 150.
 */
export const DECORATION_OFFERS: readonly StoreOffer[] = [
  {
    id: 'bench',
    name: 'Bench',
    description: 'A ground decoration.',
    icon: '🪑',
    buyPrice: 50,
    sellValue: 25,
    itemType: ItemType.DECORATION,
    rarity: 'common',
    stockSeasons: ALL_SEASONS,
  },
  {
    id: 'lamp',
    name: 'Lamp',
    description: 'A ground decoration.',
    icon: '💡',
    buyPrice: 75,
    sellValue: 40,
    itemType: ItemType.DECORATION,
    rarity: 'common',
    stockSeasons: ALL_SEASONS,
  },
  {
    id: 'fountain',
    name: 'Fountain',
    description: 'A ground decoration.',
    icon: '⛲',
    buyPrice: 200,
    sellValue: 100,
    itemType: ItemType.DECORATION,
    rarity: 'uncommon',
    stockSeasons: ALL_SEASONS,
  },
  {
    id: 'statue',
    name: 'Statue',
    description: 'A ground decoration.',
    icon: '🗿',
    buyPrice: 150,
    sellValue: 75,
    itemType: ItemType.DECORATION,
    rarity: 'uncommon',
    stockSeasons: ALL_SEASONS,
  },
];

export function formatCoinAmount(amount: number): string {
  const whole = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return whole.toLocaleString('en-US');
}

/** Live wallet line. The numbers are the player's coins and the cost they picked. */
export function walletAfterPurchase(coins: number, totalCost: number): string {
  const balance = Number.isFinite(coins) ? Math.trunc(coins) : 0;
  const cost = Number.isFinite(totalCost) ? Math.trunc(totalCost) : 0;
  return `Coins: ${formatCoinAmount(balance)}g -> ${formatCoinAmount(balance - cost)}g`;
}

export function storeGrowthLabel(offer: Pick<StoreOffer, 'growthDays' | 'growthStages'>): string | null {
  if (typeof offer.growthDays === 'number') return growthDurationBadge(offer.growthDays);
  if (typeof offer.growthStages === 'number') return `${offer.growthStages} stages`;
  return null;
}

export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({ visible, onClose }) => {
  const { world, addCoins, addItem, removeItem, getInventoryItem } = useGameStore();
  const [storeTab, setStoreTab] = useState<StoreTab>('seeds');
  const [offerQuantities, setOfferQuantities] = useState<Record<string, number>>({});
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'crops' | 'ore' | 'wood' | 'all'>('all');
  const [refreshTime, setRefreshTime] = useState(300);
  const [updateTrigger, setUpdateTrigger] = useState(0); // To force re-render when economy changes

  const economy = EconomySystem.getInstance();
  // Gameplay season lives on the world. TimeSystem has no currentSeason field.
  const currentSeason = world?.season ?? 'spring';
  const coins = world?.player.coins ?? 0;
  const buyOffers = storeTab === 'seeds'
    ? seedOffersForSeason(currentSeason)
    : storeTab === 'fertilizer'
      ? [...FERTILIZER_OFFERS]
      : storeTab === 'decorations'
        ? [...DECORATION_OFFERS]
        : [];
  const selectedOffer = buyOffers.find((offer) => offer.id === selectedOfferId);
  const selectedQuantity = selectedOffer ? (offerQuantities[selectedOffer.id] ?? 1) : 0;
  const walletLine = selectedOffer
    ? walletAfterPurchase(coins, seedTotalCost(selectedOffer.buyPrice, selectedQuantity))
    : `Coins: ${formatCoinAmount(coins)}g`;

  // Update market prices periodically (simulation step)
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      // visualization update only
      setUpdateTrigger(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  // Temporary dev tool: button to advance day and force price updates
  const debugAdvanceDay = () => {
    economy.advanceDay(world?.season || 'spring');
    setUpdateTrigger(prev => prev + 1);
  };

  const getSellableItems = () => {
    if (!world) return [];

    const items: Array<{
      id: string;
      name: string;
      type: 'crop' | 'ore' | 'wood';
      quantity: number;
      basePrice: number;
      currentPrice: number;
      icon: string;
      quality?: number;
    }> = [];

    // Add harvestable crops from farm plots
    world.farmPlots.forEach(plot => {
      if (plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
        const cropId = plot.crop.type.toLowerCase();
        const currentPrice = listedSellPrice(cropId, economy) || 10;

        items.push({
          id: `crop_${plot.id}`,
          name: plot.crop.type.charAt(0).toUpperCase() + plot.crop.type.slice(1),
          type: 'crop',
          quantity: 1,
          basePrice: 0, // Not used in display currently
          currentPrice: currentPrice,
          icon: '🌾', // TODO: Map icons from AssetManager or strict type
          quality: Math.round(plot.crop.health)
        });
      }
    });

    // Add inventory items
    world.player.inventory.forEach(item => {
      if (item.type === ItemType.CROP || item.type === ItemType.ORE || item.type === ItemType.WOOD) {
        const itemId = item.name.toLowerCase();
        const currentPrice = listedSellPrice(itemId, economy);

        // Only show items that have a market value
        if (currentPrice > 0) {
          items.push({
            id: item.id,
            name: item.name,
            type: item.type.toLowerCase() as 'crop' | 'ore' | 'wood',
            quantity: item.quantity,
            basePrice: 0,
            currentPrice: currentPrice,
            icon: MARKET_ITEMS[itemId]?.icon ?? '📦',
            quality: 100
          });
        }
      }
    });

    return items;
  };

  const getFilteredItems = () => {
    const allItems = getSellableItems();
    if (selectedTab === 'all') return allItems;
    return allItems.filter(item => item.type === selectedTab);
  };

  const sellItem = (item: any) => {
    if (!world) return;

    const totalPrice = item.currentPrice * item.quantity;

    // Quality bonus
    let qualityBonus = 1;
    if (item.quality && item.quality > 80) {
      qualityBonus = 1.2; // 20% bonus for high quality
    } else if (item.quality && item.quality > 60) {
      qualityBonus = 1.1; // 10% bonus for medium quality
    }

    const finalPrice = Math.round(totalPrice * qualityBonus);

    Alert.alert(
      'Confirm Sale',
      `Sell ${item.quantity}x ${item.name} for ${finalPrice} bucks?${qualityBonus > 1 ? `\n\nQuality bonus: +${Math.round((qualityBonus - 1) * 100)}%` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          onPress: () => {
            // Remove from inventory or harvest crop
            if (item.id.startsWith('crop_')) {
              // Harvest the crop
              const plotId = item.id.replace('crop_', '');
              const plot = world.farmPlots.find(p => p.id === plotId);
              if (plot && plot.crop) {
                // Reset plot to empty
                plot.crop = undefined;
              }
            } else {
              // Remove from inventory
              if (!removeItem(item.id, item.quantity)) return;
            }

            // Perform the sale within the economy to affect supply/prices
            const saleValue = economy.sellItem(item.name.toLowerCase(), item.quantity);

            // Add coins
            addCoins(finalPrice);

            // Show success message
            Alert.alert('Sold!', `Earned ${finalPrice} bucks from selling ${item.quantity}x ${item.name}`);

            // Trigger visual update
            setUpdateTrigger(prev => prev + 1);
          }
        }
      ]
    );
  };

  const sellAll = () => {
    const items = getFilteredItems();
    if (items.length === 0) {
      Alert.alert('No Items', 'No items available to sell in this category.');
      return;
    }

    const totalValue = items.reduce((sum, item) => {
      let qualityBonus = 1;
      if (item.quality && item.quality > 80) qualityBonus = 1.2;
      else if (item.quality && item.quality > 60) qualityBonus = 1.1;

      return sum + (item.currentPrice * item.quantity * qualityBonus);
    }, 0);

    Alert.alert(
      'Sell All Items',
      `Sell all ${items.length} items for ${Math.round(totalValue)} bucks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell All',
          onPress: () => {
            // Process all sales
            items.forEach(item => {
              if (item.id.startsWith('crop_')) {
                const plotId = item.id.replace('crop_', '');
                const plot = world?.farmPlots.find(p => p.id === plotId);
                if (plot && plot.crop) {
                  plot.crop = undefined;
                }
              } else {
                removeItem(item.id, item.quantity);
              }
            });

            addCoins(Math.round(totalValue));
            Alert.alert('Success!', `Sold all items for ${Math.round(totalValue)} bucks!`);
          }
        }
      ]
    );
  };

  const changeOfferQuantity = (offer: StoreOffer, action: SeedQuantityAction) => {
    setSelectedOfferId(offer.id);
    setOfferQuantities((prev) => ({
      ...prev,
      [offer.id]: applySeedQuantity(prev[offer.id] ?? 1, action, coins, offer.buyPrice),
    }));
  };

  const buyOffer = (offer: StoreOffer, quantity: number) => {
    if (!world) return;
    const totalCost = seedTotalCost(offer.buyPrice, quantity);
    if (!canPurchaseSeeds(world.player.coins, totalCost)) return;

    addCoins(-totalCost);
    const item: Item = {
      id: offer.id,
      name: offer.name,
      type: offer.itemType,
      quantity,
      sellValue: offer.sellValue,
      spriteId: offer.icon,
      rarity: offer.rarity,
    };
    addItem(item);
    Alert.alert('Purchased', `Bought ${quantity}x ${offer.name} for ${totalCost} bucks`);
    setUpdateTrigger((prev) => prev + 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriceTrend = (item: any) => {
    const itemId = item.name.toLowerCase();
    const trendDir = economy.getTrend(itemId);
    const trend = trendDir === 'up' ? '📈' : trendDir === 'down' ? '📉' : '➡️';

    // Calculate simulated percent change for display relative to base
    // In a real app we'd fetch base from config
    return { trend, percentChange: 0 };
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏪 Marketplace</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Market Status */}
        <View style={styles.marketStatus}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Wallet</Text>
            <Text style={styles.statusValue}>{walletLine}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Season:</Text>
            <Text style={styles.statusValue}>{currentSeason}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Price Refresh:</Text>
            <Text style={styles.statusValue}>🕐 {formatTime(refreshTime)}</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {STORE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, storeTab === tab.id && styles.tabActive]}
              onPress={() => setStoreTab(tab.id)}
            >
              <Text style={[styles.tabText, storeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Tabs */}
        {storeTab === 'sell' && (
        <View style={styles.tabs}>
          {(['all', 'crops', 'ore', 'wood'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        )}

        {/* Items List */}
        <ScrollView style={styles.itemsContainer}>
          {storeTab !== 'sell' ? (
            buyOffers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nothing in stock on this tab</Text>
                <Text style={styles.emptySubtext}>The general store restocks when the season changes.</Text>
              </View>
            ) : (
              buyOffers.map((offer) => {
                const quantity = offerQuantities[offer.id] ?? 1;
                const totalCost = seedTotalCost(offer.buyPrice, quantity);
                const affordable = canPurchaseSeeds(coins, totalCost);
                const growthLabel = storeGrowthLabel(offer);
                return (
                  <View key={offer.id} style={styles.seedCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemIcon}>{offer.icon}</Text>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{offer.name}</Text>
                        <Text style={styles.seedDescription}>{offer.description}</Text>
                        {growthLabel ? <Text style={styles.growthBadge}>{growthLabel}</Text> : null}
                        {offer.harvestYield ? (
                          <Text style={styles.seedYield}>Harvest yield: {offer.harvestYield}</Text>
                        ) : null}
                        <Text style={styles.seedBuyPrice}>Buy price: {offer.buyPrice} bucks</Text>
                        <Text style={styles.walletPreview}>{walletAfterPurchase(coins, totalCost)}</Text>
                      </View>
                    </View>
                    <View style={styles.qtyRow}>
                      {SEED_QUANTITY_BUTTONS.map((button) => (
                        <TouchableOpacity
                          key={button.label}
                          style={styles.qtyButton}
                          onPress={() => changeOfferQuantity(offer, button.action)}
                        >
                          <Text style={styles.qtyButtonText}>{button.label}</Text>
                        </TouchableOpacity>
                      ))}
                      <Text style={styles.itemQuantity}>Qty: {quantity}</Text>
                    </View>
                    <View style={styles.seedPurchaseRow}>
                      <Text style={[styles.seedCost, { color: seedCostTextColor(coins, totalCost) }]}>
                        Cost: {totalCost} bucks
                      </Text>
                      <TouchableOpacity
                        style={[styles.buyButton, !affordable && styles.buyButtonDisabled]}
                        disabled={!affordable}
                        onPress={() => buyOffer(offer, quantity)}
                      >
                        <Text style={styles.buyButtonText}>Buy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          ) : getFilteredItems().length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items to sell in this category</Text>
              <Text style={styles.emptySubtext}>Harvest crops or mine ore to get started!</Text>
            </View>
          ) : (
            getFilteredItems().map(item => {
              const { trend, percentChange } = getPriceTrend(item);
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                      {item.quality && (
                        <Text style={styles.itemQuality}>Quality: {item.quality}%</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.priceInfo}>
                    <View style={styles.priceRow}>
                      <Text style={styles.currentPrice}>{item.currentPrice} bucks</Text>
                      <Text style={styles.priceTrend}>
                        {trend} {percentChange}%
                      </Text>
                    </View>
                    <Text style={styles.totalPrice}>
                      Total: {item.currentPrice * item.quantity} bucks
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.sellButton}
                    onPress={() => sellItem(item)}
                  >
                    <Text style={styles.sellButtonText}>Sell</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={debugAdvanceDay}>
            <Text style={styles.refreshButtonText}>⏩ Next Day (Debug)</Text>
          </TouchableOpacity>

          {storeTab === 'sell' && (
            <TouchableOpacity style={styles.sellAllButton} onPress={sellAll}>
              <Text style={styles.sellAllButtonText}>💰 Sell All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#8B4513',
    borderBottomWidth: 2,
    borderBottomColor: '#654321',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  marketStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8B4513',
    backgroundColor: '#F5F5DC',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8B4513',
    fontWeight: 'bold',
  },
  itemsContainer: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  itemQuality: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  priceInfo: {
    alignItems: 'flex-end',
    marginRight: 15,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 8,
  },
  priceTrend: {
    fontSize: 12,
    color: '#666666',
  },
  totalPrice: {
    fontSize: 12,
    color: '#666666',
  },
  sellButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  sellButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sellAllButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sellAllButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeButtonActive: {
    borderBottomColor: '#8B4513',
    backgroundColor: '#F5F5DC',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#8B4513',
    fontWeight: 'bold',
  },
  seedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  seedDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  growthBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F9A825',
    marginTop: 4,
  },
  seedYield: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  seedBuyPrice: {
    fontSize: 12,
    color: '#333333',
    marginTop: 2,
  },
  walletPreview: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  qtyButton: {
    backgroundColor: '#EFE6D5',
    borderWidth: 1,
    borderColor: '#C4B49A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  qtyButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5D4037',
  },
  seedPurchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  seedCost: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buyButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buyButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
