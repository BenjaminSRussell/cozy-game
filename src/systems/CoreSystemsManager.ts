/**
 * Core Systems Manager - Integration hub for Phase 1 cozy game systems
 * 
 * Manages and coordinates TimeSystem, ResourceManager, InventoryManager, and EconomyManager
 * to provide the core loop functionality based on cozy game architecture patterns.
 */

import { TimeSystem } from './TimeSystem';
import { ResourceManager } from './ResourceManager';
import { InventoryManager } from './InventoryManager';
import { EconomyManager } from './EconomyManager';
import { Item, ItemType } from '../types/game';

// ============================================================================
// CORE SYSTEMS MANAGER TYPES
// ============================================================================

export interface CoreSystemsState {
  timeSystem: any;
  resourceManager: any;
  inventoryManager: any;
  economyManager: any;
}

export interface DailyChecklist {
  completed: {
    mineRocks: boolean;
    digFossils: boolean;
    checkShop: boolean;
    waterCrops: boolean;
    harvestCrops: boolean;
    talkToVillagers: boolean;
  };
  rewards: {
    coins: number;
    experience: number;
  };
}

export interface PlayerProgress {
  level: number;
  experience: number;
  experienceToNext: number;
  totalCoinsEarned: number;
  totalItemsSold: number;
  daysPlayed: number;
  loginStreak: number;
}

// ============================================================================
// CORE SYSTEMS MANAGER CLASS
// ============================================================================

export class CoreSystemsManager {
  private timeSystem: TimeSystem;
  private resourceManager: ResourceManager;
  private inventoryManager: InventoryManager;
  private economyManager: EconomyManager;
  private playerProgress: PlayerProgress;
  private dailyChecklist: DailyChecklist;
  private lastLoginDate: number;

  constructor() {
    // Initialize systems in dependency order
    this.timeSystem = new TimeSystem();
    this.resourceManager = new ResourceManager(this.timeSystem);
    this.inventoryManager = new InventoryManager();
    this.economyManager = new EconomyManager(this.inventoryManager, this.timeSystem);
    
    this.playerProgress = this.initializePlayerProgress();
    this.dailyChecklist = this.initializeDailyChecklist();
    this.lastLoginDate = Date.now();
  }

  /**
   * Initialize player progress
   */
  private initializePlayerProgress(): PlayerProgress {
    return {
      level: 1,
      experience: 0,
      experienceToNext: 100,
      totalCoinsEarned: 0,
      totalItemsSold: 0,
      daysPlayed: 0,
      loginStreak: 1,
    };
  }

  /**
   * Initialize daily checklist
   */
  private initializeDailyChecklist(): DailyChecklist {
    return {
      completed: {
        mineRocks: false,
        digFossils: false,
        checkShop: false,
        waterCrops: false,
        harvestCrops: false,
        talkToVillagers: false,
      },
      rewards: {
        coins: 50,
        experience: 25,
      },
    };
  }

  /**
   * Update all systems - called every frame from game engine
   */
  public update(deltaTime: number): void {
    // Update time system first (drives other systems)
    this.timeSystem.update(deltaTime);
    
    // Update resource system
    this.resourceManager.update(deltaTime);
    
    // Update economy system
    this.economyManager.update(deltaTime);
    
    // Check for new day
    if (this.timeSystem.getCurrentTime().isNewDay) {
      this.handleNewDay();
    }
    
    // Check for login streak
    this.updateLoginStreak();
  }

  /**
   * Handle new day events
   */
  private handleNewDay(): void {
    // Reset daily checklist
    this.dailyChecklist = this.initializeDailyChecklist();
    
    // Update player progress
    this.playerProgress.daysPlayed++;
    
    console.log('🌅 New day! Daily checklist reset.');
  }

  /**
   * Update login streak
   */
  private updateLoginStreak(): void {
    const now = Date.now();
    const daysSinceLastLogin = Math.floor((now - this.lastLoginDate) / (24 * 60 * 60 * 1000));
    
    if (daysSinceLastLogin === 1) {
      this.playerProgress.loginStreak++;
    } else if (daysSinceLastLogin > 1) {
      this.playerProgress.loginStreak = 1;
    }
    
    this.lastLoginDate = now;
  }

  // ============================================================================
  // CORE GAME ACTIONS (Player Interactions)
  // ============================================================================

