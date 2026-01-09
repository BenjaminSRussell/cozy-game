/**
 * Integrated Game Renderer
 * 
 * Combines all rendering systems into a unified, easy-to-use interface
 * for the Cozy Haven game.
 */

import { RenderPipeline, RenderObject, Vector2D } from './RenderPipeline';
import { TextureManager, TextureConfig } from './TextureManager';
import { SpriteRenderer, Sprite, Particle } from './SpriteRenderer';
import { CameraSystem } from './CameraSystem';
import { LayerSystem, LayerConfig } from './LayerSystem';
import { PerformanceMonitor } from './PerformanceMonitor';
import { GameWorld, CropStage } from '../types/game';

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  enablePerformanceMonitoring: boolean;
  enableBatching: boolean;
  enableCulling: boolean;
  maxTextures: number;
  textureQuality: 'low' | 'medium' | 'high';
}

export interface GameAsset {
  id: string;
  type: 'texture' | 'sprite' | 'animation';
  path: string;
  config?: any;
}

export class GameRenderer {
  private pipeline: RenderPipeline;
  private textureManager: TextureManager;
  private spriteRenderer: SpriteRenderer;
  private cameraSystem: CameraSystem;
  private layerSystem: LayerSystem;
  private performanceMonitor: PerformanceMonitor;
  private config: RendererConfig;
  private isInitialized: boolean = false;
  private assetRegistry: Map<string, GameAsset> = new Map();

  constructor(config: RendererConfig) {
    this.config = config;
    
    // Initialize core systems
    this.pipeline = new RenderPipeline(config.canvas);
    this.textureManager = TextureManager.getInstance();
    this.cameraSystem = new CameraSystem(config.width, config.height);
    this.layerSystem = new LayerSystem(this.pipeline, this.cameraSystem);
    this.spriteRenderer = new SpriteRenderer(this.pipeline);
    this.performanceMonitor = PerformanceMonitor.getInstance();

    // Configure systems
    this.configureSystems();
  }

  private configureSystems(): void {
    // Set texture quality
    switch (this.config.textureQuality) {
      case 'low':
        this.textureManager.setDefaultSize(64, 64);
        break;
      case 'medium':
        this.textureManager.setDefaultSize(128, 128);
        break;
      case 'high':
        this.textureManager.setDefaultSize(256, 256);
        break;
    }

    // Configure performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor.startMonitoring();
    }

