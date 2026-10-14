import { lerp } from '../utils/math';

/**
 * Enhanced Mining System for 2.5D Isometric World
 * 
 * Underground mining with ore rarity, tools, and cave generation
 */

export interface OreVoxel {
  x: number;
  y: number;
  z: number;
  oreType: 'copper' | 'iron' | 'silver' | 'gold' | 'diamond' | 'emerald' | 'ruby' | 'sapphire';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  quantity: number;
  durability: number;
  maxDurability: number;
  depth: number; // Mining depth 1-10
  discovered: boolean;
  glowIntensity: number; // Visual glow effect
}

export interface MineEntrance {
  x: number;
  y: number;
  z: number;
  depth: number; // How deep the mine goes
  width: number;
  height: number;
  discovered: boolean;
  currentLevel: number;
  totalLevels: number;
}

export interface CaveSystem {
  tunnels: CaveTunnel[];
  rooms: CaveRoom[];
  supports: MineSupport[];
  rails: MineRail[];
  decorations: CaveDecoration[];
}

export interface CaveTunnel {
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  width: number;
  height: number;
  level: number;
}

export interface CaveRoom {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  level: number;
  hasOre: boolean;
  oreTypes: string[];
}

export interface MineSupport {
  x: number;
  y: number;
  z: number;
  type: 'wood' | 'stone' | 'steel';
  strength: number;
  maxStrength: number;
}

export interface MineRail {
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  level: number;
}

export interface CaveDecoration {
  x: number;
  y: number;
  z: number;
  type: 'crystal' | 'stalactite' | 'moss' | 'fungus' | 'mineral';
  color: string;
  size: number;
}

export interface MiningTool {
  id: string;
  type: 'pickaxe' | 'drill' | 'explosive';
  level: number; // 1-5
  power: number; // Mining power
  durability: number;
  maxDurability: number;
  efficiency: number; // Speed multiplier
  specialAbility?: string;
}

export interface OreConfig {
  type: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  baseValue: number;
  minDepth: number;
  maxDepth: number;
  spawnChance: number; // 0-1
  color: string;
  glowColor: string;
  hardness: number; // Mining difficulty
}

export class MiningSystem {
  private oreVoxels: Map<string, OreVoxel> = new Map();
  private mineEntrances: Map<string, MineEntrance> = new Map();
  private caveSystems: Map<string, CaveSystem> = new Map();
  private playerTools: Map<string, MiningTool> = new Map();
  private oreConfigs: Map<string, OreConfig> = new Map();
  private discoveredOres: Set<string> = new Set();

  constructor() {
    this.initializeOreConfigs();
    this.generateInitialDeposits();
  }

  /**
   * Initialize all ore configurations
   */
  private initializeOreConfigs(): void {
    const configs: OreConfig[] = [
      {
        type: 'copper',
        name: 'Copper',
        rarity: 'common',
        baseValue: 25,
        minDepth: 1,
        maxDepth: 3,
        spawnChance: 0.4,
        color: '#B87333',
        glowColor: '#CD7F32',
        hardness: 1
      },
      {
        type: 'iron',
        name: 'Iron',
        rarity: 'common',
        baseValue: 40,
        minDepth: 2,
        maxDepth: 5,
        spawnChance: 0.35,
        color: '#434B4D',
        glowColor: '#696969',
        hardness: 2
      },
      {
        type: 'silver',
        name: 'Silver',
        rarity: 'uncommon',
        baseValue: 75,
        minDepth: 3,
        maxDepth: 6,
        spawnChance: 0.2,
        color: '#C0C0C0',
        glowColor: '#E5E5E5',
        hardness: 3
      },
      {
        type: 'gold',
        name: 'Gold',
        rarity: 'rare',
        baseValue: 150,
        minDepth: 5,
        maxDepth: 8,
        spawnChance: 0.1,
        color: '#FFD700',
        glowColor: '#FFED4E',
        hardness: 4
      },
      {
        type: 'diamond',
        name: 'Diamond',
        rarity: 'legendary',
        baseValue: 500,
        minDepth: 7,
        maxDepth: 10,
        spawnChance: 0.03,
        color: '#B9F2FF',
        glowColor: '#E0FFFF',
        hardness: 8
      },
      {
        type: 'emerald',
        name: 'Emerald',
        rarity: 'rare',
        baseValue: 200,
        minDepth: 6,
        maxDepth: 9,
        spawnChance: 0.05,
        color: '#50C878',
        glowColor: '#7FFFD4',
        hardness: 6
      },
      {
        type: 'ruby',
        name: 'Ruby',
        rarity: 'rare',
        baseValue: 180,
        minDepth: 5,
        maxDepth: 8,
        spawnChance: 0.06,
        color: '#E0115F',
        glowColor: '#FF69B4',
        hardness: 5
      },
      {
        type: 'sapphire',
        name: 'Sapphire',
        rarity: 'rare',
        baseValue: 160,
        minDepth: 5,
        maxDepth: 8,
        spawnChance: 0.07,
        color: '#0F52BA',
        glowColor: '#4169E1',
        hardness: 5
      }
    ];

    configs.forEach(config => {
      this.oreConfigs.set(config.type, config);
    });
  }

