/**
 * Resource Manager - Finite daily resources and renewable systems
 * 
 * Manages daily finite resources (rocks, fossils, trees) and renewable resources
 * based on Animal Crossing and Stardew Valley patterns for cozy game mechanics.
 */

import { Vector2D } from '../types/game';
import { TimeSystem, RockNode, FossilLocation } from './TimeSystem';

// ============================================================================
// RESOURCE SYSTEM TYPES
// ============================================================================

export interface ResourceNode {
  id: string;
  position: Vector2D;
  resourceType: ResourceType;
  available: boolean;
  lastHarvested: number;
  respawnTime?: number; // Time until resource respawns (for renewable resources)
  quantity?: number;   // Remaining quantity (for depletable resources)
}

export enum ResourceType {
  /** Daily finite resources */
  ROCK = 'rock',
  FOSSIL = 'fossil',
  
  /** Renewable resources */
  TREE = 'tree',
  FISHING_SPOT = 'fishing_spot',
  FORAGEABLE = 'forageable',
  
  /** Player-controlled resources */
  CROP = 'crop',
  BUILDING = 'building',
}

export interface TreeResource extends ResourceNode {
  resourceType: ResourceType.TREE;
  woodType: 'oak' | 'pine' | 'birch' | 'fruit';
  growthStage: TreeStage;
  regrowthTime: number; // Time to regrow after harvesting
}

export enum TreeStage {
  SEEDLING = 0,
  SAPLING = 1,
  YOUNG = 2,
  MATURE = 3,
  FULL_GROWN = 4,
}

export interface FishingSpot extends ResourceNode {
  resourceType: ResourceType.FISHING_SPOT;
  fishTypes: string[];
  activeHours: { start: number; end: number }; // Game hours when fishing is available
  weatherBonus: string[]; // Weather conditions that improve fishing
}

export interface ForageableNode extends ResourceNode {
  resourceType: ResourceType.FORAGEABLE;
  forageableType: 'berry' | 'mushroom' | 'flower' | 'herb';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  rarity: 'common' | 'uncommon' | 'rare';
}

export interface ResourceSystem {
  dailyResources: {
    rocks: RockNode[];
    fossils: FossilLocation[];
  };
  renewableResources: {
    trees: TreeResource[];
    fishingSpots: FishingSpot[];
    forageables: ForageableNode[];
  };
  playerResources: {
    crops: any[]; // Will be connected to existing crop system
    buildings: any[]; // Will be connected to existing building system
  };
}

// ============================================================================
// RESOURCE MANAGER CLASS
// ============================================================================

export class ResourceManager {
  private timeSystem: TimeSystem;
  private resourceSystem: ResourceSystem;
  /** Counted materials such as wood and stone. Keys are stored lowercase. */
  private resources: Map<string, number> = new Map();
  private readonly TREE_REGROWTH_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
  private readonly FORAGEABLE_RESPAWN_TIME = 2 * 24 * 60 * 60 * 1000; // 2 days

  constructor(timeSystem: TimeSystem) {
    this.timeSystem = timeSystem;
    this.resourceSystem = this.initializeResources();
  }

  /**
   * Initialize all resource systems
   */
  private initializeResources(): ResourceSystem {
    return {
      dailyResources: {
        rocks: this.timeSystem.getDailyReset().rockResources,
        fossils: this.timeSystem.getDailyReset().fossilSpots,
      },
      renewableResources: {
        trees: this.generateTrees(),
        fishingSpots: this.generateFishingSpots(),
        forageables: this.generateForageables(),
      },
      playerResources: {
        crops: [],
        buildings: [],
      },
    };
  }

  /**
   * Generate initial tree resources
   */
  private generateTrees(): TreeResource[] {
    const trees: TreeResource[] = [];
    const woodTypes: Array<'oak' | 'pine' | 'birch' | 'fruit'> = ['oak', 'pine', 'birch', 'fruit'];
    
    // Generate 15-20 trees across the map
    const treeCount = Math.floor(Math.random() * 6) + 15;
    
    for (let i = 0; i < treeCount; i++) {
      trees.push({
        id: `tree_${i}`,
        position: { x: Math.random() * 200, y: Math.random() * 200 },
        resourceType: ResourceType.TREE,
        available: true,
        lastHarvested: 0,
        woodType: woodTypes[Math.floor(Math.random() * woodTypes.length)],
        growthStage: TreeStage.FULL_GROWN,
        regrowthTime: this.TREE_REGROWTH_TIME,
      });
    }
    
    return trees;
  }