  /**
   * Mine rock at position
   */
  public mineRock(rockId: string): { success: boolean; rewards?: any } {
    if (this.timeSystem.mineRock(rockId)) {
      // Generate rewards based on rock type
      const rock = this.timeSystem.getAvailableRocks().find(r => r.id === rockId);
      if (!rock) return { success: false };

      let rewards: any = { items: [] };
      
      switch (rock.resourceType) {
        case 'stone':
          rewards.items.push(this.createItem('stone', 'Stone', ItemType.STONE, 5, '🪨'));
          break;
        case 'iron':
          rewards.items.push(this.createItem('iron_ore', 'Iron Ore', ItemType.ORE, 3, '⛏️'));
          break;
        case 'gold':
          rewards.items.push(this.createItem('gold_ore', 'Gold Ore', ItemType.ORE, 2, '🪙'));
          break;
        case 'diamond':
          rewards.items.push(this.createItem('diamond', 'Diamond', ItemType.ORE, 1, '💎'));
          break;
      }

      // Add items to inventory
      rewards.items.forEach((item: Item) => {
        this.inventoryManager.addItem('player_main', item, item.quantity);
      });

      // Update checklist
      this.dailyChecklist.completed.mineRocks = true;
      
      // Add experience
      this.addExperience(5);

      return { success: true, rewards };
    }

    return { success: false };
  }

  /**
   * Excavate fossil at position
   */
  public excavateFossil(fossilId: string): { success: boolean; rewards?: any } {
    if (this.timeSystem.excavateFossil(fossilId)) {
      const fossil = this.timeSystem.getAvailableFossils().find(f => f.id === fossilId);
      if (!fossil) return { success: false };

      const fossilItem = this.createItem(
        `fossil_${fossil.fossilType}`,
        `${fossil.fossilType.charAt(0).toUpperCase() + fossil.fossilType.slice(1)} Fossil`,
        ItemType.DECORATION,
        1,
        '🦕'
      );

      this.inventoryManager.addItem('player_main', fossilItem, 1);

      // Update checklist
      this.dailyChecklist.completed.digFossils = true;
      
      // Add experience
      this.addExperience(10);

      return { 
        success: true, 
        rewards: { items: [fossilItem] } 
      };
    }

    return { success: false };
  }

  /**
   * Harvest tree
   */
  public harvestTree(treeId: string): { success: boolean; rewards?: any } {
    const result = this.resourceManager.harvestTree(treeId);
    if (result) {
      const woodItem = this.createItem(
        `${result.woodType}_wood`,
        `${result.woodType.charAt(0).toUpperCase() + result.woodType.slice(1)} Wood`,
        ItemType.WOOD,
        result.quantity,
        '🪵'
      );

      this.inventoryManager.addItem('player_main', woodItem, result.quantity);
      
      // Add experience
      this.addExperience(3);

      return { 
        success: true, 
        rewards: { items: [woodItem] } 
      };
    }

    return { success: false };
  }

  /**
   * Fish at spot
   */
  public fish(spotId: string): { success: boolean; rewards?: any } {
    const result = this.resourceManager.fish(spotId);
    if (result) {
      const fishItem = this.createItem(
        result.fishType,
        result.fishType.charAt(0).toUpperCase() + result.fishType.slice(1),
        ItemType.CROP, // Using CROP type for fish for now
        result.size,
        '🐟'
      );

      this.inventoryManager.addItem('player_main', fishItem, result.size);
      
      // Add experience
      this.addExperience(7);

      return { 
        success: true, 
        rewards: { items: [fishItem] } 
      };
    }

    return { success: false };
  }

  /**
   * Forage item
   */
  public forage(forageableId: string): { success: boolean; rewards?: any } {
    const result = this.resourceManager.forage(forageableId);
    if (result) {
      const forageableItem = this.createItem(
        `forageable_${result.type}`,
        `${result.type.charAt(0).toUpperCase() + result.type.slice(1)}`,
        ItemType.CROP, // Using CROP type for forageables
        1,
        result.type === 'berry' ? '🫐' : result.type === 'mushroom' ? '🍄' : '🌸'
      );

      this.inventoryManager.addItem('player_main', forageableItem, 1);
      
      // Add experience
      this.addExperience(2);

      return { 
        success: true, 
        rewards: { items: [forageableItem] } 
      };
    }

    return { success: false };
  }

  /**
   * Buy item from shop
   */
  public buyItem(shopId: string, itemId: string, quantity: number = 1): boolean {
    return this.economyManager.buyItem(shopId, itemId, quantity);
  }

