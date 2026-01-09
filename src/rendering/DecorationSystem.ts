/**
 * Enhanced Decoration System for 2.5D Isometric World
 * 
 * Rich environmental decorations with seasonal variations and interactions
 */

export interface DecorationVoxel {
  x: number;
  y: number;
  z: number;
  decorationType: 'tree' | 'flower' | 'rock' | 'bush' | 'fence' | 'lamp' | 'bench' | 'fountain' | 'statue';
  variant: string; // Specific variant like 'oak', 'pine', 'rose', etc.
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  size: number; // 1-3 scale
  rotation: number; // 0, 90, 180, 270 degrees
  interactive: boolean;
  harvestable?: boolean;
  collectible?: {
    type: string;
    quantity: number;
    respawnTime: number;
    lastCollected: number;
  };
  lighting?: {
    color: string;
    intensity: number;
    radius: number;
  };
  animation?: {
    type: 'sway' | 'glow' | 'sparkle' | 'ripple';
    speed: number;
    amplitude: number;
  };
}

export interface TreeConfig {
  type: string;
  name: string;
  height: number;
  width: number;
  colors: {
    spring: string;
    summer: string;
    autumn: string;
    winter: string;
    trunk: string;
  };
  seasonal: boolean;
  fruit?: {
    type: string;
    color: string;
    season: string;
    respawnTime: number;
  };
  woodYield: number;
  growthTime: number;
}

export interface FlowerConfig {
  type: string;
  name: string;
  height: number;
  colors: string[];
  bloomSeason: string;
    lifespan: number; // Days
    spreadChance: number; // Chance to spread to adjacent tiles
    fragrance?: {
      type: string;
      radius: number;
      effect: string;
    };
  }

export interface RockConfig {
  type: string;
  name: string;
  size: { min: number; max: number };
  colors: string[];
  shape: 'rounded' | 'angular' | 'flat' | 'tall';
  minable: boolean;
  resource?: {
    type: string;
    yield: number;
  };
}

export interface FenceConfig {
  type: string;
  name: string;
  height: number;
  width: number;
  colors: string[];
  material: 'wood' | 'stone' | 'metal' | 'iron';
  durability: number;
  connectable: boolean;
}

export interface DecorationConfig {
  type: string;
  category: 'nature' | 'structure' | 'utility' | 'decorative';
  placement: 'ground' | 'wall' | 'ceiling' | 'water';
  cost: number;
  sellValue: number;
  unlockLevel: number;
  seasonal: boolean;
  interactive: boolean;
}

export class DecorationSystem {
  private decorations: Map<string, DecorationVoxel> = new Map();
  private treeConfigs: Map<string, TreeConfig> = new Map();
  private flowerConfigs: Map<string, FlowerConfig> = new Map();
  private rockConfigs: Map<string, RockConfig> = new Map();
  private fenceConfigs: Map<string, FenceConfig> = new Map();
  private decorationConfigs: Map<string, DecorationConfig> = new Map();
  private currentSeason: 'spring' | 'summer' | 'autumn' | 'winter' = 'spring';

  constructor() {
    this.initializeConfigs();
    this.generateInitialDecorations();
  }

  /**
   * Initialize all decoration configurations
   */
  private initializeConfigs(): void {
    this.initializeTreeConfigs();
    this.initializeFlowerConfigs();
    this.initializeRockConfigs();
    this.initializeFenceConfigs();
    this.initializeDecorationConfigs();
  }

