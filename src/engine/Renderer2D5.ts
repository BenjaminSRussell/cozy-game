import { Vector3D, Vector2D, SpriteAsset } from '../types/game';

/**
 * 2.5D Renderer for Cozy Haven
 * Handles isometric/pseudo-3D rendering on canvas
 * Uses y-sorting for depth perception
 */

export interface Camera {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
}

export interface RenderObject {
  id: string;
  spriteId: string;
  position: Vector3D;
  scale: number;
  rotation: number;
  opacity: number;
  tint?: string;
  shadowOffset?: number;
}

export interface GameCanvas {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export class Renderer2D5 {
  private canvas: GameCanvas;
  private camera: Camera;
  private spriteCache: Map<string, HTMLImageElement> = new Map();
  private renderQueue: RenderObject[] = [];
  private tileSize: number = 32;

  constructor(canvas: GameCanvas) {
    this.canvas = canvas;
    this.camera = {
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      rotation: 0,
    };
  }

  /**
   * Isometric coordinate conversion
   * Converts 3D world coords to 2D screen coords
   */
  worldToScreen(worldPos: Vector3D): Vector2D {
    // Isometric projection
    const x = worldPos.x - worldPos.y;
    const y = (worldPos.x + worldPos.y) / 2 - worldPos.z;

    // Apply camera offset and scale
    const screenX = (x - this.camera.x) * this.camera.scale + this.canvas.width / 2;
    const screenY = (y - this.camera.y) * this.camera.scale + this.canvas.height / 2;

    return { x: screenX, y: screenY };
  }

  /**
   * Screen to world coordinate conversion
   */
  screenToWorld(screenPos: Vector2D): Vector3D {
    const relX = (screenPos.x - this.canvas.width / 2) / this.camera.scale + this.camera.x;
    const relY = (screenPos.y - this.canvas.height / 2) / this.camera.scale + this.camera.y;

    // Inverse isometric projection
    const x = (relX + relY * 2) / 2;
    const y = (relY * 2 - relX) / 2;
    const z = this.camera.z;

    return { x, y, z };
  }

  /**
   * Move camera to follow target
   */
  panToPosition(targetWorld: Vector3D, smoothing: number = 0.1): void {
    const targetScreen = this.worldToScreen(targetWorld);
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.camera.x += (targetWorld.x - this.camera.x) * smoothing;
    this.camera.y += (targetWorld.y - this.camera.y) * smoothing;
  }

  /**
   * Set camera zoom
   */
  setZoom(zoom: number): void {
    this.camera.scale = Math.max(0.5, Math.min(3, zoom));
  }

  /**
   * Add object to render queue
   */
  queueRender(object: RenderObject): void {
    this.renderQueue.push(object);
  }

  /**
   * Clear render queue
   */
  clearQueue(): void {
    this.renderQueue = [];
  }

  /**
   * Y-sort queue for proper depth rendering
   * Objects higher up screen (lower y) render first
   */
  private sortRenderQueue(): void {
    this.renderQueue.sort((a, b) => {
      // Y-sorting for 2.5D depth illusion
      const aScreenY = this.worldToScreen(a.position).y;
      const bScreenY = this.worldToScreen(b.position).y;
      return aScreenY - bScreenY;
    });
  }

  /**
   * Load sprite image
   */
  async loadSprite(spriteId: string, path: string): Promise<HTMLImageElement> {
    if (this.spriteCache.has(spriteId)) {
      return this.spriteCache.get(spriteId)!;
    }

    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image() as HTMLImageElement;
      img.onload = () => {
        this.spriteCache.set(spriteId, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load sprite: ${path}`));
      img.src = path;
    });
  }

  /**
   * Render a single object with enhanced visual effects
   */
  private renderObject(object: RenderObject): void {
    const sprite = this.spriteCache.get(object.spriteId);
    if (!sprite) return;

    const screenPos = this.worldToScreen(object.position);
    const ctx = this.canvas.context;

    ctx.save();

    // Apply transformations
    ctx.globalAlpha = object.opacity;
    ctx.translate(screenPos.x, screenPos.y);
    ctx.scale(object.scale * this.camera.scale, object.scale * this.camera.scale);
    ctx.rotate(object.rotation);

    // Apply enhanced shadow with blur
    if (object.shadowOffset) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.filter = 'blur(2px)';
      ctx.fillStyle = '#000000';
      const shadowScale = 1.2;
      ctx.scale(shadowScale, shadowScale * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, sprite.height / 3, sprite.width / 2, sprite.height / 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Apply tint if specified with enhanced blending
    if (object.tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = object.tint;
      ctx.fillRect(
        -sprite.width / 2,
        -sprite.height / 2,
        sprite.width,
        sprite.height,
      );
      ctx.globalCompositeOperation = 'source-over';
    }

    // Draw sprite with enhanced lighting
    ctx.drawImage(
      sprite,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height,
    );

    // Add subtle highlight for depth
    if (object.position.z > 0) {
      ctx.save();
      ctx.globalAlpha = 0.1 * (object.position.z / 10);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(
        -sprite.width / 2,
        -sprite.height / 2,
        sprite.width,
        sprite.height / 4,
      );
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Render all queued objects with enhanced background
   */
  render(): void {
    const ctx = this.canvas.context;

    // Enhanced gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#E6F3FF'); // Light blue at top
    gradient.addColorStop(0.3, '#F0E6D2'); // Soft cream middle
    gradient.addColorStop(1, '#E8D5C4'); // Warm beige bottom
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Add subtle atmospheric overlay
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // Draw grid (optional debug)
    if (false) {
      this.drawGrid();
    }

    // Sort and render
    this.sortRenderQueue();
    this.renderQueue.forEach((obj) => this.renderObject(obj));

    this.clearQueue();
  }

  /**
   * Draw debug grid
   */
  private drawGrid(): void {
    const ctx = this.canvas.context;
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;

    const gridSize = this.tileSize * this.camera.scale;

    for (let x = 0; x < this.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
  }

  /**
   * Get tile at world position
   */
  getTileAt(worldPos: Vector2D): Vector2D {
    return {
      x: Math.floor(worldPos.x / this.tileSize),
      y: Math.floor(worldPos.y / this.tileSize),
    };
  }

  /**
   * Get world position from tile coords
   */
  getTileWorldPos(tile: Vector2D): Vector2D {
    return {
      x: tile.x * this.tileSize,
      y: tile.y * this.tileSize,
    };
  }

  /**
   * Raycast from screen position to find objects
   */
  raycast(screenPos: Vector2D, radius: number = 50): RenderObject[] {
    const worldPos = this.screenToWorld(screenPos);
    const results: RenderObject[] = [];

    this.renderQueue.forEach((obj) => {
      const dist = Math.hypot(obj.position.x - worldPos.x, obj.position.y - worldPos.y);
      if (dist < radius) {
        results.push(obj);
      }
    });

    return results.sort((a, b) => {
      const distA = Math.hypot(a.position.x - worldPos.x, a.position.y - worldPos.y);
      const distB = Math.hypot(b.position.x - worldPos.x, b.position.y - worldPos.y);
      return distA - distB;
    });
  }
}
