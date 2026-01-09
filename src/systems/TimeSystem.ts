/**
 * Time System - Core time management for cozy game mechanics
 * 
 * Implements real-time progression with daily resets, seasonal changes,
 * and event scheduling based on Animal Crossing and Stardew Valley patterns.
 */

import { Season } from '../types/game';

// ============================================================================
// TIME SYSTEM TYPES
// ============================================================================

export interface GameTime {
  /** Real-world timestamp */
  realTime: number;
  /** In-game time (minutes since midnight) */
  gameTime: number;
  /** Current day number (increments daily) */
  day: number;
  /** Current season */
  season: Season;
  /** Year number */
  year: number;
  /** Whether it's a new day (for daily resets) */
  isNewDay: boolean;
}

export interface ResourceNode {
  id: string;
  position: { x: number; y: number };
  resourceType: string;
  available: boolean;
  lastHarvested: number;
}

export interface RockNode extends ResourceNode {
  resourceType: 'stone' | 'iron' | 'gold' | 'diamond';
}

export interface FossilLocation extends ResourceNode {
  resourceType: 'fossil';
  fossilType: string;
}

export interface DailyResetSystem {
  /** Last time daily reset occurred */
  lastReset: number;
  /** Resources that reset daily */
  rockResources: RockNode[];
  /** Fossil locations that refresh */
  fossilSpots: FossilLocation[];
  /** Shop inventory that rotates */
  shopInventory: ShopStock[];
  /** Villager dialogue pools that refresh */
  villagerDialogues: DialoguePool[];
}

export interface ShopStock {
  itemId: string;
  quantity: number;
  price: number;
  dailyRestock: boolean;
}

export interface DialoguePool {
  npcId: string;
  dialogueIds: string[];
  lastUsed: number;
}

// ============================================================================
// TIME SYSTEM CLASS
// ============================================================================

export class TimeSystem {
  private currentTime: GameTime;
  private dailyReset: DailyResetSystem;
  private readonly DAY_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly GAME_MINUTES_PER_REAL_SECOND = 0.1; // 1 real second = 0.1 game minutes
  private readonly DAILY_RESET_HOUR = 5; // 5 AM like Animal Crossing

  constructor() {
    this.currentTime = this.initializeTime();
    this.dailyReset = this.initializeDailyReset();
  }

  /**
   * Initialize time system with current real-world time
   */
  private initializeTime(): GameTime {
    const now = Date.now();
    return {
      realTime: now,
      gameTime: this.calculateGameTime(now),
      day: Math.floor(now / this.DAY_DURATION),
      season: this.calculateSeason(now),
      year: new Date(now).getFullYear(),
      isNewDay: true,
    };
  }

  /**
   * Initialize daily reset system
   */
  private initializeDailyReset(): DailyResetSystem {
    return {
      lastReset: Date.now(),
      rockResources: this.generateRockNodes(),
      fossilSpots: this.generateFossilLocations(),
      shopInventory: this.generateShopStock(),
      villagerDialogues: this.generateDialoguePools(),
    };
  }

  /**
   * Update time system - called every frame
   */
  public update(deltaTime: number): void {
    const now = Date.now();
    const previousDay = this.currentTime.day;
    
    // Update game time
    this.currentTime.realTime = now;
    this.currentTime.gameTime = this.calculateGameTime(now);
    this.currentTime.day = Math.floor(now / this.DAY_DURATION);
    this.currentTime.season = this.calculateSeason(now);
    this.currentTime.year = new Date(now).getFullYear();
    
    // Check for new day
    this.currentTime.isNewDay = this.currentTime.day > previousDay;
    
    // Trigger daily reset if needed
    if (this.shouldPerformDailyReset(now)) {
      this.performDailyReset();
    }
  }

  /**
   * Calculate in-game time based on real time
   */
  private calculateGameTime(realTime: number): number {
    const startOfDay = new Date(realTime);
    startOfDay.setHours(0, 0, 0, 0);
    const minutesSinceMidnight = (realTime - startOfDay.getTime()) / (1000 * 60);
    return Math.floor(minutesSinceMidnight * this.GAME_MINUTES_PER_REAL_SECOND) % (24 * 60);
  }

