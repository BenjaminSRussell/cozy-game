import { SpriteAsset, AnimationData } from '../types/game';

/**
 * Asset Manager for Cozy Haven
 *
 * Centralized management of all game assets (sprites, animations, images).
 * Handles loading, caching, categorizing, and serving game assets.
 *
 * Features:
 * - Built-in free asset library (Kenney, OpenGameArt)
 * - Support for custom player-drawn assets
 * - AI-generated asset integration
 * - Image preloading and caching
 * - Asset categorization (crops, buildings, decorations, tiles, UI, NPCs)
 * - Tag-based asset searching
 * - Animation data registry
 * - Memory cache management
 * - Asset statistics and analytics
 *
 * Asset Sources:
 * - 'builtin': Free assets from Kenney.nl, OpenGameArt, simple generated graphics
 * - 'free': External free assets registered at runtime
 * - 'custom': Player-drawn assets from drawing system
 * - 'ai_generated': AI-generated custom furniture and decorations
 */

/**
 * Asset library organized by category
 * Maps category name to array of SpriteAsset objects in that category
 */
export interface AssetLibrary {
  [category: string]: SpriteAsset[];
}

/**
 * Asset Manager class
 * Manages all sprite and animation assets for the game
 */
export class AssetManager {
  /** Map of all known assets by ID */
  private assets: Map<string, SpriteAsset> = new Map();

  /** Asset library organized by category for quick lookup */
  private assetLibrary: AssetLibrary = {};

  /** Cache of loaded HTML image elements for rendering */
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  /** Animation frame data for animated sprites */
  private animationData: Map<string, AnimationData> = new Map();

  /**
   * Create Asset Manager instance
   * Automatically loads all built-in free assets
   */
  constructor() {
    this.initializeBuiltinAssets();
  }

  /**
   * Initialize built-in free assets
   * These come from:
   * - Kenney.nl free assets
   * - OpenGameArt
   * - Custom simple generated graphics
   */
  private initializeBuiltinAssets(): void {
    const builtinAssets: SpriteAsset[] = [
      // Crops
      {
        id: 'wheat',
        name: 'Wheat',
        category: 'crop',
        source: 'builtin',
        path: 'assets/crops/wheat.png',
        animationFrames: 5,
        isAnimated: false,
        scale: 1,
        tags: ['crop', 'grain', 'season:all'],
      },
      {
        id: 'carrot',
        name: 'Carrot',
        category: 'crop',
        source: 'builtin',
        path: 'assets/crops/carrot.png',
        isAnimated: false,
        scale: 1,
        tags: ['crop', 'vegetable'],
      },
      {
        id: 'tomato',
        name: 'Tomato',
        category: 'crop',
        source: 'builtin',
        path: 'assets/crops/tomato.png',
        isAnimated: true,
        animationFrames: 3,
        scale: 1,
        tags: ['crop', 'vegetable', 'season:summer'],
      },
      // Buildings
      {
        id: 'barn',
        name: 'Barn',
        category: 'building',
        source: 'builtin',
        path: 'assets/buildings/barn.png',
        isAnimated: false,
        scale: 2,
        tags: ['building', 'storage'],
      },
      {
        id: 'shed',
        name: 'Shed',
        category: 'building',
        source: 'builtin',
        path: 'assets/buildings/shed.png',
        isAnimated: false,
        scale: 1.5,
        tags: ['building', 'storage'],
      },
      {
        id: 'house',
        name: 'House',
        category: 'building',
        source: 'builtin',
        path: 'assets/buildings/house.png',
        isAnimated: false,
        scale: 2.5,
        tags: ['building', 'home'],
      },
      // Decorations
      {
        id: 'tree_oak',
        name: 'Oak Tree',
        category: 'decoration',
        source: 'builtin',
        path: 'assets/decorations/tree_oak.png',
        isAnimated: false,
        scale: 2,
        tags: ['tree', 'nature', 'harvestable'],
      },
      {
        id: 'bench',
        name: 'Bench',
        category: 'decoration',
        source: 'builtin',
        path: 'assets/decorations/bench.png',
        isAnimated: false,
        scale: 1,
        tags: ['furniture', 'decorative'],
      },
      {
        id: 'lamp',
        name: 'Lamp',
        category: 'decoration',
        source: 'builtin',
        path: 'assets/decorations/lamp.png',
        isAnimated: true,
        animationFrames: 2,
        scale: 0.8,
        tags: ['furniture', 'lighting'],
      },
      // Tiles
      {
        id: 'grass',
        name: 'Grass',
        category: 'tile',
        source: 'builtin',
        path: 'assets/tiles/grass.png',
        isAnimated: false,
        scale: 1,
        tags: ['terrain'],
      },
      {
        id: 'dirt',
        name: 'Dirt',
        category: 'tile',
        source: 'builtin',
        path: 'assets/tiles/dirt.png',
        isAnimated: false,
        scale: 1,
        tags: ['terrain', 'tilled'],
      },
      {
        id: 'water',
        name: 'Water',
        category: 'tile',
        source: 'builtin',
        path: 'assets/tiles/water.png',
        isAnimated: true,
        animationFrames: 4,
        scale: 1,
        tags: ['terrain', 'water'],
      },
    ];

    builtinAssets.forEach((asset) => {
      this.assets.set(asset.id, asset);
      if (!this.assetLibrary[asset.category]) {
        this.assetLibrary[asset.category] = [];
      }
      this.assetLibrary[asset.category].push(asset);
    });
  }

