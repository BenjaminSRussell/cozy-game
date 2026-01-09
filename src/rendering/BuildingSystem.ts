/**
 * Enhanced Building System for 2.5D Isometric World
 * 
 * Multi-level buildings with interiors, upgrades, and customization
 */

export interface BuildingVoxel {
  x: number;
  y: number;
  z: number;
  buildingType: 'barn' | 'house' | 'shed' | 'greenhouse' | 'windmill' | 'well' | 'coop' | 'beehive' | 'fence' | 'tower' | 'bridge' | 'market';
  level: number; // 1-3 upgrade levels
  rotation: number; // 0, 90, 180, 270 degrees
  unlocked: boolean;
  interior?: BuildingInterior;
  customization?: BuildingCustomization;
  height: number;
  footprint: { width: number; depth: number };
}

export interface BuildingInterior {
  rooms: InteriorRoom[];
  decorations: InteriorDecoration[];
  furniture: FurnitureItem[];
}

export interface InteriorRoom {
  id: string;
  type: 'storage' | 'workshop' | 'living' | 'bedroom' | 'kitchen';
  size: { width: number; depth: number };
  furniture: string[];
}

export interface InteriorDecoration {
  id: string;
  type: 'painting' | 'rug' | 'lamp' | 'plant' | 'window';
  position: { x: number; y: number; z: number };
  color: string;
}

export interface FurnitureItem {
  id: string;
  type: 'table' | 'chair' | 'bed' | 'cabinet' | 'workbench';
  position: { x: number; y: number; z: number };
  rotation: number;
  color: string;
}

export interface BuildingCustomization {
  primaryColor: string;
  secondaryColor: string;
  roofColor: string;
  doorColor: string;
  windowStyle: 'modern' | 'rustic' | 'elegant';
  hasChimney: boolean;
  hasGarden: boolean;
}

export interface BuildingConfig {
  type: string;
  name: string;
  baseCost: number;
  upgradeCosts: number[];
  maxLevel: number;
  footprint: { width: number; depth: number };
  heights: number[];
  colors: {
    primary: string;
    secondary: string;
    roof: string;
    door: string;
  };
  functions: BuildingFunction[];
  interiorRooms: InteriorRoom[];
  resources: {
    wood: number;
    stone?: number;
    gold?: number;
  };
}

export interface BuildingFunction {
  type: 'storage' | 'processing' | 'crafting' | 'housing' | 'production' | 'workshop' | 'trading';
  capacity?: number;
  processingSpeed?: number;
  craftingRecipes?: string[];
  housingCapacity?: number;
  productionRate?: number;
}

export class BuildingSystem {
  private buildings: Map<string, BuildingVoxel> = new Map();
  private buildingConfigs: Map<string, BuildingConfig> = new Map();
  private availableRecipes: string[] = [];

  constructor() {
    this.initializeBuildingConfigs();
    this.initializeRecipes();
  }