  /**
   * Generate initial ore deposits
   */
  private generateInitialDeposits(): void {
    const worldSize = 20;
    const depositCount = Math.floor(worldSize * worldSize * 0.1); // 10% of world

    for (let i = 0; i < depositCount; i++) {
      const x = Math.floor(Math.random() * worldSize);
      const y = Math.floor(Math.random() * worldSize);
      const depth = Math.floor(Math.random() * 3) + 1; // Surface deposits 1-3

      this.createOreDeposit(x, y, depth);
    }
  }

  /**
   * Create ore deposit at position
   */
  public createOreDeposit(x: number, y: number, depth: number, oreType?: string): boolean {
    const id = `ore_${x}_${y}_${depth}`;
    
    if (this.oreVoxels.has(id)) {
      return false; // Ore already exists
    }

    // Select ore type based on depth and rarity
    const selectedOreType = oreType || this.selectOreType(depth);
    const config = this.oreConfigs.get(selectedOreType);
    if (!config) {
      return false;
    }

    const ore: OreVoxel = {
      x,
      y,
      z: -depth, // Negative Z for underground
      oreType: selectedOreType as any,
      rarity: config.rarity,
      quantity: Math.floor(Math.random() * 10) + 5,
      durability: 100,
      maxDurability: 100,
      depth,
      discovered: false,
      glowIntensity: this.calculateGlowIntensity(config.rarity)
    };

    this.oreVoxels.set(id, ore);
    return true;
  }

  /**
   * Select ore type based on depth
   */
  private selectOreType(depth: number): string {
    const availableOres: string[] = [];
    const chances: number[] = [];

    this.oreConfigs.forEach((config, type) => {
      if (depth >= config.minDepth && depth <= config.maxDepth) {
        availableOres.push(type);
        chances.push(config.spawnChance);
      }
    });

    if (availableOres.length === 0) {
      return 'copper'; // Fallback
    }

    // Weighted random selection
    const totalChance = chances.reduce((sum, chance) => sum + chance, 0);
    let random = Math.random() * totalChance;

    for (let i = 0; i < availableOres.length; i++) {
      random -= chances[i];
      if (random <= 0) {
        return availableOres[i];
      }
    }

    return availableOres[0];
  }

  /**
   * Calculate glow intensity based on rarity
   */
  private calculateGlowIntensity(rarity: string): number {
    switch (rarity) {
      case 'legendary': return 1.0;
      case 'rare': return 0.7;
      case 'uncommon': return 0.4;
      case 'common': return 0.1;
      default: return 0.1;
    }
  }

  /**
   * Create mine entrance
   */
  public createMineEntrance(x: number, y: number, depth: number = 5): boolean {
    const id = `mine_${x}_${y}`;
    
    if (this.mineEntrances.has(id)) {
      return false;
    }

    const entrance: MineEntrance = {
      x,
      y,
      z: 0,
      depth,
      width: 2,
      height: 2,
      discovered: true,
      currentLevel: 1,
      totalLevels: Math.ceil(depth / 2)
    };

    this.mineEntrances.set(id, entrance);
    this.generateCaveSystem(id, entrance);
    return true;
  }