    // Set camera bounds (example for a 2D game)
    this.cameraSystem.setBounds({
      min: { x: -1000, y: -1000 },
      max: { x: 1000, y: 1000 },
      enabled: true
    });
  }

  /**
   * Initialize the renderer with game assets
   */
  public async initialize(assets: GameAsset[]): Promise<void> {
    if (this.isInitialized) {
      console.warn('Renderer already initialized');
      return;
    }

    try {
      // Register assets
      for (const asset of assets) {
        this.assetRegistry.set(asset.id, asset);
      }

      // Preload textures
      const textureAssets = assets.filter(asset => asset.type === 'texture');
      const textureConfigs: TextureConfig[] = textureAssets.map(asset => ({
        id: asset.id,
        path: asset.path,
        width: asset.config?.width,
        height: asset.config?.height,
        scale: asset.config?.scale
      }));

      await this.textureManager.preloadTextures(textureConfigs);

      // Initialize game-specific layers and objects
      await this.initializeGameContent();

      this.isInitialized = true;
      console.log('Game renderer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
      throw error;
    }
  }

  private async initializeGameContent(): Promise<void> {
    // Create background sprites
    this.createBackgroundElements();

    // Setup initial camera position
    this.cameraSystem.setPosition({ x: 0, y: 0 });
    this.cameraSystem.setZoom(1.0);
  }

  private createBackgroundElements(): void {
    // Create sky gradient background
    const skySprite = this.spriteRenderer.createSprite(
      'sky_background',
      'background',
      { x: 0, y: 0 },
      { x: 2000, y: 1000 },
      {
        textureId: 'sky_gradient',
        opacity: 1.0
      }
    );

    // Create clouds
    for (let i = 0; i < 5; i++) {
      this.spriteRenderer.createSprite(
        `cloud_${i}`,
        'far_background',
        { 
          x: Math.random() * 1000 - 500, 
          y: Math.random() * 200 - 100 
        },
        { x: 150, y: 80 },
        {
          textureId: 'cloud',
          opacity: 0.8
        }
      );
    }
  }

  /**
   * Render the game world
   */
  public render(world: GameWorld): void {
    if (!this.isInitialized) {
      console.warn('Renderer not initialized');
      return;
    }

    const startTime = performance.now();

    // Update systems
    this.updateSystems(world);

    // Update camera to follow player or center on world
    this.updateCamera(world);

    // Clear and setup canvas
    this.pipeline.render(world);

    // Render layers
    const ctx = this.pipeline['ctx']; // Access private context
    this.layerSystem.render(ctx);

    // Update performance metrics
    const frameTime = performance.now() - startTime;
    this.updatePerformanceMetrics(frameTime);
  }

  private updateSystems(world: GameWorld): void {
    const deltaTime = 16.67; // ~60 FPS

    // Update camera
    this.cameraSystem.update(deltaTime);

    // Update layer system
    this.layerSystem.update(deltaTime);

    // Update sprite animations
    this.spriteRenderer.updateAnimations(deltaTime);

    // Update particles
    this.spriteRenderer.updateParticles(deltaTime);

    // Update render objects based on game state
    this.updateGameObjects(world);
  }

  private updateCamera(world: GameWorld): void {
    // Center camera on player position or world center
    // This would be customized based on your game's camera behavior
    const targetPosition = { x: 0, y: 0 }; // Center of world
    this.cameraSystem.moveTo(targetPosition);
  }

  private updateGameObjects(world: GameWorld): void {
    // Update farm plots
    world.farmPlots.forEach((plot, index) => {
      const plotId = `plot_${plot.id}`;
      let sprite = this.spriteRenderer.getSprite(plotId);

      if (!sprite) {
        // Create new plot sprite
        sprite = this.spriteRenderer.createSprite(
          plotId,
          'terrain',
          { 
            x: 20 + (index % 4) * 75, 
            y: 60 + Math.floor(index / 4) * 75 
          },
          { x: 60, y: 60 },
          {
            textureId: plot.tilled ? 'dirt' : 'grass',
            opacity: 1.0
          }
        );
      }

      // Update plot based on crop state
      if (plot.crop) {
        const cropTextureId = this.getCropTextureId(plot.crop.type, CropStage[plot.crop.stage]);
        this.spriteRenderer.updateSprite(plotId, {
          textureId: cropTextureId
        });
      }
    });

    // Update buildings
    world.buildings.forEach((building) => {
      const buildingId = `building_${building.id}`;
      let sprite = this.spriteRenderer.getSprite(buildingId);

      if (!sprite) {
        sprite = this.spriteRenderer.createSprite(
          buildingId,
          'buildings',
          { 
            x: 320 + building.position.x * 2, 
            y: 100 + building.position.y * 1.5 
          },
          { x: 40, y: 40 },
          {
            textureId: building.spriteId || building.type,
            opacity: 1.0
          }
        );
      }
    });

    // Update ore deposits
    world.oreDeposits.forEach((deposit) => {
      const oreId = `ore_${deposit.id}`;
      let sprite = this.spriteRenderer.getSprite(oreId);

      if (!sprite) {
        sprite = this.spriteRenderer.createSprite(
          oreId,
          'objects',
          { 
            x: 80 + deposit.position.x * 1.8, 
            y: 150 + deposit.position.y * 1.2 
          },
          { x: 35, y: 35 },
          {
            textureId: deposit.oreType,
            opacity: 1.0
          }
        );
      }
    });
  }

  private getCropTextureId(cropType: string, stage: string): string {
    // Map crop types and stages to texture IDs
    const stageMap: Record<string, string> = {
      'SEED': 'seed',
      'SPROUTING': 'sprout',
      'GROWING': cropType,
      'MATURE': cropType,
      'HARVESTABLE': `${cropType}_ready`,
      'DEAD': 'dead_crop'
    };

    return stageMap[stage] || 'seed';
  }

  private updatePerformanceMetrics(frameTime: number): void {
    if (!this.config.enablePerformanceMonitoring) return;

    const stats = this.pipeline.getStats();
    const spriteStats = this.spriteRenderer.getStats();

    this.performanceMonitor.updateMetrics({
      frameTime,
      fps: 1000 / frameTime,
      drawCalls: stats.drawCalls,
      objectsRendered: stats.objectsRendered,
      texturesLoaded: stats.texturesLoaded,
      memoryUsage: spriteStats.memoryUsage
    });
  }

  /**
   * Handle window resize
   */
  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    
    this.pipeline.resize(width, height);
    this.cameraSystem.resize(width, height);
  }

  /**
   * Create particle effect
   */
  public createParticleEffect(
    position: Vector2D,
    type: 'harvest' | 'plant' | 'water' | 'build',
    count: number = 10
  ): string[] {
    const particleConfig = this.getParticleConfig(type);
    return this.spriteRenderer.createParticleBurst(position, count, particleConfig);
  }

  private getParticleConfig(type: string): Partial<Particle> {
    switch (type) {
      case 'harvest':
        return {
          textureId: 'harvest_particle',
          color: '#FFD700',
          life: 1000,
          maxLife: 1000,
          size: 5
        };
      case 'plant':
        return {
          textureId: 'plant_particle',
          color: '#90EE90',
          life: 800,
          maxLife: 800,
          size: 4
        };
      case 'water':
        return {
          textureId: 'water_particle',
          color: '#4A90E2',
          life: 600,
          maxLife: 600,
          size: 3
        };
      case 'build':
        return {
          textureId: 'build_particle',
          color: '#D4A574',
          life: 1200,
          maxLife: 1200,
          size: 6
        };
      default:
        return {
          textureId: 'default_particle',
          color: '#FFFFFF',
          life: 1000,
          maxLife: 1000,
          size: 5
        };
    }
  }

  /**
   * Camera controls
   */
  public getCamera(): CameraSystem {
    return this.cameraSystem;
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats() {
    if (!this.config.enablePerformanceMonitoring) {
      return null;
    }

    return {
      monitor: this.performanceMonitor.getPerformanceReport(),
      pipeline: this.pipeline.getStats(),
      sprites: this.spriteRenderer.getStats(),
      layers: this.layerSystem.getSystemStats()
    };
  }

  /**
   * Get texture manager
   */
  public getTextureManager(): TextureManager {
    return this.textureManager;
  }

  /**
   * Get layer system
   */
  public getLayerSystem(): LayerSystem {
    return this.layerSystem;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.spriteRenderer.dispose();
    this.layerSystem.dispose();
    this.pipeline.dispose();
    this.textureManager.clearCache();
    
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor.stopMonitoring();
    }

    this.assetRegistry.clear();
    this.isInitialized = false;
  }

  /**
   * Check if renderer is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}