  /**
   * Sell item to shop
   */
  public sellItem(shopId: string, itemId: string, quantity: number = 1): boolean {
    const success = this.economyManager.sellItem(shopId, itemId, quantity);
    if (success) {
      // Update player progress
      this.playerProgress.totalItemsSold += quantity;
    }
    return success;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create item with default properties
   */
  private createItem(id: string, name: string, type: ItemType, quantity: number, spriteId: string): Item {
    const baseValues: Record<ItemType, number> = {
      [ItemType.CROP]: 10,
      [ItemType.ORE]: 15,
      [ItemType.WOOD]: 5,
      [ItemType.STONE]: 3,
      [ItemType.SEED]: 8,
      [ItemType.FURNITURE]: 50,
      [ItemType.DECORATION]: 25,
      [ItemType.TOOL]: 30,
    };

    return {
      id,
      name,
      type,
      quantity,
      sellValue: baseValues[type] || 10,
      spriteId,
      rarity: 'common',
    };
  }

  /**
   * Add experience to player
   */
  private addExperience(amount: number): void {
    this.playerProgress.experience += amount;
    
    // Check for level up
    while (this.playerProgress.experience >= this.playerProgress.experienceToNext) {
      this.playerProgress.experience -= this.playerProgress.experienceToNext;
      this.playerProgress.level++;
      this.playerProgress.experienceToNext = Math.floor(this.playerProgress.experienceToNext * 1.2);
      
      console.log(`🎉 Level up! You are now level ${this.playerProgress.level}`);
    }
  }

  /**
   * Check and reward daily checklist completion
   */
  public checkDailyChecklist(): { completed: boolean; rewards?: any } {
    const allCompleted = Object.values(this.dailyChecklist.completed).every(completed => completed);
    
    if (allCompleted && !this.dailyChecklist.rewards.coins) {
      // Award rewards
      this.economyManager.addCurrency('coins', this.dailyChecklist.rewards.coins);
      this.addExperience(this.dailyChecklist.rewards.experience);
      
      // Mark rewards as claimed
      this.dailyChecklist.rewards.coins = 0;
      this.dailyChecklist.rewards.experience = 0;
      
      return { 
        completed: true, 
        rewards: { 
          coins: 50, 
          experience: 25 
        } 
      };
    }
    
    return { completed: false };
  }

  // ============================================================================
  // GETTERS AND STATE ACCESS
  // ============================================================================

  /**
   * Get current game time
   */
  public getCurrentTime() {
    return this.timeSystem.getCurrentTime();
  }

  /**
   * Get formatted time string
   */
  public getFormattedTime(): string {
    return this.timeSystem.formatGameTime();
  }

  /**
   * Get available resources in area
   */
  public getResourcesInArea(center: { x: number; y: number }, radius: number) {
    return this.resourceManager.getResourcesInArea(center, radius);
  }

  /**
   * Get player inventory
   */
  public getPlayerInventory() {
    return this.inventoryManager.getInventory('player_main');
  }

  /**
   * Get player currency
   */
  public getPlayerCurrency(currencyId: string = 'coins'): number {
    return this.economyManager.getCurrencyAmount(currencyId);
  }

  /**
   * Get player progress
   */
  public getPlayerProgress(): PlayerProgress {
    return { ...this.playerProgress };
  }

  /**
   * Get daily checklist
   */
  public getDailyChecklist(): DailyChecklist {
    return { ...this.dailyChecklist };
  }

  /**
   * Get shop information
   */
  public getShop(shopId: string = 'general_store') {
    return this.economyManager.getShop(shopId);
  }

  /**
   * Get economy statistics
   */
  public getEconomyStats() {
    return this.economyManager.getEconomyStats();
  }

  /**
   * Get resource statistics
   */
  public getResourceStats() {
    return this.resourceManager.getResourceStats();
  }

  /**
   * Get inventory statistics
   */
  public getInventoryStats() {
    return this.inventoryManager.getInventoryStats('player_main');
  }

  // ============================================================================
  // SAVE/LOAD SYSTEMS
  // ============================================================================

  /**
   * Save all systems state
   */
  public save(): CoreSystemsState {
    return {
      timeSystem: this.timeSystem.save(),
      resourceManager: this.resourceManager.save(),
      inventoryManager: this.inventoryManager.save(),
      economyManager: this.economyManager.save(),
    };
  }

  /**
   * Load all systems state
   */
  public load(data: CoreSystemsState): void {
    this.timeSystem.load(data.timeSystem);
    this.resourceManager.load(data.resourceManager);
    this.inventoryManager.load(data.inventoryManager);
    this.economyManager.load(data.economyManager);
  }

  /**
   * Save player-specific data
   */
  public savePlayerData(): { progress: PlayerProgress; checklist: DailyChecklist; lastLogin: number } {
    return {
      progress: this.playerProgress,
      checklist: this.dailyChecklist,
      lastLogin: this.lastLoginDate,
    };
  }

  /**
   * Load player-specific data
   */
  public loadPlayerData(data: { progress: PlayerProgress; checklist: DailyChecklist; lastLogin: number }): void {
    this.playerProgress = data.progress;
    this.dailyChecklist = data.checklist;
    this.lastLoginDate = data.lastLogin;
  }
}