  /**
   * Initialize all building configurations
   */
  private initializeBuildingConfigs(): void {
    const configs: BuildingConfig[] = [
      {
        type: 'barn',
        name: 'Barn',
        baseCost: 200,
        upgradeCosts: [500, 1000],
        maxLevel: 3,
        footprint: { width: 3, depth: 3 },
        heights: [3, 4, 5],
        colors: {
          primary: '#8B4513',
          secondary: '#A0522D',
          roof: '#654321',
          door: '#4A4A4A'
        },
        functions: [
          { type: 'storage', capacity: 100 },
          { type: 'housing', housingCapacity: 10 }
        ],
        interiorRooms: [
          {
            id: 'main_storage',
            type: 'storage',
            size: { width: 3, depth: 3 },
            furniture: ['cabinet', 'cabinet', 'workbench']
          }
        ],
        resources: {
          wood: 40,
          stone: 20
        }
      },
      {
        type: 'house',
        name: 'House',
        baseCost: 300,
        upgradeCosts: [750, 1500],
        maxLevel: 3,
        footprint: { width: 2, depth: 2 },
        heights: [4, 5, 6],
        colors: {
          primary: '#DEB887',
          secondary: '#F5DEB3',
          roof: '#8B4513',
          door: '#654321'
        },
        functions: [
          { type: 'housing', housingCapacity: 4 },
          { type: 'crafting', craftingRecipes: ['basic_tools', 'furniture'] }
        ],
        interiorRooms: [
          {
            id: 'living_room',
            type: 'living',
            size: { width: 2, depth: 2 },
            furniture: ['table', 'chair', 'chair']
          },
          {
            id: 'bedroom',
            type: 'bedroom',
            size: { width: 1, depth: 1 },
            furniture: ['bed']
          }
        ],
        resources: {
          wood: 50,
          stone: 30
        }
      },
      {
        type: 'shed',
        name: 'Shed',
        baseCost: 150,
        upgradeCosts: [300, 600],
        maxLevel: 3,
        footprint: { width: 2, depth: 2 },
        heights: [2, 3, 3],
        colors: {
          primary: '#8B6914',
          secondary: '#A0826D',
          roof: '#654321',
          door: '#4A4A4A'
        },
        functions: [
          { type: 'storage', capacity: 50 },
          { type: 'workshop', processingSpeed: 1.0 }
        ],
        interiorRooms: [
          {
            id: 'workshop',
            type: 'workshop',
            size: { width: 2, depth: 2 },
            furniture: ['workbench', 'cabinet']
          }
        ],
        resources: {
          wood: 25,
          stone: 10
        }
      },
      {
        type: 'greenhouse',
        name: 'Greenhouse',
        baseCost: 400,
        upgradeCosts: [800, 1600],
        maxLevel: 3,
        footprint: { width: 4, depth: 3 },
        heights: [3, 4, 5],
        colors: {
          primary: '#90EE90',
          secondary: '#98FB98',
          roof: '#4682B4',
          door: '#4A4A4A'
        },
        functions: [
          { type: 'production', productionRate: 2.0 },
          { type: 'housing', housingCapacity: 5 }
        ],
        interiorRooms: [
          {
            id: 'growing_area',
            type: 'workshop',
            size: { width: 4, depth: 3 },
            furniture: ['table', 'table', 'table']
          }
        ],
        resources: {
          wood: 60,
          stone: 40
        }
      },
      {
        type: 'windmill',
        name: 'Windmill',
        baseCost: 500,
        upgradeCosts: [1000, 2000],
        maxLevel: 3,
        footprint: { width: 2, depth: 2 },
        heights: [6, 8, 10],
        colors: {
          primary: '#F5DEB3',
          secondary: '#FFE4B5',
          roof: '#8B4513',
          door: '#654321'
        },
        functions: [
          { type: 'processing', processingSpeed: 3.0 },
          { type: 'production', productionRate: 1.5 }
        ],
        interiorRooms: [
          {
            id: 'grinding_room',
            type: 'workshop',
            size: { width: 2, depth: 2 },
            furniture: ['workbench']
          }
        ],
        resources: {
          wood: 80,
          stone: 50
        }
      },
      {
        type: 'well',
        name: 'Well',
        baseCost: 100,
        upgradeCosts: [200, 400],
        maxLevel: 3,
        footprint: { width: 1, depth: 1 },
        heights: [2, 3, 4],
        colors: {
          primary: '#808080',
          secondary: '#696969',
          roof: '#8B4513',
          door: '#4A4A4A'
        },
        functions: [
          { type: 'production', productionRate: 5.0 }
        ],
        interiorRooms: [],
        resources: {
          wood: 15,
          stone: 25
        }
      },
      {
        type: 'coop',
        name: 'Chicken Coop',
        baseCost: 250,
        upgradeCosts: [500, 1000],
        maxLevel: 3,
        footprint: { width: 2, depth: 2 },
        heights: [2, 2, 3],
        colors: {
          primary: '#DEB887',
          secondary: '#F5DEB3',
          roof: '#8B4513',
          door: '#654321'
        },
        functions: [
          { type: 'housing', housingCapacity: 8 },
          { type: 'production', productionRate: 1.0 }
        ],
        interiorRooms: [
          {
            id: 'nesting_area',
            type: 'storage',
            size: { width: 2, depth: 2 },
            furniture: []
          }
        ],
        resources: {
          wood: 35,
          stone: 15
        }
      },
      {
        type: 'beehive',
        name: 'Beehive',
        baseCost: 80,
        upgradeCosts: [160, 320],
        maxLevel: 3,
        footprint: { width: 1, depth: 1 },
        heights: [1, 1, 2],
        colors: {
          primary: '#8B4513',
          secondary: '#A0522D',
          roof: '#FFD700',
          door: '#4A4A4A'
        },
        functions: [
          { type: 'production', productionRate: 0.5 }
        ],
        interiorRooms: [],
        resources: {
          wood: 10
        }
      },
      {
        type: 'fence',
        name: 'Fence',
        baseCost: 20,
        upgradeCosts: [40, 80],
        maxLevel: 3,
        footprint: { width: 1, depth: 1 },
        heights: [2, 2, 3],
        colors: {
          primary: '#8B4513',
          secondary: '#A0522D',
          roof: '#654321',
          door: '#4A4A4A'
        },
        functions: [
          { type: 'storage', capacity: 5 }
        ],
        interiorRooms: [],
        resources: {
          wood: 5
        }
      },
      {
        type: 'tower',
        name: 'Watch Tower',
        baseCost: 600,
        upgradeCosts: [1200, 2400],
        maxLevel: 3,
        footprint: { width: 2, depth: 2 },
        heights: [8, 10, 12],
        colors: {
          primary: '#D3D3D3',
          secondary: '#A9A9A9',
          roof: '#8B4513',
          door: '#654321'
        },
        functions: [
          { type: 'housing', housingCapacity: 2 },
          { type: 'crafting', craftingRecipes: ['tools', 'weapons'] }
        ],
        interiorRooms: [
          {
            id: 'observation_room',
            type: 'living',
            size: { width: 2, depth: 2 },
            furniture: ['table', 'chair']
          }
        ],
        resources: {
          wood: 100,
          stone: 80
        }
      },
      {
        type: 'bridge',
        name: 'Bridge',
        baseCost: 300,
        upgradeCosts: [600, 1200],
        maxLevel: 3,
        footprint: { width: 4, depth: 2 },
        heights: [1, 1, 2],
        colors: {
          primary: '#8B4513',
          secondary: '#A0522D',
          roof: '#654321',
          door: '#4A4A4A'
        },
        functions: [
          { type: 'storage', capacity: 20 }
        ],
        interiorRooms: [],
        resources: {
          wood: 70,
          stone: 20
        }
      },
      {
        type: 'market',
        name: 'Market Stall',
        baseCost: 450,
        upgradeCosts: [900, 1800],
        maxLevel: 3,
        footprint: { width: 3, depth: 3 },
        heights: [3, 4, 5],
        colors: {
          primary: '#FFD700',
          secondary: '#FFA500',
          roof: '#FF6347',
          door: '#8B4513'
        },
        functions: [
          { type: 'crafting', craftingRecipes: ['food', 'drinks'] },
          { type: 'trading', processingSpeed: 2.0 }
        ],
        interiorRooms: [
          {
            id: 'shop_area',
            type: 'workshop',
            size: { width: 3, depth: 3 },
            furniture: ['table', 'table', 'cabinet']
          }
        ],
        resources: {
          wood: 55,
          stone: 25,
          gold: 20
        }
      }
    ];

    configs.forEach(config => {
      this.buildingConfigs.set(config.type, config);
    });
  }

