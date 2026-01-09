/**
 * Economy Manager - Buy/sell mechanics and currency management
 * 
 * Handles economic systems including currencies, shops, trading, and value
 * based on cozy game patterns from Animal Crossing and Stardew Valley.
 */

import { Item, ItemType } from '../types/game';
import { InventoryManager } from './InventoryManager';
import { TimeSystem, ShopStock } from './TimeSystem';

// ============================================================================
// ECONOMY SYSTEM TYPES
// ============================================================================

export interface Currency {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  isPremium: boolean;
}

export interface Shop {
  id: string;
  name: string;
  inventory: ShopItem[];
  buyMultiplier: number; // Price multiplier when buying
  sellMultiplier: number; // Price multiplier when selling
  openHours: { start: number; end: number }; // Game hours
  restockFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface ShopItem extends ShopStock {
  item: Item;
  demand: number; // Affects price (0-1, higher = more expensive)
  lastSold: number;
  totalSold: number;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'trade';
  itemId: string;
  quantity: number;
  price: number;
  currencyId: string;
  timestamp: number;
  shopId?: string;
  success: boolean;
  reason?: string;
}

export interface PriceHistory {
  itemId: string;
  prices: Array<{ price: number; date: number }>;
  averagePrice: number;
  volatility: number;
}

export interface EconomyStats {
  totalTransactions: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  mostSoldItem: { itemId: string; quantity: number } | null;
  mostProfitableItem: { itemId: string; profit: number } | null;
}

// ============================================================================
// ECONOMY MANAGER CLASS
// ============================================================================

export class EconomyManager {
  private inventoryManager: InventoryManager;
  private timeSystem: TimeSystem;
  private currencies: Map<string, Currency> = new Map();
  private shops: Map<string, Shop> = new Map();
  private transactions: Transaction[] = [];
  private priceHistory: Map<string, PriceHistory> = new Map();

  constructor(inventoryManager: InventoryManager, timeSystem: TimeSystem) {
    this.inventoryManager = inventoryManager;
    this.timeSystem = timeSystem;
    this.initializeCurrencies();
    this.initializeShops();
  }

  /**
   * Initialize default currencies
   */
  private initializeCurrencies(): void {
    // Primary currency (like Bells in AC, Gold in SV)
    this.currencies.set('coins', {
      id: 'coins',
      name: 'Coins',
      symbol: '🪙',
      amount: 500, // Starting money
      isPremium: false,
    });

    // Premium currency (like Nook Miles, Dreamlight)
    this.currencies.set('gems', {
      id: 'gems',
      name: 'Gems',
      symbol: '💎',
      amount: 0,
      isPremium: true,
    });
  }

  /**
   * Initialize default shops
   */
  private initializeShops(): void {
    // General store
    const generalStore: Shop = {
      id: 'general_store',
      name: 'General Store',
      inventory: [],
      buyMultiplier: 1.0,
      sellMultiplier: 0.8, // Buy at 80% of value
      openHours: { start: 8, end: 20 }, // 8 AM - 8 PM
      restockFrequency: 'daily',
    };

    this.shops.set('general_store', generalStore);
    this.restockShop('general_store');
  }

  /**
   * Restock shop with items
   */
  private restockShop(shopId: string): void {
    const shop = this.shops.get(shopId);
    if (!shop) return;

    // Get base items from time system
    const baseStock = this.timeSystem.getShopInventory();
    
    shop.inventory = baseStock.map(stock => {
      const item = this.createShopItem(stock.itemId);
      return {
        ...stock,
        item,
        demand: 0.5 + Math.random() * 0.5, // 0.5-1.0 demand
        lastSold: 0,
        totalSold: 0,
      };
    });
  }