  /**
   * Initialize tree configurations
   */
  private initializeTreeConfigs(): void {
    const trees: TreeConfig[] = [
      {
        type: 'oak',
        name: 'Oak Tree',
        height: 4,
        width: 3,
        colors: {
          spring: '#90EE90',
          summer: '#228B22',
          autumn: '#FF8C00',
          winter: '#8B4513',
          trunk: '#654321'
        },
        seasonal: true,
        fruit: {
          type: 'acorn',
          color: '#8B4513',
          season: 'autumn',
          respawnTime: 7
        },
        woodYield: 5,
        growthTime: 30
      },
      {
        type: 'pine',
        name: 'Pine Tree',
        height: 5,
        width: 2,
        colors: {
          spring: '#0F5F0F',
          summer: '#0F5F0F',
          autumn: '#0F5F0F',
          winter: '#0F3F0F',
          trunk: '#4A4A4A'
        },
        seasonal: true,
        woodYield: 4,
        growthTime: 25
      },
      {
        type: 'birch',
        name: 'Birch Tree',
        height: 3,
        width: 2,
        colors: {
          spring: '#98FB98',
          summer: '#90EE90',
          autumn: '#FFD700',
          winter: '#F0F8FF',
          trunk: '#FFFFFF'
        },
        seasonal: true,
        woodYield: 3,
        growthTime: 20
      },
      {
        type: 'willow',
        name: 'Weeping Willow',
        height: 4,
        width: 4,
        colors: {
          spring: '#ADFF2F',
          summer: '#9ACD32',
          autumn: '#DAA520',
          winter: '#8B7355',
          trunk: '#654321'
        },
        seasonal: true,
        woodYield: 6,
        growthTime: 35
      },
      {
        type: 'cherry',
        name: 'Cherry Blossom',
        height: 3,
        width: 3,
        colors: {
          spring: '#FFB6C1',
          summer: '#228B22',
          autumn: '#FF8C00',
          winter: '#8B4513',
          trunk: '#654321'
        },
        seasonal: true,
        fruit: {
          type: 'cherry',
          color: '#DC143C',
          season: 'spring',
          respawnTime: 5
        },
        woodYield: 3,
        growthTime: 25
      },
      {
        type: 'palm',
        name: 'Palm Tree',
        height: 4,
        width: 3,
        colors: {
          spring: '#228B22',
          summer: '#228B22',
          autumn: '#228B22',
          winter: '#228B22',
          trunk: '#8B4513'
        },
        seasonal: false,
        woodYield: 4,
        growthTime: 30
      },
      {
        type: 'fruit',
        name: 'Fruit Tree',
        height: 3,
        width: 3,
        colors: {
          spring: '#FFB6C1',
          summer: '#228B22',
          autumn: '#FF8C00',
          winter: '#8B4513',
          trunk: '#654321'
        },
        seasonal: true,
        fruit: {
          type: 'apple',
          color: '#FF0000',
          season: 'summer',
          respawnTime: 3
        },
        woodYield: 4,
        growthTime: 28
      }
    ];

    trees.forEach(config => {
      this.treeConfigs.set(config.type, config);
    });
  }

  /**
   * Initialize flower configurations
   */
  private initializeFlowerConfigs(): void {
    const flowers: FlowerConfig[] = [
      {
        type: 'tulip',
        name: 'Tulip',
        height: 1,
        colors: ['#FF0000', '#FFA500', '#FFFF00', '#FF00FF', '#0000FF'],
        bloomSeason: 'spring',
        lifespan: 14,
        spreadChance: 0.1,
        fragrance: {
          type: 'sweet',
          radius: 2,
          effect: 'happiness_boost'
        }
      },
      {
        type: 'rose',
        name: 'Rose',
        height: 1,
        colors: ['#FF0000', '#FF69B4', '#FFFFFF', '#FFFF00'],
        bloomSeason: 'summer',
        lifespan: 21,
        spreadChance: 0.05,
        fragrance: {
          type: 'romantic',
          radius: 3,
          effect: 'attraction'
        }
      },
      {
        type: 'sunflower',
        name: 'Sunflower',
        height: 2,
        colors: ['#FFD700'],
        bloomSeason: 'summer',
        lifespan: 28,
        spreadChance: 0.08
      },
      {
        type: 'lavender',
        name: 'Lavender',
        height: 1,
        colors: ['#9370DB', '#8B008B'],
        bloomSeason: 'summer',
        lifespan: 21,
        spreadChance: 0.15,
        fragrance: {
          type: 'calming',
          radius: 4,
          effect: 'stress_relief'
        }
      },
      {
        type: 'daisy',
        name: 'Daisy',
        height: 1,
        colors: ['#FFFFFF', '#FFFFE0'],
        bloomSeason: 'spring',
        lifespan: 14,
        spreadChance: 0.2
      },
      {
        type: 'lily',
        name: 'Water Lily',
        height: 1,
        colors: ['#FFFFFF', '#FF69B4', '#FFFF00'],
        bloomSeason: 'summer',
        lifespan: 18,
        spreadChance: 0.1
      }
    ];

    flowers.forEach(config => {
      this.flowerConfigs.set(config.type, config);
    });
  }