  /**
   * Generate cave system for mine
   */
  private generateCaveSystem(mineId: string, entrance: MineEntrance): void {
    const caveSystem: CaveSystem = {
      tunnels: [],
      rooms: [],
      supports: [],
      rails: [],
      decorations: []
    };

    // Generate main tunnel
    for (let level = 1; level <= entrance.totalLevels; level++) {
      const tunnelLength = Math.floor(Math.random() * 10) + 5;
      const angle = Math.random() * Math.PI * 2;
      
      const tunnel: CaveTunnel = {
        startX: entrance.x,
        startY: entrance.y,
        startZ: -level * 2,
        endX: entrance.x + Math.cos(angle) * tunnelLength,
        endY: entrance.y + Math.sin(angle) * tunnelLength,
        endZ: -level * 2,
        width: 2,
        height: 3,
        level
      };

      caveSystem.tunnels.push(tunnel);

      // Add supports every 3 units
      for (let i = 0; i < tunnelLength; i += 3) {
        const supportX = entrance.x + Math.cos(angle) * i;
        const supportY = entrance.y + Math.sin(angle) * i;
        
        caveSystem.supports.push({
          x: supportX,
          y: supportY,
          z: -level * 2,
          type: level <= 3 ? 'wood' : level <= 6 ? 'stone' : 'steel',
          strength: 100,
          maxStrength: 100
        });
      }

      // Generate ore in tunnels
      this.generateOreInTunnel(tunnel, caveSystem);
    }

    // Generate rooms
    const roomCount = Math.floor(entrance.totalLevels / 2) + 1;
    for (let i = 0; i < roomCount; i++) {
      const room = this.generateCaveRoom(entrance, i + 1);
      caveSystem.rooms.push(room);
    }

    this.caveSystems.set(mineId, caveSystem);
  }