  /**
   * Generate fishing spots
   */
  private generateFishingSpots(): FishingSpot[] {
    const spots: FishingSpot[] = [];
    const fishTypes = ['bass', 'trout', 'salmon', 'catfish', 'tuna'];
    
    // Generate 8-12 fishing spots near water
    const spotCount = Math.floor(Math.random() * 5) + 8;
    
    for (let i = 0; i < spotCount; i++) {
      spots.push({
        id: `fishing_${i}`,
        position: { x: Math.random() * 200, y: Math.random() * 200 },
        resourceType: ResourceType.FISHING_SPOT,
        available: true,
        lastHarvested: 0,
        fishTypes: fishTypes.slice(0, Math.floor(Math.random() * 3) + 2), // 2-4 fish types per spot
        activeHours: { 
          start: 6, // 6 AM
          end: 18,  // 6 PM
        },
        weatherBonus: ['sunny', 'cloudy'],
      });
    }
    
    return spots;
  }

  /**
   * Generate forageable nodes
   */
  private generateForageables(): ForageableNode[] {
    const forageables: ForageableNode[] = [];
    const types: Array<'berry' | 'mushroom' | 'flower' | 'herb'> = ['berry', 'mushroom', 'flower', 'herb'];
    const seasons: Array<'spring' | 'summer' | 'autumn' | 'winter'> = ['spring', 'summer', 'autumn', 'winter'];
    const rarities: Array<'common' | 'uncommon' | 'rare'> = ['common', 'common', 'uncommon', 'rare'];
    
    // Generate 20-30 forageable nodes
    const forageableCount = Math.floor(Math.random() * 11) + 20;
    
    for (let i = 0; i < forageableCount; i++) {
      const season = seasons[Math.floor(Math.random() * seasons.length)];
      forageables.push({
        id: `forageable_${i}`,
        position: { x: Math.random() * 200, y: Math.random() * 200 },
        resourceType: ResourceType.FORAGEABLE,
        available: true,
        lastHarvested: 0,
        forageableType: types[Math.floor(Math.random() * types.length)],
        season,
        rarity: rarities[Math.floor(Math.random() * rarities.length)],
      });
    }
    
    return forageables;
  }

  /**
   * Update resource system - called every frame
   */
  public update(deltaTime: number): void {
    const now = Date.now();
    
    // Update renewable resources
    this.updateTrees(now);
    this.updateForageables(now);
    this.updateFishingSpots();
    
    // Sync daily resources with time system
    this.syncDailyResources();
  }

  /**
   * Update tree resources (regrowth)
   */
  private updateTrees(now: number): void {
    this.resourceSystem.renewableResources.trees.forEach(tree => {
      if (!tree.available && tree.lastHarvested > 0) {
        const timeSinceHarvest = now - tree.lastHarvested;
        if (timeSinceHarvest >= tree.regrowthTime) {
          // Tree has regrown
          tree.available = true;
          tree.growthStage = TreeStage.FULL_GROWN;
          tree.lastHarvested = 0;
        }
      }
    });
  }

  /**
   * Update forageable resources (respawn)
   */
  private updateForageables(now: number): void {
    const currentSeason = this.timeSystem.getCurrentTime().season;
    
    this.resourceSystem.renewableResources.forageables.forEach(forageable => {
      // Check if forageable is in season
      const inSeason = this.isForageableInSeason(forageable, currentSeason);
      
      if (!forageable.available && forageable.lastHarvested > 0 && inSeason) {
        const timeSinceHarvest = now - forageable.lastHarvested;
        if (timeSinceHarvest >= this.FORAGEABLE_RESPAWN_TIME) {
          // Forageable has respawned
          forageable.available = true;
          forageable.lastHarvested = 0;
        }
      } else if (!inSeason) {
        // Forageable is out of season
        forageable.available = false;
      }
    });
  }

  /**
   * Update fishing spots (time-based availability)
   */
  private updateFishingSpots(): void {
    const currentHour = Math.floor(this.timeSystem.getCurrentTime().gameTime / 60);
    
    this.resourceSystem.renewableResources.fishingSpots.forEach(spot => {
      // Check if fishing is available during current hours
      spot.available = currentHour >= spot.activeHours.start && currentHour < spot.activeHours.end;
    });
  }

  /**
   * Sync daily resources with time system
   */
  private syncDailyResources(): void {
    this.resourceSystem.dailyResources.rocks = this.timeSystem.getDailyReset().rockResources;
    this.resourceSystem.dailyResources.fossils = this.timeSystem.getDailyReset().fossilSpots;
  }

  /**
   * Check if forageable is available in current season
   */
  private isForageableInSeason(forageable: ForageableNode, currentSeason: string): boolean {
    // Simple season mapping - can be expanded
    const seasonMap: Record<string, string[]> = {
      spring: ['berry', 'flower', 'herb'],
      summer: ['berry', 'herb'],
      autumn: ['mushroom', 'berry'],
      winter: ['mushroom', 'herb'],
    };
    
    return seasonMap[currentSeason]?.includes(forageable.forageableType) || false;
  }

  // ============================================================================
  // RESOURCE INTERACTIONS
  // ============================================================================