  /**
   * Create shop item from ID
   */
  private createShopItem(itemId: string): Item {
    const itemData: Record<string, Partial<Item>> = {
      'wheat_seeds': {
        id: 'wheat_seeds',
        name: 'Wheat Seeds',
        type: ItemType.SEED,
        sellValue: 5,
        spriteId: '🌱',
        rarity: 'common',
      },
      'carrot_seeds': {
        id: 'carrot_seeds',
        name: 'Carrot Seeds',
        type: ItemType.SEED,
        sellValue: 8,
        spriteId: '🥕',
        rarity: 'common',
      },
      'tomato_seeds': {
        id: 'tomato_seeds',
        name: 'Tomato Seeds',
        type: ItemType.SEED,
        sellValue: 12,
        spriteId: '🍅',
        rarity: 'common',
      },
      'corn_seeds': {
        id: 'corn_seeds',
        name: 'Corn Seeds',
        type: ItemType.SEED,
        sellValue: 15,
        spriteId: '🌽',
        rarity: 'uncommon',
      },
      'basic_fertilizer': {
        id: 'basic_fertilizer',
        name: 'Basic Fertilizer',
        type: ItemType.TOOL,
        sellValue: 25,
        spriteId: '🌿',
        rarity: 'common',
      },
      'watering_can': {
        id: 'watering_can',
        name: 'Watering Can',
        type: ItemType.TOOL,
        sellValue: 50,
        spriteId: '🪣',
        rarity: 'common',
      },
    };

    const data = itemData[itemId];
    if (!data) {
      throw new Error(`Unknown item ID: ${itemId}`);
    }

    return {
      id: data.id!,
      name: data.name!,
      type: data.type!,
      quantity: 1,
      sellValue: data.sellValue!,
      spriteId: data.spriteId!,
      rarity: data.rarity as 'common' | 'uncommon' | 'rare' | 'legendary',
    };
  }

