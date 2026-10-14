/**
 * Enhanced Crop System for 2.5D Isometric World
 * 
 * Detailed crop growth with multiple stages, health, and environmental factors
 */

import { CropStage } from '../types/game';

export interface CropVoxel {
  x: number;
  y: number;
  z: number;
  cropType: 'wheat' | 'carrot' | 'tomato' | 'corn' | 'potato' | 'pumpkin' | 'strawberry' | 'blueberry' | 'cranberry';
  stage: CropStage;
  health: number; // 0-100
  waterLevel: number; // 0-100
  growth: number; // 0-100 (progress to next stage, or to the next regrowth day)
  plantedTime: number;
  lastWatered: number;
  height: number; // Visual height in voxels
  quality: 'poor' | 'normal' | 'good' | 'excellent';
  /** Days between harvests. 0 removes the plant on harvest. */
  regrowthDays: number;
  /** Stage the plant returns to after a multi-harvest (mature bush). */
  regrowthStage: CropStage;
  /** Days remaining until the next harvest. 0 means not in a regrowth cycle. */
  daysUntilNextHarvest: number;
}

export interface CropConfig {
  type: string;
  name: string;
  growthStages: number;
  growthTime: number; // minutes per stage
  waterNeed: number; // water consumption per minute
  maxHealth: number;
  baseYield: number;
  sellValue: number;
  seasons: ('spring' | 'summer' | 'autumn' | 'winter')[];
  colors: {
    seed: string;
    sprouting: string;
    growing: string;
    mature: string;
    harvestable: string;
    dead: string;
  };
  voxelHeight: {
    seed: number;
    sprouting: number;
    growing: number;
    mature: number;
    harvestable: number;
  };
  /** Days to the next harvest after picking. 0 means the plant is removed. */
  regrowthDays: number;
  /** Stage restored on harvest when regrowthDays > 0. */
  regrowthStage: CropStage;
}

export class CropSystem {
  /** Frame delta that counts as one day while a multi-harvest crop regrows. */
  static readonly REGROWTH_DAY_MS = 60_000;

  private crops: Map<string, CropVoxel> = new Map();
  private cropConfigs: Map<string, CropConfig> = new Map();
  private currentTime: number = Date.now();

  constructor() {
    this.initializeCropConfigs();
  }