  /**
   * Generate ore in tunnel
   */
  private generateOreInTunnel(tunnel: CaveTunnel, caveSystem: CaveSystem): void {
    const oreCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < oreCount; i++) {
      const progress = Math.random();
      const x = lerp(tunnel.startX, tunnel.endX, progress);
      const y = lerp(tunnel.startY, tunnel.endY, progress);
      const depth = Math.abs(tunnel.startZ);

      const oreType = this.selectOreType(depth);
      const config = this.oreConfigs.get(oreType);
      
      if (config && Math.random() < config.spawnChance) {
        const oreId = `ore_${Math.floor(x)}_${Math.floor(y)}_${depth}`;
        const ore: OreVoxel = {
          x: Math.floor(x),
          y: Math.floor(y),
          z: tunnel.startZ,
          oreType: oreType as any,
          rarity: config.rarity,
          quantity: Math.floor(Math.random() * 8) + 3,
          durability: 100,
          maxDurability: 100,
          depth,
          discovered: false,
          glowIntensity: this.calculateGlowIntensity(config.rarity)
        };

        this.oreVoxels.set(oreId, ore);
      }
    }
  }

  /**
   * Generate cave room
   */
  private generateCaveRoom(entrance: MineEntrance, level: number): CaveRoom {
    const size = Math.floor(Math.random() * 3) + 2;
    const room: CaveRoom = {
      x: entrance.x + Math.floor(Math.random() * 10) - 5,
      y: entrance.y + Math.floor(Math.random() * 10) - 5,
      z: -level * 2,
      width: size,
      depth: size,
      height: 3,
      level,
      hasOre: Math.random() < 0.7,
      oreTypes: []
    };

    if (room.hasOre) {
      const oreCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < oreCount; i++) {
        const oreType = this.selectOreType(level * 2);
        room.oreTypes.push(oreType);
      }
    }

    return room;
  }

  /**
   * Mine ore at position
   */
  public mineOre(x: number, y: number, depth: number, toolPower: number = 1): {
    success: boolean;
    oreType?: string;
    quantity?: number;
    value?: number;
    experience?: number;
    durabilityLoss?: number;
  } {
    const oreId = `ore_${x}_${y}_${depth}`;
    const ore = this.oreVoxels.get(oreId);
    
    if (!ore) {
      return { success: false };
    }

    const config = this.oreConfigs.get(ore.oreType);
    if (!config) {
      return { success: false };
    }

    // Calculate mining success based on tool power and ore hardness
    const miningPower = toolPower / config.hardness;
    const successChance = Math.min(0.9, miningPower * 0.5);
    
    if (Math.random() > successChance) {
      return { success: false };
    }

    // Calculate damage to ore
    const damage = toolPower * 10;
    ore.durability -= damage;

    // Calculate yield
    const yieldMultiplier = ore.durability <= 0 ? 1.0 : 0.5;
    const quantity = Math.floor(ore.quantity * yieldMultiplier);
    const value = Math.floor(config.baseValue * quantity * (ore.durability <= 0 ? 1.0 : 0.5));
    const experience = Math.floor(config.hardness * 10 * yieldMultiplier);

    // Mark as discovered
    ore.discovered = true;
    this.discoveredOres.add(ore.oreType);

    // Remove ore if depleted
    if (ore.durability <= 0) {
      this.oreVoxels.delete(oreId);
    }

    return {
      success: true,
      oreType: ore.oreType,
      quantity,
      value,
      experience,
      durabilityLoss: damage
    };
  }

  /**
   * Get ore at position
   */
  public getOreAt(x: number, y: number, depth: number): OreVoxel | null {
    const oreId = `ore_${x}_${y}_${depth}`;
    return this.oreVoxels.get(oreId) || null;
  }

  /**
   * Get all surface ores (depth 1-3)
   */
  public getSurfaceOres(): OreVoxel[] {
    return Array.from(this.oreVoxels.values()).filter(ore => ore.depth <= 3);
  }

  /**
   * Get all underground ores (depth 4+)
   */
  public getUndergroundOres(): OreVoxel[] {
    return Array.from(this.oreVoxels.values()).filter(ore => ore.depth > 3);
  }

  /**
   * Get ore color based on type and rarity
   */
  public getOreColor(ore: OreVoxel): string {
    const config = this.oreConfigs.get(ore.oreType);
    if (!config) return '#808080';

    // Modify color based on durability
    if (ore.durability < ore.maxDurability * 0.3) {
      return this.darkenColor(config.color, 0.4);
    } else if (ore.durability < ore.maxDurability * 0.6) {
      return this.darkenColor(config.color, 0.2);
    }

    return config.color;
  }

  /**
   * Get ore glow color
   */
  public getOreGlowColor(ore: OreVoxel): string {
    const config = this.oreConfigs.get(ore.oreType);
    return config?.glowColor || '#FFFFFF';
  }

  /**
   * Darken color for depleted ores
   */
  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  /**
   * Get mining statistics
   */
  public getMiningStats(): {
    totalOres: number;
    surfaceOres: number;
    undergroundOres: number;
    rarityDistribution: Record<string, number>;
    discoveredTypes: string[];
    totalValue: number;
  } {
    const rarityDistribution: Record<string, number> = {};
    let totalValue = 0;

    this.oreVoxels.forEach(ore => {
      const config = this.oreConfigs.get(ore.oreType);
      if (!config) return;

      rarityDistribution[ore.rarity] = (rarityDistribution[ore.rarity] || 0) + 1;
      totalValue += Math.floor(config.baseValue * ore.quantity);
    });

    return {
      totalOres: this.oreVoxels.size,
      surfaceOres: this.getSurfaceOres().length,
      undergroundOres: this.getUndergroundOres().length,
      rarityDistribution,
      discoveredTypes: Array.from(this.discoveredOres),
      totalValue
    };
  }

  /**
   * Export mining data for saving
   */
  public exportMiningData(): {
    ores: OreVoxel[];
    mines: MineEntrance[];
    caves: CaveSystem[];
  } {
    return {
      ores: Array.from(this.oreVoxels.values()),
      mines: Array.from(this.mineEntrances.values()),
      caves: Array.from(this.caveSystems.values())
    };
  }

  /**
   * Import mining data from save
   */
  public importMiningData(data: {
    ores: OreVoxel[];
    mines: MineEntrance[];
    caves: CaveSystem[];
  }): void {
    this.oreVoxels.clear();
    this.mineEntrances.clear();
    this.caveSystems.clear();

    data.ores.forEach(ore => {
      const id = `ore_${ore.x}_${ore.y}_${ore.depth}`;
      this.oreVoxels.set(id, ore);
    });

    data.mines.forEach(mine => {
      const id = `mine_${mine.x}_${mine.y}`;
      this.mineEntrances.set(id, mine);
    });

    data.caves.forEach((cave, index) => {
      const mineId = `mine_${index}`;
      this.caveSystems.set(mineId, cave);
    });
  }

  /**
   * Dispose of mining system
   */
  public dispose(): void {
    this.oreVoxels.clear();
    this.mineEntrances.clear();
    this.caveSystems.clear();
    this.playerTools.clear();
    this.discoveredOres.clear();
  }
}
