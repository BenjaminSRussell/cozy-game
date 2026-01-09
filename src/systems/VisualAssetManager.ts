/**
 * Visual Asset Manager - Cozy game visual resource management
 * 
 * Handles loading, organizing, and optimizing visual assets based on
 * reverse-engineered patterns from Animal Crossing and Stardew Valley.
 */

// ============================================================================
// VISUAL ASSET SYSTEM TYPES
// ============================================================================

export interface AssetMetadata {
  id: string;
  name: string;
  type: AssetType;
  category: AssetCategory;
  size: { width: number; height: number };
  frames?: number;
  animations?: AnimationData[];
  variants?: string[];
  tags: string[];
  loadPriority: number;
  memoryUsage: number;
  lastAccessed: number;
}

export enum AssetType {
  SPRITE = 'sprite',
  TILESET = 'tileset',
  UI = 'ui',
  BACKGROUND = 'background',
  EFFECT = 'effect',
  ICON = 'icon',
}

export enum AssetCategory {
  CHARACTER = 'character',
  ENVIRONMENT = 'environment',
  ITEM = 'item',
  UI = 'ui',
  EFFECT = 'effect',
  BUILDING = 'building',
  FURNITURE = 'furniture',
}

export interface AnimationData {
  name: string;
  frames: number;
  duration: number; // milliseconds
  loop: boolean;
  frameOrder?: number[];
}

export interface SpriteSheet {
  id: string;
  texture: HTMLImageElement;
  width: number;
  height: number;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  sprites: AssetMetadata[];
}

export interface Tileset {
  id: string;
  texture: HTMLImageElement;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  tiles: AssetMetadata[];
  transitions?: TransitionData[];
}

export interface TransitionData {
  from: string;
  to: string;
  tiles: number[];
}

export interface AssetLoadProgress {
  total: number;
  loaded: number;
  failed: number;
  currentAsset: string;
}

// ============================================================================
// VISUAL ASSET MANAGER CLASS
// ============================================================================

export class VisualAssetManager {
  private assets: Map<string, AssetMetadata> = new Map();
  private spriteSheets: Map<string, SpriteSheet> = new Map();
  private tilesets: Map<string, Tileset> = new Map();
  private loadedTextures: Map<string, HTMLImageElement> = new Map();
  private loadQueue: AssetMetadata[] = [];
  private isLoading = false;
  private loadProgress: AssetLoadProgress = {
    total: 0,
    loaded: 0,
    failed: 0,
    currentAsset: '',
  };

  // Cozy game color palettes
  private readonly COZY_PALETTES = {
    animalCrossing: {
      skyBlue: '#87CEEB',
      leafGreen: '#90EE90',
      woodBrown: '#8B4513',
      soilBrown: '#654321',
      waterBlue: '#4682B4',
      flowerPink: '#FFB6C1',
      sunYellow: '#FFE4B5',
      cloudWhite: '#F0F8FF',
    },
    stardewValley: {
      grassGreen: '#7CB342',
      waterBlue: '#1976D2',
      woodBrown: '#5D4037',
      stoneGray: '#757575',
      goldYellow: '#FFC107',
      dirtBrown: '#8D6E63',
      flowerRed: '#E91E63',
      skyLight: '#BBDEFB',
    },
  };

  constructor() {
    this.initializeAssetRegistry();
  }