  /**
   * Calculate current season based on real-world month
   */
  private calculateSeason(realTime: number): Season {
    const month = new Date(realTime).getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  /**
   * Check if daily reset should occur
   */
  private shouldPerformDailyReset(now: number): boolean {
    const lastResetDate = new Date(this.dailyReset.lastReset);
    const currentDate = new Date(now);
    
    return currentDate.getDate() !== lastResetDate.getDate() ||
           currentDate.getMonth() !== lastResetDate.getMonth() ||
           currentDate.getFullYear() !== lastResetDate.getFullYear();
  }

  /**
   * Perform daily reset of all resources
   */
  private performDailyReset(): void {
    const now = Date.now();
    
    // Reset rock resources
    this.dailyReset.rockResources.forEach((rock: RockNode) => {
      rock.available = true;
      rock.lastHarvested = 0;
    });
    
    // Reset fossil spots
    this.dailyReset.fossilSpots.forEach((fossil: FossilLocation) => {
      fossil.available = true;
      fossil.lastHarvested = 0;
    });
    
    // Restock shop
    this.dailyReset.shopInventory = this.generateShopStock();
    
    // Refresh villager dialogues
    this.dailyReset.villagerDialogues = this.generateDialoguePools();
    
    // Update last reset time
    this.dailyReset.lastReset = now;
    
    console.log('🌅 Daily reset completed - resources refreshed!');
  }

  /**
   * Generate rock nodes for daily mining
   */
  private generateRockNodes(): RockNode[] {
    const rocks: RockNode[] = [];
    const rockTypes: Array<'stone' | 'iron' | 'gold' | 'diamond'> = ['stone', 'stone', 'stone', 'iron', 'iron', 'gold', 'diamond'];
    
    // Generate 6 rocks per day (Animal Crossing pattern)
    for (let i = 0; i < 6; i++) {
      rocks.push({
        id: `rock_${i}`,
        position: { x: Math.random() * 100, y: Math.random() * 100 },
        resourceType: rockTypes[Math.floor(Math.random() * rockTypes.length)],
        available: true,
        lastHarvested: 0,
      });
    }
    
    return rocks;
  }

  /**
   * Generate fossil locations
   */
  private generateFossilLocations(): FossilLocation[] {
    const fossils: FossilLocation[] = [];
    const fossilTypes = ['triceratops', 'trex', 'stegosaurus', 'pterodactyl', 'mammoth'];
    
    // Generate 4 fossil spots per day
    for (let i = 0; i < 4; i++) {
      fossils.push({
        id: `fossil_${i}`,
        position: { x: Math.random() * 100, y: Math.random() * 100 },
        resourceType: 'fossil',
        fossilType: fossilTypes[Math.floor(Math.random() * fossilTypes.length)],
        available: true,
        lastHarvested: 0,
      });
    }
    
    return fossils;
  }

  /**
   * Generate daily shop stock
   */
  private generateShopStock(): ShopStock[] {
    const items = [
      { id: 'wheat_seeds', basePrice: 10 },
      { id: 'carrot_seeds', basePrice: 15 },
      { id: 'tomato_seeds', basePrice: 20 },
      { id: 'corn_seeds', basePrice: 25 },
      { id: 'basic_fertilizer', basePrice: 30 },
      { id: 'watering_can', basePrice: 50 },
    ];
    
    return items.map(item => ({
      itemId: item.id,
      quantity: Math.floor(Math.random() * 5) + 3, // 3-7 items
      price: Math.floor(item.basePrice * (0.8 + Math.random() * 0.4)), // ±20% price variation
      dailyRestock: true,
    }));
  }

  /**
   * Generate dialogue pools for villagers
   */
  private generateDialoguePools(): DialoguePool[] {
    const npcs = ['villager_1', 'villager_2', 'villager_3'];
    
    return npcs.map(npcId => ({
      npcId,
      dialogueIds: Array.from({ length: 5 }, (_, i) => `${npcId}_dialogue_${i}`),
      lastUsed: 0,
    }));
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current game time
   */
  public getCurrentTime(): GameTime {
    return { ...this.currentTime };
  }

  /**
   * Get daily reset system
   */
  public getDailyReset(): DailyResetSystem {
    return { ...this.dailyReset };
  }

  /**
   * Mine a rock node
   */
  public mineRock(rockId: string): boolean {
    const rock = this.dailyReset.rockResources.find(r => r.id === rockId);
    if (rock && rock.available) {
      rock.available = false;
      rock.lastHarvested = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Excavate fossil location
   */
  public excavateFossil(fossilId: string): boolean {
    const fossil = this.dailyReset.fossilSpots.find(f => f.id === fossilId);
    if (fossil && fossil.available) {
      fossil.available = false;
      fossil.lastHarvested = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get available rock nodes
   */
  public getAvailableRocks(): RockNode[] {
    return this.dailyReset.rockResources.filter(rock => rock.available);
  }

  /**
   * Get available fossil spots
   */
  public getAvailableFossils(): FossilLocation[] {
    return this.dailyReset.fossilSpots.filter(fossil => fossil.available);
  }

  /**
   * Get current shop inventory
   */
  public getShopInventory(): ShopStock[] {
    return [...this.dailyReset.shopInventory];
  }

  /**
   * Get villager dialogue pool
   */
  public getDialoguePool(npcId: string): DialoguePool | undefined {
    return this.dailyReset.villagerDialogues.find(pool => pool.npcId === npcId);
  }

  /**
   * Format game time for display (e.g., "6:00 AM")
   */
  public formatGameTime(): string {
    const hours = Math.floor(this.currentTime.gameTime / 60);
    const minutes = this.currentTime.gameTime % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Check if it's morning (6 AM - 12 PM)
   */
  public isMorning(): boolean {
    const hours = Math.floor(this.currentTime.gameTime / 60);
    return hours >= 6 && hours < 12;
  }

  /**
   * Check if it's evening (6 PM - 10 PM)
   */
  public isEvening(): boolean {
    const hours = Math.floor(this.currentTime.gameTime / 60);
    return hours >= 18 && hours < 22;
  }

  /**
   * Save time system state
   */
  public save(): { time: GameTime; dailyReset: DailyResetSystem } {
    return {
      time: { ...this.currentTime },
      dailyReset: { ...this.dailyReset },
    };
  }

  /**
   * Load time system state
   */
  public load(data: { time: GameTime; dailyReset: DailyResetSystem }): void {
    this.currentTime = { ...data.time };
    this.dailyReset = { ...data.dailyReset };
  }
}