  /**
   * Initialize available crafting recipes
   */
  private initializeRecipes(): void {
    this.availableRecipes = [
      'basic_tools',
      'furniture',
      'fertilizer',
      'seeds',
      'processed_goods',
      'decorations'
    ];
  }

  /**
   * Place a new building
   */
  public placeBuilding(
    x: number, 
    y: number, 
    buildingType: string, 
    level: number = 1
  ): boolean {
    const id = `${buildingType}_${x}_${y}`;
    
    if (this.buildings.has(id)) {
      return false; // Building already exists
    }

    const config = this.buildingConfigs.get(buildingType);
    if (!config) {
      return false; // Invalid building type
    }

    // Check if level is valid
    if (level < 1 || level > config.maxLevel) {
      return false;
    }

    const building: BuildingVoxel = {
      x,
      y,
      z: 0,
      buildingType: buildingType as any,
      level,
      rotation: 0,
      unlocked: true,
      height: config.heights[level - 1],
      footprint: config.footprint,
      interior: this.generateInterior(config, level),
      customization: this.generateCustomization(config)
    };

    this.buildings.set(id, building);
    return true;
  }

  /**
   * Generate interior for building
   */
  private generateInterior(config: BuildingConfig, level: number): BuildingInterior | undefined {
    if (config.interiorRooms.length === 0) {
      return undefined;
    }

    return {
      rooms: config.interiorRooms.map(room => ({
        ...room,
        id: `${room.id}_${level}`
      })),
      decorations: [],
      furniture: []
    };
  }