  /**
   * Initialize asset registry with cozy game patterns
   */
  private initializeAssetRegistry(): void {
    // Player character assets
    this.registerAsset({
      id: 'player_idle_down',
      name: 'Player Idle Down',
      type: AssetType.SPRITE,
      category: AssetCategory.CHARACTER,
      size: { width: 32, height: 48 },
      frames: 4,
      animations: [
        { name: 'idle', frames: 4, duration: 1000, loop: true }
      ],
      tags: ['player', 'idle', 'down'],
      loadPriority: 1,
      memoryUsage: 6144, // 32x48x4 bytes
      lastAccessed: Date.now(),
    });

    this.registerAsset({
      id: 'player_walk_down',
      name: 'Player Walk Down',
      type: AssetType.SPRITE,
      category: AssetCategory.CHARACTER,
      size: { width: 32, height: 48 },
      frames: 8,
      animations: [
        { name: 'walk', frames: 8, duration: 800, loop: true }
      ],
      tags: ['player', 'walk', 'down'],
      loadPriority: 1,
      memoryUsage: 12288,
      lastAccessed: Date.now(),
    });

    // Tool assets
    this.registerAsset({
      id: 'tool_hoe',
      name: 'Hoe Tool',
      type: AssetType.SPRITE,
      category: AssetCategory.ITEM,
      size: { width: 16, height: 16 },
      frames: 6,
      animations: [
        { name: 'use', frames: 6, duration: 600, loop: false }
      ],
      tags: ['tool', 'hoe', 'farming'],
      loadPriority: 2,
      memoryUsage: 1536,
      lastAccessed: Date.now(),
    });

    this.registerAsset({
      id: 'tool_watering_can',
      name: 'Watering Can',
      type: AssetType.SPRITE,
      category: AssetCategory.ITEM,
      size: { width: 16, height: 16 },
      frames: 8,
      animations: [
        { name: 'use', frames: 8, duration: 800, loop: false }
      ],
      tags: ['tool', 'water', 'farming'],
      loadPriority: 2,
      memoryUsage: 2048,
      lastAccessed: Date.now(),
    });

    // Resource assets
    this.registerAsset({
      id: 'resource_wood',
      name: 'Wood Resource',
      type: AssetType.SPRITE,
      category: AssetCategory.ITEM,
      size: { width: 16, height: 16 },
      tags: ['resource', 'wood', 'material'],
      loadPriority: 3,
      memoryUsage: 1024,
      lastAccessed: Date.now(),
    });

    this.registerAsset({
      id: 'resource_stone',
      name: 'Stone Resource',
      type: AssetType.SPRITE,
      category: AssetCategory.ITEM,
      size: { width: 16, height: 16 },
      tags: ['resource', 'stone', 'material'],
      loadPriority: 3,
      memoryUsage: 1024,
      lastAccessed: Date.now(),
    });

    // Environment tilesets
    this.registerAsset({
      id: 'tileset_grass',
      name: 'Grass Tileset',
      type: AssetType.TILESET,
      category: AssetCategory.ENVIRONMENT,
      size: { width: 128, height: 128 },
      variants: ['grass_1', 'grass_2', 'grass_3', 'grass_4'],
      tags: ['terrain', 'grass', 'ground'],
      loadPriority: 1,
      memoryUsage: 16384,
      lastAccessed: Date.now(),
    });

    this.registerAsset({
      id: 'tileset_dirt',
      name: 'Dirt Tileset',
      type: AssetType.TILESET,
      category: AssetCategory.ENVIRONMENT,
      size: { width: 128, height: 128 },
      variants: ['dirt_1', 'dirt_2', 'dirt_3'],
      tags: ['terrain', 'dirt', 'ground'],
      loadPriority: 1,
      memoryUsage: 16384,
      lastAccessed: Date.now(),
    });

    // UI assets
    this.registerAsset({
      id: 'ui_inventory_slot',
      name: 'Inventory Slot',
      type: AssetType.UI,
      category: AssetCategory.UI,
      size: { width: 32, height: 32 },
      tags: ['ui', 'inventory', 'slot'],
      loadPriority: 1,
      memoryUsage: 4096,
      lastAccessed: Date.now(),
    });

    this.registerAsset({
      id: 'ui_button_primary',
      name: 'Primary Button',
      type: AssetType.UI,
      category: AssetCategory.UI,
      size: { width: 64, height: 24 },
      tags: ['ui', 'button', 'primary'],
      loadPriority: 1,
      memoryUsage: 6144,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Register a new asset
   */
  public registerAsset(metadata: AssetMetadata): void {
    this.assets.set(metadata.id, metadata);
    this.loadQueue.push(metadata);
    this.loadQueue.sort((a, b) => a.loadPriority - b.loadPriority);
  }

  /**
   * Load all assets
   */
  public async loadAllAssets(): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.loadProgress = {
      total: this.loadQueue.length,
      loaded: 0,
      failed: 0,
      currentAsset: '',
    };

    for (const asset of this.loadQueue) {
      this.loadProgress.currentAsset = asset.name;
      
      try {
        await this.loadAsset(asset);
        this.loadProgress.loaded++;
      } catch (error) {
        console.error(`Failed to load asset ${asset.id}:`, error);
        this.loadProgress.failed++;
      }
    }

    this.isLoading = false;
    console.log(`✅ Asset loading complete: ${this.loadProgress.loaded} loaded, ${this.loadProgress.failed} failed`);
  }

  /**
   * Load individual asset
   */
  private async loadAsset(asset: AssetMetadata): Promise<void> {
    const imagePath = this.generateAssetPath(asset);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadedTextures.set(asset.id, img);
        
        // Create sprite sheet or tileset if applicable
        if (asset.type === AssetType.SPRITE && asset.frames) {
          this.createSpriteSheet(asset, img);
        } else if (asset.type === AssetType.TILESET) {
          this.createTileset(asset, img);
        }
        
        resolve();
      };
      
      img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
      img.src = imagePath;
    });
  }

  /**
   * Generate asset file path
   */
  private generateAssetPath(asset: AssetMetadata): string {
    const basePath = '/assets';
    
    switch (asset.category) {
      case AssetCategory.CHARACTER:
        return `${basePath}/sprites/characters/${asset.id}.png`;
      case AssetCategory.ITEM:
        return `${basePath}/sprites/items/${asset.id}.png`;
      case AssetCategory.ENVIRONMENT:
        return `${basePath}/tilesets/${asset.id}.png`;
      case AssetCategory.UI:
        return `${basePath}/ui/${asset.id}.png`;
      default:
        return `${basePath}/${asset.category}/${asset.id}.png`;
    }
  }

  /**
   * Create sprite sheet from loaded texture
   */
  private createSpriteSheet(asset: AssetMetadata, texture: HTMLImageElement): void {
    if (!asset.frames) return;

    const spriteSheet: SpriteSheet = {
      id: asset.id,
      texture,
      width: texture.width,
      height: texture.height,
      columns: Math.floor(texture.width / asset.size.width),
      rows: Math.floor(texture.height / asset.size.height),
      frameWidth: asset.size.width,
      frameHeight: asset.size.height,
      sprites: [asset],
    };

    this.spriteSheets.set(asset.id, spriteSheet);
  }

  /**
   * Create tileset from loaded texture
   */
  private createTileset(asset: AssetMetadata, texture: HTMLImageElement): void {
    const tileWidth = 16; // Standard cozy game tile size
    const tileHeight = 16;
    
    const tileset: Tileset = {
      id: asset.id,
      texture,
      tileWidth,
      tileHeight,
      columns: Math.floor(texture.width / tileWidth),
      rows: Math.floor(texture.height / tileHeight),
      tiles: [asset],
    };

    this.tilesets.set(asset.id, tileset);
  }

  /**
   * Get asset metadata
   */
  public getAsset(id: string): AssetMetadata | undefined {
    const asset = this.assets.get(id);
    if (asset) {
      asset.lastAccessed = Date.now();
    }
    return asset;
  }

  /**
   * Get texture
   */
  public getTexture(id: string): HTMLImageElement | undefined {
    return this.loadedTextures.get(id);
  }

  /**
   * Get sprite sheet
   */
  public getSpriteSheet(id: string): SpriteSheet | undefined {
    return this.spriteSheets.get(id);
  }

  /**
   * Get tileset
   */
  public getTileset(id: string): Tileset | undefined {
    return this.tilesets.get(id);
  }

  /**
   * Get assets by category
   */
  public getAssetsByCategory(category: AssetCategory): AssetMetadata[] {
    return Array.from(this.assets.values()).filter(asset => asset.category === category);
  }

  /**
   * Get assets by tags
   */
  public getAssetsByTags(tags: string[]): AssetMetadata[] {
    return Array.from(this.assets.values()).filter(asset => 
      tags.some(tag => asset.tags.includes(tag))
    );
  }

  /**
   * Get cozy color palette
   */
  public getColorPalette(style: 'animalCrossing' | 'stardewValley'): Record<string, string> {
    return this.COZY_PALETTES[style];
  }

  /**
   * Create asset variants (seasonal, time-based)
   */
  public createAssetVariant(baseId: string, variantType: 'season' | 'time', variantValue: string): string {
    const variantId = `${baseId}_${variantType}_${variantValue}`;
    const baseAsset = this.assets.get(baseId);
    
    if (!baseAsset) return baseId;

    const variantAsset: AssetMetadata = {
      ...baseAsset,
      id: variantId,
      name: `${baseAsset.name} (${variantValue})`,
      tags: [...baseAsset.tags, variantType, variantValue],
    };

    this.registerAsset(variantAsset);
    return variantId;
  }

  /**
   * Optimize asset memory usage
   */
  public optimizeMemory(): void {
    const now = Date.now();
    const unusedThreshold = 5 * 60 * 1000; // 5 minutes

    // Remove unused textures from memory
    for (const [id, asset] of this.assets.entries()) {
      if (now - asset.lastAccessed > unusedThreshold && asset.loadPriority > 1) {
        const texture = this.loadedTextures.get(id);
        if (texture) {
          // In a real implementation, you'd unload the texture
          console.log(`🧹 Unloading unused asset: ${asset.name}`);
        }
      }
    }
  }

  /**
   * Get loading progress
   */
  public getLoadProgress(): AssetLoadProgress {
    return { ...this.loadProgress };
  }

  /**
   * Get asset statistics
   */
  public getAssetStats(): {
    totalAssets: number;
    loadedAssets: number;
    totalMemoryUsage: number;
    assetsByType: Record<AssetType, number>;
    assetsByCategory: Record<AssetCategory, number>;
  } {
    const assetsByType = {} as Record<AssetType, number>;
    const assetsByCategory = {} as Record<AssetCategory, number>;
    let totalMemoryUsage = 0;

    for (const asset of this.assets.values()) {
      assetsByType[asset.type] = (assetsByType[asset.type] || 0) + 1;
      assetsByCategory[asset.category] = (assetsByCategory[asset.category] || 0) + 1;
      totalMemoryUsage += asset.memoryUsage;
    }

    return {
      totalAssets: this.assets.size,
      loadedAssets: this.loadedTextures.size,
      totalMemoryUsage,
      assetsByType,
      assetsByCategory,
    };
  }

  /**
   * Generate asset atlas for performance optimization
   */
  public generateAtlas(assetIds: string[]): Promise<SpriteSheet> {
    return new Promise((resolve) => {
      // In a real implementation, you'd combine multiple assets into a single texture
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      let totalWidth = 0;
      let maxHeight = 0;
      
      // Calculate atlas dimensions
      for (const id of assetIds) {
        const asset = this.assets.get(id);
        if (asset) {
          totalWidth += asset.size.width;
          maxHeight = Math.max(maxHeight, asset.size.height);
        }
      }
      
      canvas.width = totalWidth;
      canvas.height = maxHeight;
      
      // Draw assets side by side
      let xOffset = 0;
      const sprites: AssetMetadata[] = [];
      
      for (const id of assetIds) {
        const asset = this.assets.get(id);
        const texture = this.loadedTextures.get(id);
        
        if (asset && texture) {
          ctx.drawImage(texture, xOffset, 0, asset.size.width, asset.size.height);
          
          const atlasAsset = { ...asset };
          sprites.push(atlasAsset);
          xOffset += asset.size.width;
        }
      }
      
      const img = new Image();
      img.onload = () => {
        const atlas: SpriteSheet = {
          id: `atlas_${Date.now()}`,
          texture: img,
          width: canvas.width,
          height: canvas.height,
          columns: assetIds.length,
          rows: 1,
          frameWidth: totalWidth / assetIds.length,
          frameHeight: maxHeight,
          sprites,
        };
        
        resolve(atlas);
      };
      img.src = canvas.toDataURL();
    });
  }

  /**
   * Save asset manager state
   */
  public save(): {
    assets: Record<string, AssetMetadata>;
    loadQueue: AssetMetadata[];
  } {
    const assets: Record<string, AssetMetadata> = {};
    this.assets.forEach((asset, id) => {
      assets[id] = { ...asset };
    });

    return {
      assets,
      loadQueue: [...this.loadQueue],
    };
  }

  /**
   * Load asset manager state
   */
  public load(data: {
    assets: Record<string, AssetMetadata>;
    loadQueue: AssetMetadata[];
  }): void {
    this.assets.clear();
    this.loadQueue = [];
    
    Object.entries(data.assets).forEach(([id, asset]) => {
      this.assets.set(id, asset);
    });
    
    this.loadQueue = [...data.loadQueue];
  }
}