  /**
   * Initialize rock configurations
   */
  private initializeRockConfigs(): void {
    const rocks: RockConfig[] = [
      {
        type: 'pebble',
        name: 'Pebble',
        size: { min: 1, max: 1 },
        colors: ['#808080', '#696969', '#A9A9A9'],
        shape: 'rounded',
        minable: false
      },
      {
        type: 'boulder',
        name: 'Boulder',
        size: { min: 2, max: 3 },
        colors: ['#696969', '#2F4F4F', '#708090'],
        shape: 'angular',
        minable: true,
        resource: {
          type: 'stone',
          yield: 5
        }
      },
      {
        type: 'cliff',
        name: 'Rock Cliff',
        size: { min: 3, max: 4 },
        colors: ['#36454F', '#2F4F4F', '#483D8B'],
        shape: 'tall',
        minable: true,
        resource: {
          type: 'stone',
          yield: 10
        }
      },
      {
        type: 'marble',
        name: 'Marble Rock',
        size: { min: 2, max: 3 },
        colors: ['#F8F8FF', '#FFFAFA', '#F5F5F5'],
        shape: 'rounded',
        minable: true,
        resource: {
          type: 'marble',
          yield: 3
        }
      }
    ];

    rocks.forEach(config => {
      this.rockConfigs.set(config.type, config);
    });
  }

  /**
   * Initialize fence configurations
   */
  private initializeFenceConfigs(): void {
    const fences: FenceConfig[] = [
      {
        type: 'wood_picket',
        name: 'Wood Picket Fence',
        height: 2,
        width: 1,
        colors: ['#8B4513', '#A0522D', '#DEB887'],
        material: 'wood',
        durability: 50,
        connectable: true
      },
      {
        type: 'wood_rail',
        name: 'Wood Rail Fence',
        height: 1,
        width: 1,
        colors: ['#654321', '#8B4513'],
        material: 'wood',
        durability: 40,
        connectable: true
      },
      {
        type: 'stone_wall',
        name: 'Stone Wall',
        height: 2,
        width: 1,
        colors: ['#808080', '#696969', '#A9A9A9'],
        material: 'stone',
        durability: 100,
        connectable: true
      },
      {
        type: 'iron_fence',
        name: 'Iron Fence',
        height: 2,
        width: 1,
        colors: ['#434343', '#2F4F4F'],
        material: 'iron',
        durability: 80,
        connectable: true
      }
    ];

    fences.forEach(config => {
      this.fenceConfigs.set(config.type, config);
    });
  }

  /**
   * Initialize general decoration configurations
   */
  private initializeDecorationConfigs(): void {
    const decorations: DecorationConfig[] = [
      {
        type: 'bench',
        category: 'utility',
        placement: 'ground',
        cost: 50,
        sellValue: 25,
        unlockLevel: 1,
        seasonal: false,
        interactive: true
      },
      {
        type: 'lamp',
        category: 'utility',
        placement: 'ground',
        cost: 75,
        sellValue: 40,
        unlockLevel: 2,
        seasonal: false,
        interactive: true
      },
      {
        type: 'fountain',
        category: 'decorative',
        placement: 'ground',
        cost: 200,
        sellValue: 100,
        unlockLevel: 3,
        seasonal: false,
        interactive: true
      },
      {
        type: 'statue',
        category: 'decorative',
        placement: 'ground',
        cost: 150,
        sellValue: 75,
        unlockLevel: 4,
        seasonal: false,
        interactive: false
      }
    ];

    decorations.forEach(config => {
      this.decorationConfigs.set(config.type, config);
    });
  }

  /**
   * Generate initial decorations
   */
  private generateInitialDecorations(): void {
    const worldSize = 20;
    const decorationCount = Math.floor(worldSize * worldSize * 0.15); // 15% coverage

    for (let i = 0; i < decorationCount; i++) {
      const x = Math.floor(Math.random() * worldSize);
      const y = Math.floor(Math.random() * worldSize);
      
      // Random decoration type
      const rand = Math.random();
      let decorationType: string;
      
      if (rand < 0.4) {
        // Trees (40%)
        const treeTypes = Array.from(this.treeConfigs.keys());
        decorationType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        this.placeTree(x, y, decorationType);
      } else if (rand < 0.7) {
        // Flowers (30%)
        const flowerTypes = Array.from(this.flowerConfigs.keys());
        decorationType = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
        this.placeFlower(x, y, decorationType);
      } else if (rand < 0.9) {
        // Rocks (20%)
        const rockTypes = Array.from(this.rockConfigs.keys());
        decorationType = rockTypes[Math.floor(Math.random() * rockTypes.length)];
        this.placeRock(x, y, decorationType);
      } else {
        // Other decorations (10%)
        const decorationTypes = Array.from(this.decorationConfigs.keys());
        decorationType = decorationTypes[Math.floor(Math.random() * decorationTypes.length)];
        this.placeDecoration(x, y, decorationType);
      }
    }
  }