  /**
   * Initialize all crop configurations
   */
  private initializeCropConfigs(): void {
    const configs: CropConfig[] = [
      {
        type: 'wheat',
        name: 'Wheat',
        growthStages: 8,
        growthTime: 180, // 3 hours per stage
        waterNeed: 2,
        maxHealth: 100,
        baseYield: 5,
        sellValue: 50,
        seasons: ['spring', 'summer', 'autumn'],
        colors: {
          seed: '#F4E4C1',
          sprouting: '#90EE90',
          growing: '#7CB342',
          mature: '#DAA520',
          harvestable: '#FFD700',
          dead: '#8B4513'
        },
        voxelHeight: {
          seed: 1,
          sprouting: 2,
          growing: 3,
          mature: 4,
          harvestable: 5
        },
        regrowthDays: 0,
        regrowthStage: CropStage.MATURE
      },
      {
        type: 'carrot',
        name: 'Carrot',
        growthStages: 6,
        growthTime: 120, // 2 hours per stage
        waterNeed: 1.5,
        maxHealth: 90,
        baseYield: 3,
        sellValue: 40,
        seasons: ['spring', 'summer', 'autumn'],
        colors: {
          seed: '#FFE4B5',
          sprouting: '#90EE90',
          growing: '#FF8C00',
          mature: '#FF6347',
          harvestable: '#FF4500',
          dead: '#8B4513'
        },
        voxelHeight: {
          seed: 1,
          sprouting: 1,
          growing: 2,
          mature: 2,
          harvestable: 2
        },
        regrowthDays: 0,
        regrowthStage: CropStage.MATURE
      },
      {
        type: 'tomato',
        name: 'Tomato',
        growthStages: 7,
        growthTime: 240, // 4 hours per stage
        waterNeed: 3,
        maxHealth: 80,
        baseYield: 4,
        sellValue: 60,
        seasons: ['spring', 'summer', 'autumn'],
        colors: {
          seed: '#FFF8DC',
          sprouting: '#90EE90',
          growing: '#32CD32',
          mature: '#DC143C',
          harvestable: '#FF0000',
          dead: '#8B4513'
        },
        voxelHeight: {
          seed: 1,
          sprouting: 2,
          growing: 3,
          mature: 4,
          harvestable: 4
        },
        regrowthDays: 3,
        regrowthStage: CropStage.MATURE
      },
      {
        type: 'corn',
        name: 'Corn',
        growthStages: 6,
        growthTime: 300, // 5 hours per stage
        waterNeed: 4,
        maxHealth: 100,
        baseYield: 6,
        sellValue: 75,
        seasons: ['spring', 'summer'],
        colors: {
          seed: '#FFFACD',
          sprouting: '#90EE90',
          growing: '#ADFF2F',
          mature: '#FFD700',
          harvestable: '#FFA500',
          dead: '#8B4513'
        },
        voxelHeight: {
          seed: 1,
          sprouting: 2,
          growing: 4,
          mature: 6,
          harvestable: 6
        },
        regrowthDays: 0,
        regrowthStage: CropStage.MATURE
      },
      {
        type: 'strawberry',
        name: 'Strawberry',
        growthStages: 5,
        growthTime: 150, // 2.5 hours per stage
        waterNeed: 2,
        maxHealth: 70,
        baseYield: 8,
        sellValue: 80,
        seasons: ['spring', 'summer'],
        colors: {
          seed: '#FFE4E1',
          sprouting: '#90EE90',
          growing: '#228B22',
          mature: '#FF1493',
          harvestable: '#DC143C',
          dead: '#8B4513'
        },
        voxelHeight: {
          seed: 1,
          sprouting: 1,
          growing: 1,
          mature: 2,
          harvestable: 2
        },
        regrowthDays: 2,
        regrowthStage: CropStage.MATURE
      },
      {
        type: 'blueberry',
        name: 'Blueberry',
        growthStages: 5,
        growthTime: 160,
        waterNeed: 2,
        maxHealth: 70,
        baseYield: 8,
        sellValue: 85,
        seasons: ['spring', 'summer'],
        colors: {
          seed: '#E6E6FA',
          sprouting: '#90EE90',
          growing: '#228B22',
          mature: '#6A5ACD',
          harvestable: '#4169E1',
          dead: '#8B4513'
        },
        voxelHeight: {
          seed: 1,
          sprouting: 1,
          growing: 2,
          mature: 2,
          harvestable: 2
        },
        regrowthDays: 3,
        regrowthStage: CropStage.MATURE
      },
      {
        type: 'cranberry',
        name: 'Cranberry',
        growthStages: 5,
        growthTime: 180,
        waterNeed: 2,
        maxHealth: 75,
        baseYield: 8,
        sellValue: 90,
        seasons: ['spring', 'summer', 'autumn'],
        colors: {
          seed: '#FFE4E1',
          sprouting: '#90EE90',
          growing: '#2E8B57',
          mature: '#CD5C5C',
          harvestable: '#B22222',
          dead: '#8B4513'
        },
        voxelHeight: {
          seed: 1,
          sprouting: 1,
          growing: 1,
          mature: 2,
          harvestable: 2
        },
        regrowthDays: 2,
        regrowthStage: CropStage.MATURE
      }
    ];

    configs.forEach(config => {
      this.cropConfigs.set(config.type, config);
    });
  }

  /**
   * Plant a new crop
   */
  public plantCrop(x: number, y: number, cropType: string): boolean {
    const id = `${cropType}_${x}_${y}`;

    if (this.crops.has(id)) {
      return false; // Crop already exists
    }

    const config = this.cropConfigs.get(cropType);
    if (!config) {
      return false; // Invalid crop type
    }

    const crop: CropVoxel = {
      x,
      y,
      z: 1, // Crops grow on top of terrain
      cropType: cropType as any,
      stage: CropStage.SEED,
      health: 100,
      waterLevel: 50,
      growth: 0,
      plantedTime: this.currentTime,
      lastWatered: this.currentTime,
      height: config.voxelHeight.seed,
      quality: 'normal',
      regrowthDays: config.regrowthDays,
      regrowthStage: config.regrowthStage,
      daysUntilNextHarvest: 0
    };

    this.crops.set(id, crop);
    return true;
  }

