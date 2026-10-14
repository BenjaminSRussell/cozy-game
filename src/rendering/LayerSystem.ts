/**
 * Layer-Based Rendering System
 * 
 * Manages rendering layers with different properties, effects, and optimizations.
 * Supports parallax scrolling, layer-specific effects, and dynamic layer management.
 */

import { RenderPipeline, RenderObject, Vector2D } from './RenderPipeline';
import { CameraSystem } from './CameraSystem';

export interface LayerEffect {
  id: string;
  type: 'blur' | 'color' | 'transform' | 'custom';
  enabled: boolean;
  parameters: Record<string, any>;
  apply?: (ctx: CanvasRenderingContext2D, params: Record<string, any>) => void;
}

export interface LayerConfig {
  id: string;
  name: string;
  zIndex: number;
  visible: boolean;
  parallaxFactor: Vector2D;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  effects: LayerEffect[];
  cullingEnabled: boolean;
  batchingEnabled: boolean;
  renderOrder: 'front-to-back' | 'back-to-front';
  updateCallback?: (layer: Layer, deltaTime: number) => void;
}

export interface LayerStats {
  objectCount: number;
  visibleObjectCount: number;
  culledObjectCount: number;
  renderTime: number;
  effectCount: number;
  memoryUsage: number;
}

export class Layer {
  public config: LayerConfig;
  public objects: Map<string, RenderObject> = new Map();
  public dirty: boolean = true;
  public lastRenderTime: number = 0;
  public stats: LayerStats;

  constructor(config: LayerConfig) {
    this.config = config;
    this.stats = {
      objectCount: 0,
      visibleObjectCount: 0,
      culledObjectCount: 0,
      renderTime: 0,
      effectCount: config.effects.length,
      memoryUsage: 0
    };
  }

  public addObject(object: RenderObject): void {
    this.objects.set(object.id, object);
    this.dirty = true;
    this.stats.objectCount = this.objects.size;
  }

  public removeObject(objectId: string): boolean {
    const removed = this.objects.delete(objectId);
    if (removed) {
      this.dirty = true;
      this.stats.objectCount = this.objects.size;
    }
    return removed;
  }

  public getObject(objectId: string): RenderObject | undefined {
    return this.objects.get(objectId);
  }

  public updateObject(objectId: string, updates: Partial<RenderObject>): void {
    const object = this.objects.get(objectId);
    if (object) {
      Object.assign(object, updates);
      this.dirty = true;
    }
  }

  public clearObjects(): void {
    this.objects.clear();
    this.dirty = true;
    this.stats.objectCount = 0;
  }

  public getVisibleObjects(camera: CameraSystem): RenderObject[] {
    if (!this.config.cullingEnabled) {
      return Array.from(this.objects.values()).filter(obj => obj.visible !== false);
    }

    const visibleObjects: RenderObject[] = [];
    
    for (const object of this.objects.values()) {
      if (object.visible === false) continue;
      
      if (camera.isVisible(object)) {
        visibleObjects.push(object);
      }
    }

    return visibleObjects;
  }

  public addEffect(effect: LayerEffect): void {
    this.config.effects.push(effect);
    this.stats.effectCount = this.config.effects.length;
    this.dirty = true;
  }

  public removeEffect(effectId: string): boolean {
    const index = this.config.effects.findIndex(e => e.id === effectId);
    if (index !== -1) {
      this.config.effects.splice(index, 1);
      this.stats.effectCount = this.config.effects.length;
      this.dirty = true;
      return true;
    }
    return false;
  }

  public getEffect(effectId: string): LayerEffect | undefined {
    return this.config.effects.find(e => e.id === effectId);
  }

  public update(deltaTime: number): void {
    if (this.config.updateCallback) {
      this.config.updateCallback(this, deltaTime);
    }
  }
}

export class LayerSystem {
  private static readonly MAX_LAYERS = 10;

  private layers: Map<string, Layer> = new Map();
  private pipeline: RenderPipeline;
  private camera: CameraSystem;
  private renderOrder: string[] = [];

  constructor(pipeline: RenderPipeline, camera: CameraSystem) {
    this.pipeline = pipeline;
    this.camera = camera;
    this.initializeDefaultLayers();
  }