  /**
   * Place a tree
   */
  public placeTree(x: number, y: number, treeType: string): boolean {
    const id = `tree_${x}_${y}`;
    
    if (this.decorations.has(id)) {
      return false;
    }

    const config = this.treeConfigs.get(treeType);
    if (!config) {
      return false;
    }

    const tree: DecorationVoxel = {
      x,
      y,
      z: 0,
      decorationType: 'tree',
      variant: treeType,
      season: this.currentSeason,
      size: 1,
      rotation: Math.floor(Math.random() * 4) * 90,
      interactive: true,
      harvestable: !!config.fruit,
      collectible: config.fruit ? {
        type: config.fruit.type,
        quantity: Math.floor(Math.random() * 3) + 1,
        respawnTime: config.fruit.respawnTime,
        lastCollected: 0
      } : undefined,
      animation: {
        type: 'sway',
        speed: 0.5,
        amplitude: 0.1
      }
    };

    this.decorations.set(id, tree);
    return true;
  }

  /**
   * Place a flower
   */
  public placeFlower(x: number, y: number, flowerType: string): boolean {
    const id = `flower_${x}_${y}`;
    
    if (this.decorations.has(id)) {
      return false;
    }

    const config = this.flowerConfigs.get(flowerType);
    if (!config) {
      return false;
    }

    const flower: DecorationVoxel = {
      x,
      y,
      z: 0,
      decorationType: 'flower',
      variant: flowerType,
      season: this.currentSeason,
      size: 1,
      rotation: Math.floor(Math.random() * 4) * 90,
      interactive: true,
      animation: {
        type: 'sway',
        speed: 0.8,
        amplitude: 0.05
      }
    };

    this.decorations.set(id, flower);
    return true;
  }

  /**
   * Place a rock
   */
  public placeRock(x: number, y: number, rockType: string): boolean {
    const id = `rock_${x}_${y}`;
    
    if (this.decorations.has(id)) {
      return false;
    }

    const config = this.rockConfigs.get(rockType);
    if (!config) {
      return false;
    }

    const size = Math.floor(Math.random() * (config.size.max - config.size.min + 1)) + config.size.min;

    const rock: DecorationVoxel = {
      x,
      y,
      z: 0,
      decorationType: 'rock',
      variant: rockType,
      season: this.currentSeason,
      size,
      rotation: Math.floor(Math.random() * 4) * 90,
      interactive: config.minable,
      collectible: config.resource ? {
        type: config.resource.type,
        quantity: config.resource.yield,
        respawnTime: -1, // Doesn't respawn
        lastCollected: 0
      } : undefined
    };

    this.decorations.set(id, rock);
    return true;
  }

  /**
   * Place a general decoration
   */
  public placeDecoration(x: number, y: number, decorationType: string): boolean {
    const id = `decoration_${x}_${y}`;
    
    if (this.decorations.has(id)) {
      return false;
    }

    const config = this.decorationConfigs.get(decorationType);
    if (!config) {
      return false;
    }

    const decoration: DecorationVoxel = {
      x,
      y,
      z: 0,
      decorationType: decorationType as any,
      variant: 'default',
      season: this.currentSeason,
      size: 1,
      rotation: 0,
      interactive: config.interactive,
      lighting: decorationType === 'lamp' || decorationType === 'fountain' ? {
        color: '#FFD700',
        intensity: 0.8,
        radius: 3
      } : undefined
    };

    this.decorations.set(id, decoration);
    return true;
  }