  /**
   * Update all crops (called each game tick)
   */
  public updateCrops(deltaTime: number, season: string): void {
    this.currentTime += deltaTime;

    this.crops.forEach((crop, id) => {
      const config = this.cropConfigs.get(crop.cropType);
      if (!config) return;

      // Check if crop can grow in current season
      if (!config.seasons.includes(season as any)) {
        this.damageCrop(id, 5 * deltaTime / 1000); // Slow damage in wrong season
        return;
      }

      // Update water level (evaporation)
      crop.waterLevel = Math.max(0, crop.waterLevel - config.waterNeed * deltaTime / 60000);

      // Update health based on water
      if (crop.waterLevel < 20) {
        this.damageCrop(id, 10 * deltaTime / 1000);
      } else if (crop.waterLevel > 80) {
        this.healCrop(id, 5 * deltaTime / 1000);
      }

      // Multi-harvest plants fruit again only while watered, same gate as growth.
      if (crop.stage !== CropStage.DEAD && crop.daysUntilNextHarvest > 0) {
        if (crop.health > 30 && crop.waterLevel > 30) {
          crop.growth += (deltaTime / CropSystem.REGROWTH_DAY_MS) * 100;
          while (crop.growth >= 100 && crop.daysUntilNextHarvest > 0) {
            crop.growth -= 100;
            crop.daysUntilNextHarvest -= 1;
          }
          if (crop.daysUntilNextHarvest <= 0) {
            crop.daysUntilNextHarvest = 0;
            crop.stage = CropStage.HARVESTABLE;
            crop.growth = 0;
          }
        }
      } else if (crop.health > 30 && crop.waterLevel > 30 && crop.stage !== CropStage.HARVESTABLE) {
        crop.growth += (deltaTime / 1000) / config.growthTime * 100;

        // Check for stage advancement
        if (crop.growth >= 100) {
          this.advanceCropStage(id);
        }
      }

      // Update visual height
      const stageConfig = this.getStageConfig(crop.cropType, crop.stage);
      crop.height = stageConfig?.height || 1;

      // Check if crop dies
      if (crop.health <= 0) {
        crop.stage = CropStage.DEAD;
        crop.height = 1;
      }
    });
  }

  /**
   * Advance crop to next stage
   */
  private advanceCropStage(cropId: string): void {
    const crop = this.crops.get(cropId);
    if (!crop) return;
    // Death comes from health or water, not from growing past harvest.
    if (crop.stage === CropStage.HARVESTABLE || crop.stage === CropStage.DEAD) return;

    const currentStageIndex = Object.values(CropStage).indexOf(crop.stage);
    const nextStageIndex = currentStageIndex + 1;
    const nextStage = Object.values(CropStage)[nextStageIndex] as CropStage | undefined;

    if (nextStage !== undefined) {
      crop.stage = nextStage;
      crop.growth = 0;
    }
  }

  /**
   * Water a crop
   */
  public waterCrop(x: number, y: number, amount: number = 30): boolean {
    const cropId = this.findCropAt(x, y);
    if (!cropId) return false;

    const crop = this.crops.get(cropId);
    if (!crop) return false;

    crop.waterLevel = Math.min(100, crop.waterLevel + amount);
    crop.lastWatered = this.currentTime;
    return true;
  }

  /**
   * Damage a crop
   */
  private damageCrop(cropId: string, amount: number): void {
    const crop = this.crops.get(cropId);
    if (!crop) return;

    crop.health = Math.max(0, crop.health - amount);
    this.updateCropQuality(crop);
  }

  /**
   * Heal a crop
   */
  private healCrop(cropId: string, amount: number): void {
    const crop = this.crops.get(cropId);
    if (!crop) return;

    const config = this.cropConfigs.get(crop.cropType);
    if (!config) return;

    crop.health = Math.min(config.maxHealth, crop.health + amount);
    this.updateCropQuality(crop);
  }

  /**
   * Update crop quality based on health
   */
  private updateCropQuality(crop: CropVoxel): void {
    const config = this.cropConfigs.get(crop.cropType);
    const healthPercent = config ? (crop.health / config.maxHealth) * 100 : 100;

    if (healthPercent >= 90) {
      crop.quality = 'excellent';
    } else if (healthPercent >= 70) {
      crop.quality = 'good';
    } else if (healthPercent >= 40) {
      crop.quality = 'normal';
    } else {
      crop.quality = 'poor';
    }
  }

  /**
   * Harvest a crop
   */
  public harvestCrop(x: number, y: number): {
    success: boolean;
    cropType?: string;
    yield?: number;
    quality?: string;
    value?: number;
  } {
    const cropId = this.findCropAt(x, y);
    if (!cropId) {
      return { success: false };
    }

    const crop = this.crops.get(cropId);
    if (!crop || crop.stage !== CropStage.HARVESTABLE) {
      return { success: false };
    }

    const config = this.cropConfigs.get(crop.cropType);
    if (!config) {
      return { success: false };
    }

    // Calculate yield based on quality
    const qualityMultiplier = {
      poor: 0.5,
      normal: 1.0,
      good: 1.5,
      excellent: 2.0
    };

    const finalYield = Math.floor(config.baseYield * qualityMultiplier[crop.quality]);
    const finalValue = Math.floor(config.sellValue * qualityMultiplier[crop.quality]);

    const regrowthDays = crop.regrowthDays > 0 ? crop.regrowthDays : config.regrowthDays;
    if (regrowthDays > 0) {
      // Keep the plant (and its plot) so berries and trellis crops fruit again.
      crop.regrowthDays = regrowthDays;
      crop.regrowthStage = crop.regrowthStage ?? config.regrowthStage;
      crop.stage = crop.regrowthStage;
      crop.daysUntilNextHarvest = regrowthDays;
      crop.growth = 0;
      crop.height = this.getStageConfig(crop.cropType, crop.stage)?.height || crop.height;
    } else {
      this.crops.delete(cropId);
    }

    return {
      success: true,
      cropType: crop.cropType,
      yield: finalYield,
      quality: crop.quality,
      value: finalValue
    };
  }

