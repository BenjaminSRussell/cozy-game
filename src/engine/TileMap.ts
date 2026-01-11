import { Vector2D, Vector3D, TileType, Building, CropType } from '../types/game';

/**
 * Tile-based world system for 2.5D isometric rendering
 * Manages the grid-based world with proper depth sorting
 */

export interface TileData {
  type: TileType;
  position: Vector2D;
  elevation: number; // Height for 2.5D effect
  building?: Building;
  crop?: CropType;
  cropStage?: number;
  walkable: boolean;
  variant?: number; // For visual variety
}

export interface TileMapConfig {
  width: number;
  height: number;
  tileSize: number;
  elevationScale: number; // How much elevation affects visual height
}

export class TileMap {
  private tiles: Map<string, TileData> = new Map();
  private config: TileMapConfig;
  
  constructor(config: TileMapConfig) {
    this.config = config;
    this.generateBaseTerrain();
  }

  /**
   * Generate base terrain with elevation
   */
  private generateBaseTerrain(): void {
    for (let x = 0; x < this.config.width; x++) {
      for (let y = 0; y < this.config.height; y++) {
        const position: Vector2D = { x, y };
        const elevation = this.generateElevation(x, y);
        const tileType = this.determineTileType(elevation);
        
        const tile: TileData = {
          type: tileType,
          position,
          elevation,
          walkable: tileType !== 'water',
          variant: Math.floor(Math.random() * 4) // 4 visual variants per tile type
        };
        
        this.tiles.set(this.getTileKey(x, y), tile);
      }
    }
  }

  /**
   * Generate elevation using simplex noise simulation
   */
  private generateElevation(x: number, y: number): number {
    // Simple elevation generation - can be replaced with proper noise
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
    
    // Create a gentle hill in the center
    const baseElevation = Math.max(0, 1 - (distance / maxDistance)) * 3;
    
    // Add some randomness
    const noise = (Math.sin(x * 0.1) + Math.cos(y * 0.1)) * 0.5;
    
    return baseElevation + noise;
  }

  /**
   * Determine tile type based on elevation
   */
  private determineTileType(elevation: number): TileType {
    if (elevation < 0.2) return 'water';
    if (elevation < 0.4) return 'sand';
    if (elevation < 0.8) return 'grass';
    if (elevation < 1.2) return 'dirt';
    return 'stone';
  }

  /**
   * Get tile key for map storage
   */
  private getTileKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Get tile at position
   */
  getTile(x: number, y: number): TileData | undefined {
    return this.tiles.get(this.getTileKey(x, y));
  }

  /**
   * Set tile data
   */
  setTile(x: number, y: number, tile: Partial<TileData>): void {
    const existing = this.getTile(x, y);
    if (existing) {
      const updated = { ...existing, ...tile };
      this.tiles.set(this.getTileKey(x, y), updated);
    }
  }

  /**
   * Get all tiles for rendering
   */
  getAllTiles(): TileData[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Get tiles in range for visibility culling
   */
  getTilesInRange(centerX: number, centerY: number, radius: number): TileData[] {
    const result: TileData[] = [];
    
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const tile = this.getTile(x, y);
        if (tile) {
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          if (distance <= radius) {
            result.push(tile);
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Convert tile coordinates to 2.5D world position
   */
  tileToWorldPosition(tile: TileData): Vector3D {
    const tileSize = this.config.tileSize;
    const elevationScale = this.config.elevationScale;
    
    return {
      x: tile.position.x * tileSize,
      y: tile.position.y * tileSize - (tile.elevation * elevationScale),
      z: tile.elevation // Use elevation for depth sorting
    };
  }

  /**
   * Convert world position to tile coordinates
   */
  worldToTilePosition(worldPos: Vector2D): Vector2D {
    const tileSize = this.config.tileSize;
    return {
      x: Math.floor(worldPos.x / tileSize),
      y: Math.floor(worldPos.y / tileSize)
    };
  }

  /**
   * Check if tile is walkable
   */
  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile?.walkable ?? false;
  }

  /**
   * Place building on tile
   */
  placeBuilding(x: number, y: number, building: Building): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.walkable) return false;
    
    this.setTile(x, y, { building, walkable: false });
    return true;
  }

  /**
   * Place crop on tile
   */
  placeCrop(x: number, y: number, cropType: CropType): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.walkable || tile.building) return false;
    
    this.setTile(x, y, { crop: cropType, cropStage: 0 });
    return true;
  }

  /**
   * Get tile configuration
   */
  getConfig(): TileMapConfig {
    return { ...this.config };
  }
}
