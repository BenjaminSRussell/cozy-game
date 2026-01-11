import { Renderer2D5, RenderObject, Camera, GameCanvas } from './Renderer2D5';
import { TileMap, TileData } from './TileMap';
import { Vector3D, Vector2D } from '../types/game';

/**
 * Enhanced 2.5D Tile Renderer
 * Renders tile-based worlds with proper depth sorting and isometric projection
 */

export interface TileRendererConfig {
  tileSize: number;
  enableShadows: boolean;
  enableAnimations: boolean;
  shadowOpacity: number;
  shadowOffset: number;
}

export class TileRenderer {
  private renderer: Renderer2D5;
  private tileMap: TileMap;
  private config: TileRendererConfig;
  private animationTime: number = 0;
  private canvas: GameCanvas;

  constructor(canvas: GameCanvas, tileMap: TileMap, config: TileRendererConfig) {
    this.renderer = new Renderer2D5(canvas);
    this.tileMap = tileMap;
    this.config = config;
    this.canvas = canvas;
  }

  /**
   * Update animation time
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  /**
   * Render the tile-based world
   */
  render(camera: Camera): void {
    // Clear and setup background
    this.renderer.render();
    
    // Get visible tiles
    const centerTile = this.worldToTile({ x: camera.x, y: camera.y });
    const visibleRadius = Math.ceil(
      Math.max(this.canvas.width, this.canvas.height) / 
      (this.config.tileSize * camera.scale)
    ) + 2;

    const visibleTiles = this.tileMap.getTilesInRange(
      centerTile.x, 
      centerTile.y, 
      visibleRadius
    );

    // Convert tiles to render objects
    const renderObjects = this.createRenderObjects(visibleTiles);

    // Sort by depth (y + z for proper 2.5D ordering)
    renderObjects.sort((a, b) => {
      const depthA = a.position.y + a.position.z;
      const depthB = b.position.y + b.position.z;
      return depthA - depthB;
    });

    // Queue all objects for rendering
    this.renderer.clearQueue();
    for (const object of renderObjects) {
      this.renderer.queueRender(object);
    }
    
    // Render the queue
    this.renderer.render();
  }

  /**
   * Convert world coordinates to tile coordinates
   */
  private worldToTile(worldPos: Vector2D): Vector2D {
    return this.tileMap.worldToTilePosition(worldPos);
  }

  /**
   * Create render objects from tiles
   */
  private createRenderObjects(tiles: TileData[]): RenderObject[] {
    const objects: RenderObject[] = [];

    for (const tile of tiles) {
      // Base tile
      const baseObject = this.createTileObject(tile);
      objects.push(baseObject);

      // Building on tile
      if (tile.building) {
        const buildingObject = this.createBuildingObject(tile);
        objects.push(buildingObject);
      }

      // Crop on tile
      if (tile.crop) {
        const cropObject = this.createCropObject(tile);
        objects.push(cropObject);
      }
    }

    return objects;
  }

  /**
   * Create render object for base tile
   */
  private createTileObject(tile: TileData): RenderObject {
    const worldPos = this.tileMap.tileToWorldPosition(tile);
    const spriteId = `${tile.type}_tile_${tile.variant || 0}`;

    return {
      id: `tile_${tile.position.x}_${tile.position.y}`,
      spriteId,
      position: worldPos,
      scale: 1,
      rotation: 0,
      opacity: 1,
      shadowOffset: this.config.enableShadows ? this.config.shadowOffset : 0
    };
  }

  /**
   * Create render object for building
   */
  private createBuildingObject(tile: TileData): RenderObject {
    const worldPos = this.tileMap.tileToWorldPosition(tile);
    const buildingType = tile.building?.type || 'house';
    
    // Add animation (swaying for trees, smoke for chimneys, etc.)
    const animOffset = this.getBuildingAnimationOffset(buildingType);
    
    return {
      id: `building_${tile.position.x}_${tile.position.y}`,
      spriteId: `${buildingType}_building`,
      position: {
        ...worldPos,
        y: worldPos.y + animOffset.y,
        z: worldPos.z + 1 // Buildings render on top of tiles
      },
      scale: 1,
      rotation: 0,
      opacity: 1,
      shadowOffset: this.config.enableShadows ? this.config.shadowOffset * 1.5 : 0
    };
  }

  /**
   * Create render object for crop
   */
  private createCropObject(tile: TileData): RenderObject {
    const worldPos = this.tileMap.tileToWorldPosition(tile);
    const cropStage = tile.cropStage || 0;
    
    // Add gentle swaying animation
    const swayAmount = Math.sin(this.animationTime * 2 + tile.position.x * 0.5) * 2;
    
    return {
      id: `crop_${tile.position.x}_${tile.position.y}`,
      spriteId: `${tile.crop}_stage_${cropStage}`,
      position: {
        ...worldPos,
        x: worldPos.x + swayAmount,
        y: worldPos.y + swayAmount * 0.3,
        z: worldPos.z + 0.5 // Crops render between tiles and buildings
      },
      scale: 1,
      rotation: 0,
      opacity: 1,
      shadowOffset: this.config.enableShadows ? this.config.shadowOffset * 0.5 : 0
    };
  }

  /**
   * Get animation offset for different building types
   */
  private getBuildingAnimationOffset(buildingType: string): Vector2D {
    if (!this.config.enableAnimations) return { x: 0, y: 0 };

    switch (buildingType) {
      case 'tree':
        return {
          x: Math.sin(this.animationTime * 1.5) * 3,
          y: Math.cos(this.animationTime * 1.5) * 1
        };
      case 'windmill':
        return {
          x: 0,
          y: Math.sin(this.animationTime * 3) * 2
        };
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Get the underlying renderer
   */
  getRenderer(): Renderer2D5 {
    return this.renderer;
  }

  /**
   * Get canvas dimensions
   */
  getCanvas(): GameCanvas {
    return this.canvas;
  }
}