  /**
   * Register a free asset from external sources
   * Marks asset as sourced from Kenney.nl, OpenGameArt, or similar
   * @param asset - SpriteAsset definition to register
   */
  registerFreeAsset(asset: SpriteAsset): void {
    asset.source = 'free';
    this.assets.set(asset.id, asset);

    if (!this.assetLibrary[asset.category]) {
      this.assetLibrary[asset.category] = [];
    }
    this.assetLibrary[asset.category].push(asset);
  }

  /**
   * Register an AI-generated asset
   * For custom furniture and decorations created by AI
   * Converts image blob to cached HTML image element
   * @param asset - SpriteAsset metadata for the AI-generated asset
   * @param imageData - Blob data of the generated image
   */
  registerAIAsset(asset: SpriteAsset, imageData: Blob): void {
    asset.source = 'ai_generated';
    this.assets.set(asset.id, asset);

    if (!this.assetLibrary[asset.category]) {
      this.assetLibrary[asset.category] = [];
    }
    this.assetLibrary[asset.category].push(asset);

    // Store image data
    const url = URL.createObjectURL(imageData);
    const img = new Image();
    img.onload = () => {
      this.loadedImages.set(asset.id, img);
    };
    img.src = url;
  }

  /**
   * Register a custom user-drawn asset
   * Converts canvas drawing to cached image for rendering
   * Used for player-created furniture and decorations
   * @param asset - SpriteAsset metadata for the custom asset
   * @param canvas - HTML canvas element containing the drawing
   */
  registerCustomAsset(asset: SpriteAsset, canvas: HTMLCanvasElement): void {
    asset.source = 'custom';
    this.assets.set(asset.id, asset);

    if (!this.assetLibrary[asset.category]) {
      this.assetLibrary[asset.category] = [];
    }
    this.assetLibrary[asset.category].push(asset);

    // Convert canvas to image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          this.loadedImages.set(asset.id, img);
        };
        img.src = url;
      }
    });
  }

  /**
   * Get asset metadata by ID
   * @param assetId - ID of the asset to retrieve
   * @returns SpriteAsset metadata or undefined if not found
   */
  getAsset(assetId: string): SpriteAsset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * Get all assets in a specific category
   * @param category - Category name ('crop', 'building', 'decoration', 'tile', 'ui', 'npc')
   * @returns Array of SpriteAsset objects in that category
   */
  getAssetsByCategory(category: string): SpriteAsset[] {
    return this.assetLibrary[category] || [];
  }

  /**
   * Search assets by tag
   * Tags allow filtering assets by properties and attributes
   * @param tag - Tag to search for ('crop', 'vegetable', 'harvestable', 'season:summer', etc.)
   * @returns Array of SpriteAsset objects matching the tag
   */
  searchAssetsByTag(tag: string): SpriteAsset[] {
    const results: SpriteAsset[] = [];
    this.assets.forEach((asset) => {
      if (asset.tags.includes(tag)) {
        results.push(asset);
      }
    });
    return results;
  }

  /**
   * Get cached loaded image element
   * Use for rendering sprites that have been preloaded
   * @param assetId - ID of the asset to get the image for
   * @returns Cached HTMLImageElement or undefined if not loaded
   */
  getImage(assetId: string): HTMLImageElement | undefined {
    return this.loadedImages.get(assetId);
  }

  /**
   * Preload image for an asset
   * Loads image from path and caches in memory for faster rendering
   * Safe to call multiple times - returns cached version if already loaded
   * @param assetId - ID of asset to preload
   * @returns Promise resolving to loaded HTMLImageElement
   * @throws Error if asset not found or image fails to load
   */
  async loadImage(assetId: string): Promise<HTMLImageElement> {
    if (this.loadedImages.has(assetId)) {
      return this.loadedImages.get(assetId)!;
    }

    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(assetId, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load ${asset.path}`));
      img.src = asset.path;
    });
  }

  /**
   * Batch preload multiple images
   * Loads all images in parallel using Promise.all
   * Errors in individual loads are silently ignored (non-blocking)
   * @param assetIds - Array of asset IDs to preload
   */
  async loadImages(assetIds: string[]): Promise<void> {
    await Promise.all(assetIds.map((id) => this.loadImage(id).catch(() => null)));
  }

  /**
   * Register animation frame data for a sprite
   * Used for animated assets to define frame progression
   * @param assetId - ID of asset to add animation to
   * @param animation - AnimationData defining frame sequence
   */
  registerAnimation(assetId: string, animation: AnimationData): void {
    this.animationData.set(assetId, animation);
  }

  /**
   * Get animation data for a sprite
   * @param assetId - ID of asset to get animation for
   * @returns AnimationData if registered, undefined otherwise
   */
  getAnimation(assetId: string): AnimationData | undefined {
    return this.animationData.get(assetId);
  }

  /**
   * Get all registered assets
   * @returns Array of all SpriteAsset objects
   */
  getAllAssets(): SpriteAsset[] {
    return Array.from(this.assets.values());
  }

  /**
   * Clear image cache to free memory
   * Removes all loaded images from memory
   * Safe to call during low-memory conditions
   * Images will be reloaded on demand
   */
  clearCache(): void {
    this.loadedImages.forEach((img, key) => {
      // URL.revokeObjectURL can be called here if needed
    });
    this.loadedImages.clear();
  }

  /**
   * Get asset statistics and inventory
   * Useful for debugging and analytics
   * @returns Object with total count and breakdown by source and category
   */
  getStats(): {
    total: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const stats = {
      total: this.assets.size,
      bySource: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    this.assets.forEach((asset) => {
      stats.bySource[asset.source] = (stats.bySource[asset.source] || 0) + 1;
      stats.byCategory[asset.category] = (stats.byCategory[asset.category] || 0) + 1;
    });

    return stats;
  }
}
