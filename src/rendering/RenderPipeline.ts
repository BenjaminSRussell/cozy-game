/**
 * Core Rendering Pipeline for Cozy Haven
 * 
 * Provides efficient, layered rendering with:
 * - Texture management and caching
 * - Sprite batching for performance
 * - Viewport culling
 * - Layer-based rendering
 * - Performance monitoring
 */

import { GameWorld } from '../types/game';

export interface Vector2D {
  x: number;
  y: number;
}

export interface RenderLayer {
  id: string;
  zIndex: number;
  visible: boolean;
  parallaxFactor: Vector2D;
}

export interface RenderObject {
  id: string;
  layerId: string;
  position: Vector2D;
  size: Vector2D;
  rotation?: number;
  scale?: Vector2D;
  textureId: string;
  tint?: string;
  opacity?: number;
  visible?: boolean;
}

export interface Camera {
  position: Vector2D;
  zoom: number;
  viewport: Vector2D;
  bounds?: {
    min: Vector2D;
    max: Vector2D;
  };
}

export interface RenderStats {
  frameTime: number;
  drawCalls: number;
  objectsRendered: number;
  texturesLoaded: number;
  memoryUsage: number;
}

export class RenderPipeline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layers: Map<string, RenderLayer> = new Map();
  private renderObjects: Map<string, RenderObject> = new Map();
  private camera: Camera;
  private stats: RenderStats;
  private lastFrameTime: number = 0;
  private textureCache: Map<string, HTMLImageElement> = new Map();
  private isDirty: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to get 2D rendering context');
    this.ctx = ctx;

    this.camera = {
      position: { x: 0, y: 0 },
      zoom: 1,
      viewport: { x: canvas.width, y: canvas.height }
    };

    this.stats = {
      frameTime: 0,
      drawCalls: 0,
      objectsRendered: 0,
      texturesLoaded: 0,
      memoryUsage: 0
    };

    this.initializeDefaultLayers();
  }

  private initializeDefaultLayers(): void {
    // Background layer (sky, distant objects)
    this.addLayer({
      id: 'background',
      zIndex: 0,
      visible: true,
      parallaxFactor: { x: 0.5, y: 0.5 }
    });

    // Terrain layer (ground, tiles)
    this.addLayer({
      id: 'terrain',
      zIndex: 100,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 }
    });

    // Buildings layer
    this.addLayer({
      id: 'buildings',
      zIndex: 200,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 }
    });

    // Objects layer (crops, decorations)
    this.addLayer({
      id: 'objects',
      zIndex: 300,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 }
    });

    // Effects layer (particles, highlights)
    this.addLayer({
      id: 'effects',
      zIndex: 400,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 }
    });

    // UI layer (HUD, menus)
    this.addLayer({
      id: 'ui',
      zIndex: 1000,
      visible: true,
      parallaxFactor: { x: 0, y: 0 }
    });
  }

  public addLayer(layer: RenderLayer): void {
    this.layers.set(layer.id, layer);
    this.isDirty = true;
  }

  public removeLayer(layerId: string): void {
    this.layers.delete(layerId);
    this.isDirty = true;
  }

  public addRenderObject(object: RenderObject): void {
    this.renderObjects.set(object.id, object);
    this.isDirty = true;
  }

  public removeRenderObject(objectId: string): void {
    this.renderObjects.delete(objectId);
    this.isDirty = true;
  }

  public updateRenderObject(objectId: string, updates: Partial<RenderObject>): void {
    const object = this.renderObjects.get(objectId);
    if (object) {
      Object.assign(object, updates);
      this.isDirty = true;
    }
  }

  public setCamera(camera: Partial<Camera>): void {
    Object.assign(this.camera, camera);
    this.isDirty = true;
  }

  public getCamera(): Camera {
    return { ...this.camera };
  }

  public worldToScreen(worldPos: Vector2D): Vector2D {
    const layer = this.layers.get('terrain'); // Use terrain layer as reference
    const parallax = layer?.parallaxFactor || { x: 1, y: 1 };

    return {
      x: (worldPos.x - this.camera.position.x * parallax.x) * this.camera.zoom + this.canvas.width / 2,
      y: (worldPos.y - this.camera.position.y * parallax.y) * this.camera.zoom + this.canvas.height / 2
    };
  }

  public screenToWorld(screenPos: Vector2D): Vector2D {
    const layer = this.layers.get('terrain');
    const parallax = layer?.parallaxFactor || { x: 1, y: 1 };

    return {
      x: (screenPos.x - this.canvas.width / 2) / this.camera.zoom + this.camera.position.x * parallax.x,
      y: (screenPos.y - this.canvas.height / 2) / this.camera.zoom + this.camera.position.y * parallax.y
    };
  }

  public isInViewport(object: RenderObject): boolean {
    const screenPos = this.worldToScreen(object.position);
    const halfWidth = (object.size.x * (object.scale?.x || 1)) / 2;
    const halfHeight = (object.size.y * (object.scale?.y || 1)) / 2;

    return (
      screenPos.x + halfWidth >= 0 &&
      screenPos.x - halfWidth <= this.canvas.width &&
      screenPos.y + halfHeight >= 0 &&
      screenPos.y - halfHeight <= this.canvas.height
    );
  }

  public async loadTexture(textureId: string, url: string): Promise<void> {
    if (this.textureCache.has(textureId)) return;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.textureCache.set(textureId, img);
        this.stats.texturesLoaded++;
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  public render(world: GameWorld): void {
    const startTime = performance.now();
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Reset stats
    this.stats.drawCalls = 0;
    this.stats.objectsRendered = 0;

    // Get sorted layers
    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Render each layer
    for (const layer of sortedLayers) {
      this.renderLayer(layer, world);
    }

    // Update performance stats
    this.stats.frameTime = performance.now() - startTime;
    this.lastFrameTime = startTime;
    this.isDirty = false;
  }

  private renderLayer(layer: RenderLayer, world: GameWorld): void {
    this.ctx.save();

    // Apply parallax
    const parallaxOffset = {
      x: this.camera.position.x * (1 - layer.parallaxFactor.x),
      y: this.camera.position.y * (1 - layer.parallaxFactor.y)
    };

    // Get objects in this layer
    const layerObjects = Array.from(this.renderObjects.values())
      .filter(obj => obj.layerId === layer.id && (obj.visible !== false))
      .filter(obj => this.isInViewport(obj));

    // Batch render objects by texture
    const textureBatches = new Map<string, RenderObject[]>();
    
    for (const object of layerObjects) {
      const textureId = object.textureId;
      if (!textureBatches.has(textureId)) {
        textureBatches.set(textureId, []);
      }
      textureBatches.get(textureId)!.push(object);
    }

    // Render each batch
    for (const [textureId, objects] of textureBatches) {
      this.renderTextureBatch(textureId, objects, parallaxOffset);
    }

    this.ctx.restore();
  }

  private renderTextureBatch(textureId: string, objects: RenderObject[], parallaxOffset: Vector2D): void {
    const texture = this.textureCache.get(textureId);
    if (!texture) return;

    this.ctx.save();
    
    for (const object of objects) {
      const screenPos = this.worldToScreen({
        x: object.position.x - parallaxOffset.x,
        y: object.position.y - parallaxOffset.y
      });

      const scale = object.scale || { x: 1, y: 1 };
      const width = object.size.x * scale.x * this.camera.zoom;
      const height = object.size.y * scale.y * this.camera.zoom;

      // Apply transformations
      this.ctx.translate(screenPos.x, screenPos.y);
      if (object.rotation) {
        this.ctx.rotate(object.rotation);
      }
      
      // Apply tint and opacity
      if (object.tint) {
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.fillStyle = object.tint;
        this.ctx.fillRect(-width/2, -height/2, width, height);
        this.ctx.globalCompositeOperation = 'source-over';
      }
      
      if (object.opacity !== undefined) {
        this.ctx.globalAlpha = object.opacity;
      }

      // Draw texture
      this.ctx.drawImage(
        texture,
        -width / 2,
        -height / 2,
        width,
        height
      );

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.globalAlpha = 1;
      
      this.stats.objectsRendered++;
    }

    this.ctx.restore();
    this.stats.drawCalls++;
  }

  public getStats(): RenderStats {
    return { ...this.stats };
  }

  public clearCache(): void {
    this.textureCache.clear();
    this.stats.texturesLoaded = 0;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.viewport = { x: width, y: height };
    this.isDirty = true;
  }

  public dispose(): void {
    this.clearCache();
    this.layers.clear();
    this.renderObjects.clear();
  }
}