  /**
   * Generate default customization
   */
  private generateCustomization(config: BuildingConfig): BuildingCustomization {
    return {
      primaryColor: config.colors.primary,
      secondaryColor: config.colors.secondary,
      roofColor: config.colors.roof,
      doorColor: config.colors.door,
      windowStyle: 'rustic',
      hasChimney: config.type === 'house' || config.type === 'windmill',
      hasGarden: config.type === 'house'
    };
  }

  /**
   * Upgrade a building
   */
  public upgradeBuilding(x: number, y: number): {
    success: boolean;
    cost?: number;
    newLevel?: number;
  } {
    const buildingId = this.findBuildingAt(x, y);
    if (!buildingId) {
      return { success: false };
    }

    const building = this.buildings.get(buildingId);
    if (!building) {
      return { success: false };
    }

    const config = this.buildingConfigs.get(building.buildingType);
    if (!config) {
      return { success: false };
    }

    // Check if already at max level
    if (building.level >= config.maxLevel) {
      return { success: false };
    }

    const newLevel = building.level + 1;
    const upgradeCost = config.upgradeCosts[newLevel - 2]; // -2 because array is 0-indexed and starts from level 2

    // Update building
    building.level = newLevel;
    building.height = config.heights[newLevel - 1];
    building.interior = this.generateInterior(config, newLevel);

    return {
      success: true,
      cost: upgradeCost,
      newLevel
    };
  }

  /**
   * Customize a building
   */
  public customizeBuilding(
    x: number, 
    y: number, 
    customization: Partial<BuildingCustomization>
  ): boolean {
    const buildingId = this.findBuildingAt(x, y);
    if (!buildingId) {
      return false;
    }

    const building = this.buildings.get(buildingId);
    if (!building) {
      return false;
    }

    // Update customization
    if (building.customization) {
      building.customization = {
        ...building.customization,
        ...customization
      };
    }

    return true;
  }

  /**
   * Add furniture to building interior
   */
  public addFurniture(
    x: number, 
    y: number, 
    furniture: Omit<FurnitureItem, 'id'>
  ): boolean {
    const buildingId = this.findBuildingAt(x, y);
    if (!buildingId) {
      return false;
    }

    const building = this.buildings.get(buildingId);
    if (!building || !building.interior) {
      return false;
    }

    const furnitureItem: FurnitureItem = {
      ...furniture,
      id: `furniture_${Date.now()}_${Math.random()}`
    };

    building.interior.furniture.push(furnitureItem);
    return true;
  }

  /**
   * Add decoration to building interior
   */
  public addDecoration(
    x: number, 
    y: number, 
    decoration: Omit<InteriorDecoration, 'id'>
  ): boolean {
    const buildingId = this.findBuildingAt(x, y);
    if (!buildingId) {
      return false;
    }

    const building = this.buildings.get(buildingId);
    if (!building || !building.interior) {
      return false;
    }

    const decorationItem: InteriorDecoration = {
      ...decoration,
      id: `decoration_${Date.now()}_${Math.random()}`
    };

    building.interior.decorations.push(decorationItem);
    return true;
  }