  /**
   * Find crop at position
   */
  private findCropAt(x: number, y: number): string | null {
    for (const [id, crop] of this.crops) {
      if (crop.x === x && crop.y === y) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get crop at position
   */
  public getCropAt(x: number, y: number): CropVoxel | null {
    const cropId = this.findCropAt(x, y);
    return cropId ? this.crops.get(cropId) || null : null;
  }

  /**
   * Get all crops
   */
  public getAllCrops(): CropVoxel[] {
    return Array.from(this.crops.values());
  }

  /**
   * Get crop color based on stage and health
   */
  public getCropColor(crop: CropVoxel): string {
    const config = this.cropConfigs.get(crop.cropType);
    if (!config) return '#808080';

    const stageColors = config.colors;
    let baseColor = stageColors[this.getStageKey(crop.stage) as keyof typeof stageColors] || stageColors.seed;

    // Modify color based on health
    if (crop.health < 30) {
      return this.darkenColor(baseColor, 0.4);
    } else if (crop.health < 60) {
      return this.darkenColor(baseColor, 0.2);
    }

    return baseColor;
  }

  /**
   * Get stage configuration
   */
  private getStageConfig(cropType: string, stage: CropStage): { height: number } | null {
    const config = this.cropConfigs.get(cropType);
    if (!config) return null;

    const height = config?.voxelHeight[this.getStageKey(stage) as keyof typeof config.voxelHeight] || 1;
    return {
      height
    };
  }

  /**
   * Convert CropStage to key
   */
  private getStageKey(stage: CropStage): string {
    switch (stage) {
      case CropStage.SEED: return 'seed';
      case CropStage.SPROUTING: return 'sprouting';
      case CropStage.GROWING: return 'growing';
      case CropStage.MATURE: return 'mature';
      case CropStage.HARVESTABLE: return 'harvestable';
      case CropStage.DEAD: return 'dead';
      default: return 'seed';
    }
  }

  /**
   * Darken color for health effects
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
   * Get crop statistics
   */
  public getCropStats(): {
    totalCrops: number;
    stageDistribution: Record<string, number>;
    healthDistribution: Record<string, number>;
    qualityDistribution: Record<string, number>;
  } {
    const stageDistribution: Record<string, number> = {};
    const healthDistribution: Record<string, number> = { healthy: 0, struggling: 0, dying: 0 };
    const qualityDistribution: Record<string, number> = {};

    this.crops.forEach(crop => {
      // Stage distribution
      const cropConfig = this.cropConfigs.get(crop.cropType);
      if (!cropConfig) return;

      const stageKey = this.getStageKey(crop.stage) as keyof typeof cropConfig.voxelHeight;
      stageDistribution[stageKey] = (stageDistribution[stageKey] || 0) + 1;

      // Health distribution
      if (crop.health >= 70) {
        healthDistribution.healthy++;
      } else if (crop.health >= 40) {
        healthDistribution.struggling++;
      } else {
        healthDistribution.dying++;
      }

      // Quality distribution
      qualityDistribution[crop.quality] = (qualityDistribution[crop.quality] || 0) + 1;
    });

    return {
      totalCrops: this.crops.size,
      stageDistribution,
      healthDistribution,
      qualityDistribution
    };
  }

  /**
   * Export crop data for saving
   */
  public exportCrops(): CropVoxel[] {
    return Array.from(this.crops.values());
  }

  /**
   * Import crop data from save
   */
  public importCrops(crops: CropVoxel[]): void {
    this.crops.clear();
    crops.forEach(crop => {
      const id = `${crop.cropType}_${crop.x}_${crop.y}`;
      this.crops.set(id, crop);
    });
  }

  /**
   * Dispose of crop system
   */
  public dispose(): void {
    this.crops.clear();
  }
}
