/**
 * Enhanced Terrain System for 2.5D Isometric World
 * 
 * Advanced voxel terrain with moisture, fertility, seasons
 */

import { Season } from '../types/game';

export interface TerrainVoxel {
  x: number;
  y: number;
  z: number;
  terrainType: 'grass' | 'dirt' | 'water' | 'stone' | 'sand' | 'snow';
  moisture: number; // 0-100
  fertility: number; // 0-100
  season: Season;
  height: number;
  variation: number; // 0-10 for visual variety
}

export interface TerrainConfig {
  tileSize: number;
  voxelHeight: number;
  worldSize: number;
  season: Season;
  moistureMap: number[][];
  fertilityMap: number[][];
}

export class TerrainSystem {
  private config: TerrainConfig;
  private voxels: TerrainVoxel[] = [];
  private terrainColors = {
    grass: {
      base: '#228B22',
      dry: '#8B7355',
      lush: '#006400',
      flowers: '#32CD32',
      sandy: '#9ACD32'
    } as Record<string, string>,
    dirt: {
      tilled: '#8B4513',
      dry: '#A0522D',
      fertilized: '#654321',
      path: '#696969'
    } as Record<string, string>,
    water: {
      still: '#4682B4',
      flow: '#1E90FF',
      shallow: '#87CEEB',
      deep: '#191970'
    } as Record<string, string>,
    stone: {
      gray: '#808080',
      dark: '#696969',
      mossy: '#556B2F'
    } as Record<string, string>,
    sand: {
      beach: '#F4E4C1',
      desert: '#EDC9AF'
    } as Record<string, string>,
    snow: {
      fresh: '#FFFAFA',
      packed: '#B0C4DE',
      melting: '#E0FFFF'
    } as Record<string, string>
  };

  constructor(config: TerrainConfig) {
    this.config = config;
    this.generateTerrain();
  }

  /**
   * Generate complete terrain world
   */
  public generateTerrain(width: number = 0, height: number = 0): void {
    if (width > 0) this.config.worldSize = width;
    this.voxels = [];

    for (let x = 0; x < this.config.worldSize; x++) {
      for (let y = 0; y < this.config.worldSize; y++) {
        const terrainType = this.determineTerrainType(x, y);
        const moisture = this.getMoistureLevel(x, y);
        const fertility = this.getFertilityLevel(x, y);
        const height = this.calculateTerrainHeight(x, y, terrainType);
        const variation = Math.floor(Math.random() * 10);

        this.voxels.push({
          x,
          y,
          z: 0,
          terrainType,
          moisture,
          fertility,
          season: this.config.season,
          height,
          variation
        });
      }
    }
  }

  /**
   * Determine terrain type based on position
   */
  private determineTerrainType(x: number, y: number): TerrainVoxel['terrainType'] {
    const noise = this.perlinNoise(x * 0.1, y * 0.1);

    // Create terrain patches
    if (noise < -0.3) return 'water';
    if (noise < -0.1) return 'sand';
    if (noise < 0.2) return 'grass';
    if (noise < 0.4) return 'dirt';
    return 'stone';
  }

