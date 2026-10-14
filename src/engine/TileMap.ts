import type { Vector2D, Vector3D, TileType, Building, CropType } from '../types/game';

/**
 * Tile-based world system for 2.5D isometric rendering
 * Manages the grid-based world with proper depth sorting
 */

/** Obstacles stored per cell. A cell is walkable only when the mask is NONE. */
export enum CollisionFlag {
  NONE = 0,
  WATER = 1 << 0,
  CLIFF = 1 << 1,
  BUILDING = 1 << 2,
  FENCE = 1 << 3,
  TREE = 1 << 4,
}

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
  /** Collision bits for the active farm map. Index is y * width + x. */
  readonly collisionMatrix: Uint8Array;
  
  constructor(config: TileMapConfig) {
    this.config = config;
    this.collisionMatrix = new Uint8Array(config.width * config.height);
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
          variant: Math.floor(TileMap.seededRandom(x * 1000 + y)() * 4) // 4 visual variants, stable per tile
        };
        
        this.tiles.set(this.getTileKey(x, y), tile);
        this.syncCollision(x, y, tile);
      }
    }
  }

  /**
   * Same LCG as GameEngine.seededRandom. One call per tile, seeded by position.
   */
  private static seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  /**
   * Generate elevation: a radial hill plus deterministic value noise.
   * The hash replaces sin/cos so tile borders do not repeat every ~63 tiles.
   */
  private generateElevation(x: number, y: number): number {
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));

    // Create a gentle hill in the center
    const baseElevation = Math.max(0, 1 - (distance / maxDistance)) * 3;

    const hash = (n: number) => {
      n = Math.sin(n) * 43758.5453;
      return n - Math.floor(n);
    };
    const noise = (hash(x * 127.1 + y * 311.7) * 2 - 1) * 0.5;

    return Math.max(0, baseElevation + noise);
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
   * Get tile at position. Out-of-range coordinates return null, not undefined.
   */
  getTile(x: number, y: number): TileData | null {
    if (x < 0 || y < 0 || x >= this.config.width || y >= this.config.height) {
      return null;
    }
    return this.tiles.get(this.getTileKey(x, y)) ?? null;
  }

  /**
   * Set tile data
   */
  setTile(x: number, y: number, tile: Partial<TileData>): void {
    const existing = this.getTile(x, y);
    if (existing) {
      const updated = { ...existing, ...tile };
      this.tiles.set(this.getTileKey(x, y), updated);
      this.syncCollision(x, y, updated);
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
    return Boolean(tile?.walkable) && this.isTileWalkable(x, y);
  }

  /**
   * True only when the cell is on the map and its collision mask is NONE.
   * Off-map queries are not walkable.
   */
  isTileWalkable(x: number, y: number): boolean {
    const index = this.collisionIndex(x, y);
    if (index === null) return false;
    return this.collisionMatrix[index] === CollisionFlag.NONE;
  }

  /**
   * Place building on tile
   */
  placeBuilding(x: number, y: number, building: Building): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.walkable || !this.isTileWalkable(x, y)) return false;
    
    this.setTile(x, y, { building, walkable: false });
    return true;
  }

  /**
   * Place crop on tile
   */
  placeCrop(x: number, y: number, cropType: CropType): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.walkable || !this.isTileWalkable(x, y) || tile.building) return false;
    
    this.setTile(x, y, { crop: cropType, cropStage: 0 });
    return true;
  }

  /**
   * Water, trees, and placed buildings block the cell. Other ground stays open.
   * Trees are buildings whose type or sprite id is tree, not barns or houses.
   */
  private flagsForTile(tile: TileData): number {
    let flags = CollisionFlag.NONE;
    if (tile.type === 'water') flags |= CollisionFlag.WATER;
    if (tile.building) {
      flags |= this.isTreeObstacle(tile.building) ? CollisionFlag.TREE : CollisionFlag.BUILDING;
    }
    return flags;
  }

  private isTreeObstacle(building: Building): boolean {
    const label = `${building.type} ${building.spriteId}`.toLowerCase();
    return /(^|[^a-z])tree([^a-z]|$)/.test(label);
  }

  private collisionIndex(x: number, y: number): number | null {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
    if (x < 0 || y < 0 || x >= this.config.width || y >= this.config.height) return null;
    return y * this.config.width + x;
  }

  private syncCollision(x: number, y: number, tile: TileData): void {
    const index = this.collisionIndex(x, y);
    if (index === null) return;
    this.collisionMatrix[index] = this.flagsForTile(tile);
  }

  /**
   * Get tile configuration
   */
  getConfig(): TileMapConfig {
    return { ...this.config };
  }
}