  private initializeDefaultLayers(): void {
    // Background layer (sky, clouds, distant mountains)
    this.createLayer({
      id: 'background',
      name: 'Background',
      zIndex: 0,
      visible: true,
      parallaxFactor: { x: 0.2, y: 0.2 },
      opacity: 1.0,
      blendMode: 'source-over',
      effects: [],
      cullingEnabled: false,
      batchingEnabled: true,
      renderOrder: 'back-to-front'
    });

    // Far background layer (hills, trees)
    this.createLayer({
      id: 'far_background',
      name: 'Far Background',
      zIndex: 50,
      visible: true,
      parallaxFactor: { x: 0.5, y: 0.5 },
      opacity: 1.0,
      blendMode: 'source-over',
      effects: [],
      cullingEnabled: false,
      batchingEnabled: true,
      renderOrder: 'back-to-front'
    });

    // Terrain layer (ground, tiles, paths)
    this.createLayer({
      id: 'terrain',
      name: 'Terrain',
      zIndex: 100,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 },
      opacity: 1.0,
      blendMode: 'source-over',
      effects: [],
      cullingEnabled: true,
      batchingEnabled: true,
      renderOrder: 'back-to-front'
    });

    // Buildings layer
    this.createLayer({
      id: 'buildings',
      name: 'Buildings',
      zIndex: 200,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 },
      opacity: 1.0,
      blendMode: 'source-over',
      effects: [],
      cullingEnabled: true,
      batchingEnabled: true,
      renderOrder: 'back-to-front'
    });

    // Objects layer (crops, decorations, furniture)
    this.createLayer({
      id: 'objects',
      name: 'Objects',
      zIndex: 300,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 },
      opacity: 1.0,
      blendMode: 'source-over',
      effects: [],
      cullingEnabled: true,
      batchingEnabled: true,
      renderOrder: 'back-to-front'
    });

    // Characters layer (player, NPCs, animals)
    this.createLayer({
      id: 'characters',
      name: 'Characters',
      zIndex: 400,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 },
      opacity: 1.0,
      blendMode: 'source-over',
      effects: [],
      cullingEnabled: true,
      batchingEnabled: true,
      renderOrder: 'back-to-front'
    });

    // Effects layer (particles, highlights, special effects)
    this.createLayer({
      id: 'effects',
      name: 'Effects',
      zIndex: 500,
      visible: true,
      parallaxFactor: { x: 1.0, y: 1.0 },
      opacity: 1.0,
      blendMode: 'screen',
      effects: [],
      cullingEnabled: true,
      batchingEnabled: false,
      renderOrder: 'back-to-front'
    });

    // UI layer (HUD, menus, overlays)
    this.createLayer({
      id: 'ui',
      name: 'UI',
      zIndex: 1000,
      visible: true,
      parallaxFactor: { x: 0, y: 0 },
      opacity: 1.0,
      blendMode: 'source-over',
      effects: [],
      cullingEnabled: false,
      batchingEnabled: true,
      renderOrder: 'back-to-front'
    });
  }

  public createLayer(config: LayerConfig): Layer {
    const existing = this.layers.get(config.id);
    if (existing) {
      existing.config = config;
      existing.stats.effectCount = config.effects.length;
      existing.dirty = true;
      this.updateRenderOrder();
      return existing;
    }

    if (this.layers.size >= LayerSystem.MAX_LAYERS) {
      throw new Error(
        `Layer index ${this.layers.size} exceeds max (${LayerSystem.MAX_LAYERS})`
      );
    }

    const layer = new Layer(config);
    this.layers.set(config.id, layer);
    this.updateRenderOrder();
    return layer;
  }

  public removeLayer(layerId: string): boolean {
    const removed = this.layers.delete(layerId);
    if (removed) {
      this.updateRenderOrder();
    }
    return removed;
  }

  public getLayer(layerId: string): Layer | undefined {
    return this.layers.get(layerId);
  }

  public getAllLayers(): Layer[] {
    return Array.from(this.layers.values());
  }

  public getVisibleLayers(): Layer[] {
    return this.renderOrder
      .map(id => this.layers.get(id))
      .filter((layer): layer is Layer => layer !== undefined && layer.config.visible);
  }

  public updateRenderOrder(): void {
    this.renderOrder = Array.from(this.layers.values())
      .sort((a, b) => a.config.zIndex - b.config.zIndex)
      .map(layer => layer.config.id);
  }

  public addObjectToLayer(object: RenderObject, layerId: string): boolean {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.addObject(object);
      return true;
    }
    return false;
  }

  public removeObjectFromLayer(objectId: string, layerId?: string): boolean {
    if (layerId) {
      const layer = this.layers.get(layerId);
      return layer ? layer.removeObject(objectId) : false;
    } else {
      // Search all layers
      for (const layer of this.layers.values()) {
        if (layer.removeObject(objectId)) {
          return true;
        }
      }
      return false;
    }
  }

  public moveObjectToLayer(objectId: string, fromLayerId: string, toLayerId: string): boolean {
    const fromLayer = this.layers.get(fromLayerId);
    const toLayer = this.layers.get(toLayerId);
    
    if (!fromLayer || !toLayer) return false;
    
    const object = fromLayer.getObject(objectId);
    if (!object) return false;
    
    fromLayer.removeObject(objectId);
    toLayer.addObject(object);
    return true;
  }

  public setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.config.visible = visible;
      layer.dirty = true;
    }
  }

  public setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.config.opacity = Math.max(0, Math.min(1, opacity));
      layer.dirty = true;
    }
  }

  public setLayerParallax(layerId: string, factor: Vector2D): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.config.parallaxFactor = factor;
      layer.dirty = true;
    }
  }

  public addLayerEffect(layerId: string, effect: LayerEffect): boolean {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.addEffect(effect);
      return true;
    }
    return false;
  }

  public removeLayerEffect(layerId: string, effectId: string): boolean {
    const layer = this.layers.get(layerId);
    return layer ? layer.removeEffect(effectId) : false;
  }

  public update(deltaTime: number): void {
    for (const layer of this.layers.values()) {
      layer.update(deltaTime);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const visibleLayers = this.getVisibleLayers();

    for (const layer of visibleLayers) {
      this.renderLayer(ctx, layer);
    }
  }

  private renderLayer(ctx: CanvasRenderingContext2D, layer: Layer): void {
    const startTime = performance.now();
    
    ctx.save();

    // Apply layer-level transformations
    this.applyLayerEffects(ctx, layer);

    // Get visible objects for this layer
    const visibleObjects = layer.getVisibleObjects(this.camera);
    
    // Update stats
    layer.stats.visibleObjectCount = visibleObjects.length;
    layer.stats.culledObjectCount = layer.stats.objectCount - visibleObjects.length;

    // Apply parallax
    const parallaxOffset = {
      x: this.camera.position.x * (1 - layer.config.parallaxFactor.x),
      y: this.camera.position.y * (1 - layer.config.parallaxFactor.y)
    };

    // Batch render objects if enabled
    if (layer.config.batchingEnabled) {
      this.renderBatched(ctx, visibleObjects, layer, parallaxOffset);
    } else {
      this.renderIndividual(ctx, visibleObjects, layer, parallaxOffset);
    }

    ctx.restore();

    // Update render time
    layer.lastRenderTime = performance.now() - startTime;
    layer.stats.renderTime = layer.lastRenderTime;
  }

  private applyLayerEffects(ctx: CanvasRenderingContext2D, layer: Layer): void {
    // Apply opacity
    ctx.globalAlpha = layer.config.opacity;
    
    // Apply blend mode
    ctx.globalCompositeOperation = layer.config.blendMode;

    // Apply custom effects
    for (const effect of layer.config.effects) {
      if (effect.enabled) {
        if (effect.apply) {
          effect.apply(ctx, effect.parameters);
        } else {
          this.applyBuiltinEffect(ctx, effect);
        }
      }
    }
  }

  private applyBuiltinEffect(ctx: CanvasRenderingContext2D, effect: LayerEffect): void {
    switch (effect.type) {
      case 'blur':
        ctx.filter = `blur(${effect.parameters.radius || 0}px)`;
        break;
      case 'color':
        if (effect.parameters.tint) {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = effect.parameters.tint;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.globalCompositeOperation = 'source-over';
        }
        break;
      case 'transform':
        if (effect.parameters.scale) {
          ctx.scale(effect.parameters.scale.x, effect.parameters.scale.y);
        }
        if (effect.parameters.rotation) {
          ctx.rotate(effect.parameters.rotation);
        }
        break;
    }
  }

  private renderBatched(
    ctx: CanvasRenderingContext2D,
    objects: RenderObject[],
    layer: Layer,
    parallaxOffset: Vector2D
  ): void {
    // Group objects by texture for batching
    const textureBatches = new Map<string, RenderObject[]>();
    
    for (const object of objects) {
      const textureId = object.textureId;
      if (!textureBatches.has(textureId)) {
        textureBatches.set(textureId, []);
      }
      textureBatches.get(textureId)!.push(object);
    }

    // Render each batch
    for (const [textureId, batchedObjects] of textureBatches) {
      this.renderTextureBatch(ctx, textureId, batchedObjects, parallaxOffset);
    }
  }

  private renderIndividual(
    ctx: CanvasRenderingContext2D,
    objects: RenderObject[],
    layer: Layer,
    parallaxOffset: Vector2D
  ): void {
    for (const object of objects) {
      this.renderObject(ctx, object, parallaxOffset);
    }
  }

  private renderTextureBatch(
    ctx: CanvasRenderingContext2D,
    textureId: string,
    objects: RenderObject[],
    parallaxOffset: Vector2D
  ): void {
    // This would be implemented with actual texture rendering
    // For now, it's a placeholder for the batching system
    for (const object of objects) {
      this.renderObject(ctx, object, parallaxOffset);
    }
  }

  private renderObject(
    ctx: CanvasRenderingContext2D,
    object: RenderObject,
    parallaxOffset: Vector2D
  ): void {
    const adjustedPosition = {
      x: object.position.x - parallaxOffset.x,
      y: object.position.y - parallaxOffset.y
    };

    const screenPos = this.camera.worldToScreen(adjustedPosition);
    const scale = object.scale || { x: 1, y: 1 };
    const width = object.size.x * scale.x * this.camera.zoom;
    const height = object.size.y * scale.y * this.camera.zoom;

    ctx.save();
    
    // Apply object transformations
    ctx.translate(screenPos.x, screenPos.y);
    if (object.rotation) {
      ctx.rotate(object.rotation);
    }
    
    // Apply object-specific effects
    if (object.tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = object.tint;
      ctx.fillRect(-width/2, -height/2, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    if (object.opacity !== undefined) {
      ctx.globalAlpha = object.opacity;
    }

    // Render placeholder (would be actual texture in real implementation)
    ctx.fillStyle = object.tint || '#FF0000';
    ctx.fillRect(-width/2, -height/2, width, height);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(-width/2, -height/2, width, height);

    ctx.restore();
  }

  public getLayerStats(): Record<string, LayerStats> {
    const stats: Record<string, LayerStats> = {};
    
    for (const [id, layer] of this.layers) {
      stats[id] = { ...layer.stats };
    }
    
    return stats;
  }

  public getSystemStats(): {
    totalLayers: number;
    visibleLayers: number;
    totalObjects: number;
    totalRenderTime: number;
    memoryUsage: number;
  } {
    const layers = Array.from(this.layers.values());
    const visibleLayers = layers.filter(l => l.config.visible);
    
    return {
      totalLayers: layers.length,
      visibleLayers: visibleLayers.length,
      totalObjects: layers.reduce((sum, layer) => sum + layer.stats.objectCount, 0),
      totalRenderTime: layers.reduce((sum, layer) => sum + layer.lastRenderTime, 0),
      memoryUsage: layers.reduce((sum, layer) => sum + layer.stats.memoryUsage, 0)
    };
  }

  public clearAllLayers(): void {
    for (const layer of this.layers.values()) {
      layer.clearObjects();
    }
  }

  public dispose(): void {
    this.clearAllLayers();
    this.layers.clear();
    this.renderOrder = [];
  }
}