  /**
   * Simple Perlin noise implementation
   */
  private perlinNoise(x: number, y: number): number {
    // Simplified noise function
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  /**
   * Get moisture level for position
   */
  private getMoistureLevel(x: number, y: number): number {
    const moistureNoise = this.perlinNoise(x * 0.05, y * 0.05);
    return Math.floor((moistureNoise + 1) * 50); // 0-100
  }

  /**
   * Get fertility level for position
   */
  private getFertilityLevel(x: number, y: number): number {
    const fertilityNoise = this.perlinNoise(x * 0.08 + 100, y * 0.08 + 100);
    return Math.floor((fertilityNoise + 1) * 50); // 0-100
  }

  /**
   * Calculate terrain height
   */
  private calculateTerrainHeight(x: number, y: number, terrainType: TerrainVoxel['terrainType']): number {
    const baseHeight = 0;

    switch (terrainType) {
      case 'water':
        return -2; // Water is lower
      case 'stone':
        return Math.floor(this.perlinNoise(x * 0.2, y * 0.2) * 3);
      case 'sand':
        return 0;
      default:
        return baseHeight;
    }
  }

  /**
   * Get terrain color based on type and conditions
   */
  public getTerrainColor(voxel: TerrainVoxel): string {
    const { terrainType, moisture, fertility, season, variation } = voxel;
    const colors = this.terrainColors[terrainType];

    switch (terrainType) {
      case 'grass':
        if (season === 'winter') return this.terrainColors.snow.fresh;
        if (season === 'autumn') return '#DAA520';
        if (moisture > 70) return colors.lush;
        if (moisture < 30) return colors.dry;
        if (variation > 7) return colors.flowers;
        return colors.base;

      case 'dirt':
        if (fertility > 70) return colors.fertilized;
        if (moisture > 60) return colors.tilled;
        if (moisture < 20) return colors.dry;
        return colors.path;

      case 'water':
        if (season === 'winter') return this.terrainColors.snow.packed;
        if (voxel.height < -1) return colors.deep;
        return colors.still;

      case 'stone':
        if (moisture > 80) return colors.mossy;
        return variation > 5 ? colors.dark : colors.gray;

      case 'sand':
        return season === 'winter' ? this.terrainColors.snow.fresh : colors.beach;

      case 'snow':
        return colors.fresh;

      default:
        return '#808080';
    }
  }

  /**
   * Update terrain for new season
   */
  public updateSeason(newSeason: Season): void {
    this.config.season = newSeason;

    // Update all terrain voxels
    this.voxels.forEach(voxel => {
      voxel.season = newSeason;

      // Seasonal effects
      if (newSeason === 'winter' && voxel.terrainType === 'grass') {
        voxel.height += 1; // Snow accumulation
      } else if (newSeason === 'spring' && voxel.terrainType === 'grass') {
        voxel.height = Math.max(0, voxel.height - 1); // Snow melt
      }
    });
  }

  /**
   * Update moisture levels (rain/drought)
   */
  public updateMoisture(change: number, area?: { x: number; y: number; radius: number }): void {
    if (area) {
      // Update moisture in specific area
      this.voxels.forEach(voxel => {
        const distance = Math.sqrt(
          Math.pow(voxel.x - area.x, 2) + Math.pow(voxel.y - area.y, 2)
        );
        if (distance <= area.radius) {
          voxel.moisture = Math.max(0, Math.min(100, voxel.moisture + change));
        }
      });
    } else {
      // Update all moisture
      this.voxels.forEach(voxel => {
        voxel.moisture = Math.max(0, Math.min(100, voxel.moisture + change));
      });
    }
  }

  /**
   * Get terrain voxel at position
   */
  public getTerrainVoxel(x: number, y: number): TerrainVoxel | null {
    return this.voxels.find(v => v.x === x && v.y === y) || null;
  }

  /**
   * Check if position is farmable
   */
  public isFarmable(x: number, y: number): boolean {
    const voxel = this.getTerrainVoxel(x, y);
    if (!voxel) return false;

    return voxel.terrainType === 'grass' || voxel.terrainType === 'dirt';
  }

  /**
   * Till soil at position
   */
  public tillSoil(x: number, y: number): boolean {
    const voxel = this.getTerrainVoxel(x, y);
    if (!voxel || !this.isFarmable(x, y)) return false;

    voxel.terrainType = 'dirt';
    voxel.moisture = Math.min(100, voxel.moisture + 20);
    voxel.fertility = Math.min(100, voxel.fertility + 10);
    return true;
  }

  /**
   * Water terrain at position
   */
  public waterTerrain(x: number, y: number, amount: number): boolean {
    const voxel = this.getTerrainVoxel(x, y);
    if (!voxel) return false;

    voxel.moisture = Math.min(100, voxel.moisture + amount);
    return true;
  }

  /**
   * Get all terrain voxels
   */
  public getAllTerrainVoxels(): TerrainVoxel[] {
    return [...this.voxels];
  }

  /**
   * Get terrain statistics
   */
  public getTerrainStats(): {
    totalVoxels: number;
    terrainDistribution: Record<string, number>;
    averageMoisture: number;
    averageFertility: number;
  } {
    const distribution: Record<string, number> = {};
    let totalMoisture = 0;
    let totalFertility = 0;

    this.voxels.forEach(voxel => {
      distribution[voxel.terrainType] = (distribution[voxel.terrainType] || 0) + 1;
      totalMoisture += voxel.moisture;
      totalFertility += voxel.fertility;
    });

    return {
      totalVoxels: this.voxels.length,
      terrainDistribution: distribution,
      averageMoisture: totalMoisture / this.voxels.length,
      averageFertility: totalFertility / this.voxels.length
    };
  }

  /**
   * Export terrain data for saving
   */
  public exportTerrain(): {
    config: TerrainConfig;
    voxels: TerrainVoxel[];
  } {
    return {
      config: this.config,
      voxels: this.voxels
    };
  }

  /**
   * Import terrain data from save
   */
  public importTerrain(data: { config: TerrainConfig; voxels: TerrainVoxel[] }): void {
    this.config = data.config;
    this.voxels = data.voxels;
  }

  /**
   * Dispose of terrain system
   */
  public dispose(): void {
    this.voxels = [];
  }
}