  /**
   * Add to a counted material. `Wood` and `wood` are the same resource.
   */
  public addResource(type: string, amount: number): void {
    const key = type.toLowerCase();
    const current = this.resources.get(key) ?? 0;
    this.resources.set(key, current + amount);
  }

  /**
   * Read a counted material. Missing types are 0, not undefined.
   */
  public getResource(type: string): number {
    return this.resources.get(type.toLowerCase()) ?? 0;
  }

  /**
   * Harvest a tree
   */
  public harvestTree(treeId: string): { success: boolean; woodType: string; quantity: number } | null {
    const tree = this.resourceSystem.renewableResources.trees.find(t => t.id === treeId);
    
    if (!tree || !tree.available || tree.growthStage !== TreeStage.FULL_GROWN) {
      return null;
    }
    
    // Harvest tree
    tree.available = false;
    tree.lastHarvested = Date.now();
    tree.growthStage = TreeStage.SAPLING;
    
    // Return harvest result
    const quantity = tree.woodType === 'fruit' ? 3 : 2; // Fruit trees give more wood
    return {
      success: true,
      woodType: tree.woodType,
      quantity,
    };
  }

  /**
   * Fish at a fishing spot
   */
  public fish(spotId: string): { success: boolean; fishType: string; size: number } | null {
    const spot = this.resourceSystem.renewableResources.fishingSpots.find(s => s.id === spotId);
    
    if (!spot || !spot.available) {
      return null;
    }
    
    // Simple fishing logic - can be expanded with skill, weather, etc.
    const fishType = spot.fishTypes[Math.floor(Math.random() * spot.fishTypes.length)];
    const size = Math.floor(Math.random() * 3) + 1; // Size 1-3
    
    return {
      success: true,
      fishType,
      size,
    };
  }

  /**
   * Forage a resource
   */
  public forage(forageableId: string): { success: boolean; type: string; rarity: string } | null {
    const forageable = this.resourceSystem.renewableResources.forageables.find(f => f.id === forageableId);
    
    if (!forageable || !forageable.available) {
      return null;
    }
    
    // Harvest forageable
    forageable.available = false;
    forageable.lastHarvested = Date.now();
    
    return {
      success: true,
      type: forageable.forageableType,
      rarity: forageable.rarity,
    };
  }

  /**
   * Get available resources by type
   */
  public getAvailableResources(type: ResourceType): any[] {
    switch (type) {
      case ResourceType.ROCK:
        return this.resourceSystem.dailyResources.rocks.filter((rock: any) => rock.available);
      case ResourceType.FOSSIL:
        return this.resourceSystem.dailyResources.fossils.filter((fossil: any) => fossil.available);
      case ResourceType.TREE:
        return this.resourceSystem.renewableResources.trees.filter(tree => tree.available);
      case ResourceType.FISHING_SPOT:
        return this.resourceSystem.renewableResources.fishingSpots.filter(spot => spot.available);
      case ResourceType.FORAGEABLE:
        return this.resourceSystem.renewableResources.forageables.filter(forageable => forageable.available);
      default:
        return [];
    }
  }

  /**
   * Get all resources in area (for rendering)
   */
  public getResourcesInArea(center: Vector2D, radius: number): any[] {
    const allResources: any[] = [
      ...this.resourceSystem.dailyResources.rocks,
      ...this.resourceSystem.dailyResources.fossils,
      ...this.resourceSystem.renewableResources.trees,
      ...this.resourceSystem.renewableResources.fishingSpots,
      ...this.resourceSystem.renewableResources.forageables,
    ];
    
    return allResources.filter(resource => {
      const distance = Math.sqrt(
        Math.pow(resource.position.x - center.x, 2) + 
        Math.pow(resource.position.y - center.y, 2)
      );
      return distance <= radius;
    });
  }

  /**
   * Get resource statistics
   */
  public getResourceStats(): {
    dailyResources: { rocks: number; fossils: number };
    renewableResources: { trees: number; fishingSpots: number; forageables: number };
  } {
    return {
      dailyResources: {
        rocks: this.resourceSystem.dailyResources.rocks.filter(r => r.available).length,
        fossils: this.resourceSystem.dailyResources.fossils.filter(f => f.available).length,
      },
      renewableResources: {
        trees: this.resourceSystem.renewableResources.trees.filter(t => t.available).length,
        fishingSpots: this.resourceSystem.renewableResources.fishingSpots.filter(s => s.available).length,
        forageables: this.resourceSystem.renewableResources.forageables.filter(f => f.available).length,
      },
    };
  }

  /**
   * Save resource system state
   */
  public save(): ResourceSystem {
    return JSON.parse(JSON.stringify(this.resourceSystem));
  }

  /**
   * Load resource system state
   */
  public load(data: ResourceSystem): void {
    this.resourceSystem = JSON.parse(JSON.stringify(data));
  }
}