  /**
   * Buy item from shop
   */
  public buyItem(shopId: string, itemId: string, quantity: number = 1): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) {
      this.recordTransaction('buy', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Shop not found');
      return false;
    }

    // Check if shop is open
    if (!this.isShopOpen(shop)) {
      this.recordTransaction('buy', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Shop is closed');
      return false;
    }

    const shopItem = shop.inventory.find(item => item.itemId === itemId);
    if (!shopItem || shopItem.quantity < quantity) {
      this.recordTransaction('buy', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Insufficient stock');
      return false;
    }

    // Calculate price
    const basePrice = shopItem.price;
    const demandMultiplier = 1 + (shopItem.demand - 0.5); // 0.5-1.5x based on demand
    const finalPrice = Math.floor(basePrice * shop.buyMultiplier * demandMultiplier * quantity);

    // Check if player has enough money
    const coins = this.currencies.get('coins');
    if (!coins || coins.amount < finalPrice) {
      this.recordTransaction('buy', itemId, quantity, finalPrice, 'coins', Date.now(), shopId, false, 'Insufficient funds');
      return false;
    }

    // Check if player has inventory space
    if (!this.inventoryManager.hasSpace('player_main', itemId, quantity)) {
      this.recordTransaction('buy', itemId, quantity, finalPrice, 'coins', Date.now(), shopId, false, 'No inventory space');
      return false;
    }

    // Complete transaction
    coins.amount -= finalPrice;
    shopItem.quantity -= quantity;
    shopItem.lastSold = Date.now();
    shopItem.totalSold += quantity;

    // Add item to player inventory
    this.inventoryManager.addItem('player_main', shopItem.item, quantity);

    // Update demand (increase when items sell)
    shopItem.demand = Math.min(1.0, shopItem.demand + 0.05);

    // Record transaction
    this.recordTransaction('buy', itemId, quantity, finalPrice, 'coins', Date.now(), shopId, true);

    // Update price history
    this.updatePriceHistory(itemId, finalPrice / quantity);

    return true;
  }

  /**
   * Sell item to shop
   */
  public sellItem(shopId: string, itemId: string, quantity: number = 1): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) {
      this.recordTransaction('sell', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Shop not found');
      return false;
    }

    // Check if shop is open
    if (!this.isShopOpen(shop)) {
      this.recordTransaction('sell', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Shop is closed');
      return false;
    }

    // Check if player has the item
    const playerQuantity = this.inventoryManager.getItemQuantity('player_main', itemId);
    if (playerQuantity < quantity) {
      this.recordTransaction('sell', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Insufficient items');
      return false;
    }

    // Get item value
    const inventory = this.inventoryManager.getInventory('player_main');
    const itemSlot = inventory?.slots.find(slot => slot.item?.id === itemId);
    if (!itemSlot?.item) {
      this.recordTransaction('sell', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Item not found');
      return false;
    }

    // Calculate sell price
    const basePrice = itemSlot.item.sellValue;
    const finalPrice = Math.floor(basePrice * shop.sellMultiplier * quantity);

    // Remove item from player inventory
    const removed = this.inventoryManager.removeItem('player_main', itemId, quantity);
    if (!removed) {
      this.recordTransaction('sell', itemId, quantity, 0, 'coins', Date.now(), shopId, false, 'Failed to remove item');
      return false;
    }

    // Add money to player
    const coins = this.currencies.get('coins');
    if (coins) {
      coins.amount += finalPrice;
    }

    // Record transaction
    this.recordTransaction('sell', itemId, quantity, finalPrice, 'coins', Date.now(), shopId, true);

    // Update price history
    this.updatePriceHistory(itemId, finalPrice / quantity);

    return true;
  }

  /**
   * Check if shop is open
   */
  private isShopOpen(shop: Shop): boolean {
    const currentHour = Math.floor(this.timeSystem.getCurrentTime().gameTime / 60);
    return currentHour >= shop.openHours.start && currentHour < shop.openHours.end;
  }

  /**
   * Update price history for item
   */
  private updatePriceHistory(itemId: string, price: number): void {
    if (!this.priceHistory.has(itemId)) {
      this.priceHistory.set(itemId, {
        itemId,
        prices: [],
        averagePrice: 0,
        volatility: 0,
      });
    }

    const history = this.priceHistory.get(itemId)!;
    history.prices.push({ price, date: Date.now() });

    // Keep only last 30 days of prices
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    history.prices = history.prices.filter(p => p.date > thirtyDaysAgo);

    // Calculate average price
    if (history.prices.length > 0) {
      history.averagePrice = history.prices.reduce((sum, p) => sum + p.price, 0) / history.prices.length;
      
      // Calculate volatility (standard deviation)
      const variance = history.prices.reduce((sum, p) => sum + Math.pow(p.price - history.averagePrice, 2), 0) / history.prices.length;
      history.volatility = Math.sqrt(variance);
    }
  }

  /**
   * Get currency amount
   */
  public getCurrencyAmount(currencyId: string): number {
    const currency = this.currencies.get(currencyId);
    return currency?.amount || 0;
  }

  /**
   * Add currency
   */
  public addCurrency(currencyId: string, amount: number): boolean {
    const currency = this.currencies.get(currencyId);
    if (!currency) return false;

    currency.amount += amount;
    return true;
  }

  /**
   * Remove currency
   */
  public removeCurrency(currencyId: string, amount: number): boolean {
    const currency = this.currencies.get(currencyId);
    if (!currency || currency.amount < amount) return false;

    currency.amount -= amount;
    return true;
  }

  /**
   * Get shop information
   */
  public getShop(shopId: string): Shop | null {
    return this.shops.get(shopId) || null;
  }

  /**
   * Get all shops
   */
  public getAllShops(): Shop[] {
    return Array.from(this.shops.values());
  }

  /**
   * Get price history for item
   */
  public getPriceHistory(itemId: string): PriceHistory | null {
    return this.priceHistory.get(itemId) || null;
  }

  /**
   * Get economy statistics
   */
  public getEconomyStats(): EconomyStats {
    const buyTransactions = this.transactions.filter(t => t.type === 'buy' && t.success);
    const sellTransactions = this.transactions.filter(t => t.type === 'sell' && t.success);

    const totalRevenue = sellTransactions.reduce((sum, t) => sum + t.price, 0);
    const totalExpenses = buyTransactions.reduce((sum, t) => sum + t.price, 0);

    // Find most sold item
    const salesByItem: Record<string, number> = {};
    sellTransactions.forEach(t => {
      salesByItem[t.itemId] = (salesByItem[t.itemId] || 0) + t.quantity;
    });

    const mostSoldItem = Object.entries(salesByItem).reduce((most, [itemId, quantity]) => {
      if (!most || quantity > most.quantity) {
        return { itemId, quantity };
      }
      return most;
    }, null as { itemId: string; quantity: number } | null);

    // Find most profitable item (buy low, sell high)
    const profitsByItem: Record<string, number> = {};
    buyTransactions.forEach(t => {
      profitsByItem[t.itemId] = (profitsByItem[t.itemId] || 0) - t.price;
    });
    sellTransactions.forEach(t => {
      profitsByItem[t.itemId] = (profitsByItem[t.itemId] || 0) + t.price;
    });

    const mostProfitableItem = Object.entries(profitsByItem).reduce((most, [itemId, profit]) => {
      if (!most || profit > most.profit) {
        return { itemId, profit };
      }
      return most;
    }, null as { itemId: string; profit: number } | null);

    return {
      totalTransactions: this.transactions.length,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      mostSoldItem,
      mostProfitableItem,
    };
  }

  /**
   * Update economy system (called every frame)
   */
  public update(deltaTime: number): void {
    // Check for daily shop restocks
    if (this.timeSystem.getCurrentTime().isNewDay) {
      this.performDailyUpdate();
    }
  }

  /**
   * Perform daily economy updates
   */
  private performDailyUpdate(): void {
    // Restock shops
    this.shops.forEach(shop => {
      if (shop.restockFrequency === 'daily') {
        this.restockShop(shop.id);
      }
    });

    // Update demand based on sales
    this.shops.forEach(shop => {
      shop.inventory.forEach(item => {
        // Decrease demand over time if not selling
        if (Date.now() - item.lastSold > 24 * 60 * 60 * 1000) {
          item.demand = Math.max(0.1, item.demand - 0.02);
        }
      });
    });
  }

  /**
   * Record transaction for history
   */
  private recordTransaction(
    type: 'buy' | 'sell' | 'trade',
    itemId: string,
    quantity: number,
    price: number,
    currencyId: string,
    timestamp: number,
    shopId?: string,
    success: boolean = true,
    reason?: string
  ): void {
    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      itemId,
      quantity,
      price,
      currencyId,
      timestamp,
      shopId,
      success,
      reason,
    };

    this.transactions.push(transaction);

    // Keep only last 1000 transactions
    if (this.transactions.length > 1000) {
      this.transactions = this.transactions.slice(-1000);
    }
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(limit: number = 50): Transaction[] {
    return this.transactions.slice(-limit).reverse();
  }

  /**
   * Save economy system state
   */
  public save(): {
    currencies: Record<string, Currency>;
    shops: Record<string, Shop>;
    transactions: Transaction[];
    priceHistory: Record<string, PriceHistory>;
  } {
    const currencies: Record<string, Currency> = {};
    const shops: Record<string, Shop> = {};
    const priceHistory: Record<string, PriceHistory> = {};

    this.currencies.forEach((currency, id) => {
      currencies[id] = currency;
    });

    this.shops.forEach((shop, id) => {
      shops[id] = shop;
    });

    this.priceHistory.forEach((history, id) => {
      priceHistory[id] = history;
    });

    return {
      currencies,
      shops,
      transactions: [...this.transactions],
      priceHistory,
    };
  }

  /**
   * Load economy system state
   */
  public load(data: {
    currencies: Record<string, Currency>;
    shops: Record<string, Shop>;
    transactions: Transaction[];
    priceHistory: Record<string, PriceHistory>;
  }): void {
    this.currencies.clear();
    this.shops.clear();
    this.priceHistory.clear();

    Object.entries(data.currencies).forEach(([id, currency]) => {
      this.currencies.set(id, currency);
    });

    Object.entries(data.shops).forEach(([id, shop]) => {
      this.shops.set(id, shop);
    });

    Object.entries(data.priceHistory).forEach(([id, history]) => {
      this.priceHistory.set(id, history);
    });

    this.transactions = [...data.transactions];
  }
}