  /**
   * Find building at position
   */
  private findBuildingAt(x: number, y: number): string | null {
    for (const [id, building] of this.buildings) {
      const inX = x >= building.x && x < building.x + building.footprint.width;
      const inY = y >= building.y && y < building.y + building.footprint.depth;
      
      if (inX && inY) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get building at position
   */
  public getBuildingAt(x: number, y: number): BuildingVoxel | null {
    const buildingId = this.findBuildingAt(x, y);
    return buildingId ? this.buildings.get(buildingId) || null : null;
  }

  /**
   * Get all buildings
   */
  public getAllBuildings(): BuildingVoxel[] {
    return Array.from(this.buildings.values());
  }

  /**
   * Get building color based on type and customization
   */
  public getBuildingColor(building: BuildingVoxel, face: 'primary' | 'secondary' | 'roof' | 'door'): string {
    const config = this.buildingConfigs.get(building.buildingType);
    if (!config) return '#808080';

    const colors = config.colors;
    const customization = building.customization;

    switch (face) {
      case 'primary':
        return customization?.primaryColor || colors.primary;
      case 'secondary':
        return customization?.secondaryColor || colors.secondary;
      case 'roof':
        return customization?.roofColor || colors.roof;
      case 'door':
        return customization?.doorColor || colors.door;
      default:
        return colors.primary;
    }
  }

  /**
   * Get building footprint voxels
   */
  public getBuildingFootprint(building: BuildingVoxel): { x: number; y: number; z: number }[] {
    const voxels: { x: number; y: number; z: number }[] = [];
    
    for (let x = 0; x < building.footprint.width; x++) {
      for (let y = 0; y < building.footprint.depth; y++) {
        voxels.push({
          x: building.x + x,
          y: building.y + y,
          z: building.z
        });
      }
    }
    
    return voxels;
  }

  /**
   * Check if position is blocked by building
   */
  public isPositionBlocked(x: number, y: number): boolean {
    return this.findBuildingAt(x, y) !== null;
  }

  /**
   * Get building resource requirements as formatted string
   */
  public getResourceString(buildingType: string): string {
    const resources = this.getBuildingResources(buildingType);
    if (!resources) return 'No resources required';

    const parts = [`Wood: ${resources.wood}`];
    if (resources.stone) parts.push(`Stone: ${resources.stone}`);
    if (resources.gold) parts.push(`Gold: ${resources.gold}`);

    return parts.join(' | ');
  }

  /**
   * Get building resource requirements
   */
  public getBuildingResources(buildingType: string): { wood: number; stone?: number; gold?: number } | null {
    const config = this.buildingConfigs.get(buildingType);
    return config ? config.resources : null;
  }

  /**
   * Check if player has enough resources for building
   */
  public canAffordBuilding(buildingType: string, playerResources: { wood: number; stone?: number; gold?: number }): boolean {
    const required = this.getBuildingResources(buildingType);
    if (!required) return false;

    const hasWood = playerResources.wood >= required.wood;
    const hasStone = !required.stone || (playerResources.stone !== undefined && playerResources.stone >= required.stone);
    const hasGold = !required.gold || (playerResources.gold !== undefined && playerResources.gold >= required.gold);

    return hasWood && hasStone && hasGold;
  }

  /**
   * Get building statistics
   */
  public getBuildingStats(): {
    totalBuildings: number;
    typeDistribution: Record<string, number>;
    levelDistribution: Record<string, number>;
    totalCapacity: {
      storage: number;
      housing: number;
    };
  } {
    const typeDistribution: Record<string, number> = {};
    const levelDistribution: Record<string, number> = {};
    let totalStorage = 0;
    let totalHousing = 0;

    this.buildings.forEach(building => {
      const config = this.buildingConfigs.get(building.buildingType);
      if (!config) return;

      // Type distribution
      typeDistribution[building.buildingType] = (typeDistribution[building.buildingType] || 0) + 1;

      // Level distribution
      levelDistribution[`level_${building.level}`] = (levelDistribution[`level_${building.level}`] || 0) + 1;

      // Calculate capacity
      config.functions.forEach(func => {
        if (func.type === 'storage' && func.capacity) {
          totalStorage += func.capacity * building.level;
        } else if (func.type === 'housing' && func.housingCapacity) {
          totalHousing += func.housingCapacity * building.level;
        }
      });
    });

    return {
      totalBuildings: this.buildings.size,
      typeDistribution,
      levelDistribution,
      totalCapacity: {
        storage: totalStorage,
        housing: totalHousing
      }
    };
  }

  /**
   * Get available building types
   */
  public getAvailableBuildingTypes(): BuildingConfig[] {
    return Array.from(this.buildingConfigs.values());
  }

  /**
   * Export building data for saving
   */
  public exportBuildings(): BuildingVoxel[] {
    return Array.from(this.buildings.values());
  }

  /**
   * Import building data from save
   */
  public importBuildings(buildings: BuildingVoxel[]): void {
    this.buildings.clear();
    buildings.forEach(building => {
      const id = `${building.buildingType}_${building.x}_${building.y}`;
      this.buildings.set(id, building);
    });
  }

  /**
   * Dispose of building system
   */
  public dispose(): void {
    this.buildings.clear();
  }
}