  /**
   * Update season for all decorations
   */
  public updateSeason(newSeason: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    this.currentSeason = newSeason;
    
    this.decorations.forEach(decoration => {
      decoration.season = newSeason;
      
      // Update seasonal colors for trees
      if (decoration.decorationType === 'tree') {
        const config = this.treeConfigs.get(decoration.variant);
        if (config && config.seasonal) {
          // Tree appearance will be updated in renderer
        }
      }
      
      // Update flower blooming
      if (decoration.decorationType === 'flower') {
        const config = this.flowerConfigs.get(decoration.variant);
        if (config && config.bloomSeason !== newSeason) {
          // Flowers will be hidden in non-bloom seasons
        }
      }
    });
  }

  /**
   * Collect from decoration
   */
  public collectFromDecoration(x: number, y: number): {
    success: boolean;
    item?: {
      type: string;
      quantity: number;
    };
  } {
    const id = this.findDecorationAt(x, y);
    if (!id) {
      return { success: false };
    }

    const decoration = this.decorations.get(id);
    if (!decoration || !decoration.collectible) {
      return { success: false };
    }

    const currentTime = Date.now();
    const timeSinceLastCollect = currentTime - decoration.collectible.lastCollected;
    
    if (timeSinceLastCollect < decoration.collectible.respawnTime * 24 * 60 * 60 * 1000) {
      return { success: false }; // Not ready to collect
    }

    const item = {
      type: decoration.collectible.type,
      quantity: decoration.collectible.quantity
    };

    decoration.collectible.lastCollected = currentTime;

    return { success: true, item };
  }

  /**
   * Find decoration at position
   */
  private findDecorationAt(x: number, y: number): string | null {
    for (const [id, decoration] of this.decorations) {
      if (decoration.x === x && decoration.y === y) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get decoration at position
   */
  public getDecorationAt(x: number, y: number): DecorationVoxel | null {
    const id = this.findDecorationAt(x, y);
    return id ? this.decorations.get(id) || null : null;
  }

  /**
   * Get all decorations
   */
  public getAllDecorations(): DecorationVoxel[] {
    return Array.from(this.decorations.values());
  }

  /**
   * Get decoration color based on type and season
   */
  public getDecorationColor(decoration: DecorationVoxel): string {
    switch (decoration.decorationType) {
      case 'tree':
        const treeConfig = this.treeConfigs.get(decoration.variant);
        if (!treeConfig) return '#228B22';
        return treeConfig.colors[decoration.season];
        
      case 'flower':
        const flowerConfig = this.flowerConfigs.get(decoration.variant);
        if (!flowerConfig) return '#FF69B4';
        // Check if flower is in bloom season
        if (flowerConfig.bloomSeason === decoration.season) {
          return flowerConfig.colors[0]; // First color
        }
        return '#90EE90'; // Green when not blooming
        
      case 'rock':
        const rockConfig = this.rockConfigs.get(decoration.variant);
        if (!rockConfig) return '#808080';
        return rockConfig.colors[0];
        
      default:
        return '#8B4513';
    }
  }

  /**
   * Get decoration statistics
   */
  public getDecorationStats(): {
    totalDecorations: number;
    typeDistribution: Record<string, number>;
    seasonalDistribution: Record<string, number>;
    interactiveCount: number;
    harvestableCount: number;
  } {
    const typeDistribution: Record<string, number> = {};
    const seasonalDistribution: Record<string, number> = {};
    let interactiveCount = 0;
    let harvestableCount = 0;

    this.decorations.forEach(decoration => {
      // Type distribution
      typeDistribution[decoration.decorationType] = (typeDistribution[decoration.decorationType] || 0) + 1;

      // Seasonal distribution
      seasonalDistribution[decoration.season] = (seasonalDistribution[decoration.season] || 0) + 1;

      // Interactive and harvestable counts
      if (decoration.interactive) interactiveCount++;
      if (decoration.harvestable) harvestableCount++;
    });

    return {
      totalDecorations: this.decorations.size,
      typeDistribution,
      seasonalDistribution,
      interactiveCount,
      harvestableCount
    };
  }

  /**
   * Export decoration data for saving
   */
  public exportDecorations(): DecorationVoxel[] {
    return Array.from(this.decorations.values());
  }

  /**
   * Import decoration data from save
   */
  public importDecorations(decorations: DecorationVoxel[]): void {
    this.decorations.clear();
    decorations.forEach(decoration => {
      const id = `${decoration.decorationType}_${decoration.x}_${decoration.y}`;
      this.decorations.set(id, decoration);
    });
  }

  /**
   * Dispose of decoration system
   */
  public dispose(): void {
    this.decorations.clear();
  }
}
