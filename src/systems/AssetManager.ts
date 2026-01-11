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
      // Base Tiles
      { id: 'tile_grass', name: 'Grass', category: 'tile', source: 'builtin', path: require('../../assets/tiles/grass.svg'), isAnimated: false, scale: 1, tags: ['terrain'] },
      { id: 'tile_dirt', name: 'Dirt', category: 'tile', source: 'builtin', path: require('../../assets/tiles/dirt.svg'), isAnimated: false, scale: 1, tags: ['terrain', 'tilled'] },
      { id: 'tile_water', name: 'Water', category: 'tile', source: 'builtin', path: require('../../assets/tiles/water.svg'), isAnimated: false, scale: 1, tags: ['terrain', 'water'] },

      // Roads
      { id: 'road_dirt', name: 'Dirt Road', category: 'tile', source: 'builtin', path: require('../../assets/tiles/road_dirt.svg'), isAnimated: false, scale: 1, tags: ['road'] },
      { id: 'road_paved', name: 'Paved Road', category: 'tile', source: 'builtin', path: require('../../assets/tiles/road_paved.svg'), isAnimated: false, scale: 1, tags: ['road'] },

      // Vehicles
      { id: 'vehicle_tractor_se', name: 'Tractor SE', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/tractor_se.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'se'] },
      { id: 'vehicle_tractor_sw', name: 'Tractor SW', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/tractor_sw.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'sw'] },
      { id: 'vehicle_tractor_ne', name: 'Tractor NE', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/tractor_ne.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'ne'] },
      { id: 'vehicle_tractor_nw', name: 'Tractor NW', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/tractor_nw.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'nw'] },
      { id: 'vehicle_tractor_source', name: 'Tractor Master', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/tractor.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'source'] },

      { id: 'vehicle_truck_se', name: 'Truck SE', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/truck_se.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'se'] },
      { id: 'vehicle_truck_sw', name: 'Truck SW', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/truck_sw.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'sw'] },
      { id: 'vehicle_truck_ne', name: 'Truck NE', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/truck_ne.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'ne'] },
      { id: 'vehicle_truck_nw', name: 'Truck NW', category: 'vehicle', source: 'builtin', path: require('../../assets/vehicles/truck_nw.svg'), isAnimated: false, scale: 1.5, tags: ['vehicle', 'nw'] },

      // Buildings
      { id: 'building_barn', name: 'Barn', category: 'building', source: 'builtin', path: require('../../assets/buildings/barn.svg'), isAnimated: false, scale: 2, tags: ['building', 'storage'] },
      { id: 'building_shed', name: 'Shed', category: 'building', source: 'builtin', path: require('../../assets/buildings/shed.svg'), isAnimated: false, scale: 1.5, tags: ['building', 'storage'] },
      { id: 'building_house', name: 'House', category: 'building', source: 'builtin', path: require('../../assets/buildings/house.svg'), isAnimated: false, scale: 2.5, tags: ['building', 'home'] },

      // Wheat Phases
      { id: 'crop_wheat_phase1', name: 'Wheat Seed', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase1/wheat.svg'), isAnimated: false, scale: 1, tags: ['crop', 'wheat', 'phase1'] },
      { id: 'crop_wheat_phase2', name: 'Wheat Sprout', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase2/wheat.svg'), isAnimated: false, scale: 1, tags: ['crop', 'wheat', 'phase2'] },
      { id: 'crop_wheat_phase3', name: 'Wheat Growing', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase3/wheat.svg'), isAnimated: false, scale: 1, tags: ['crop', 'wheat', 'phase3'] },
      { id: 'crop_wheat_phase4', name: 'Wheat Mature', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase4/wheat.svg'), isAnimated: false, scale: 1, tags: ['crop', 'wheat', 'phase4'] },
      { id: 'crop_wheat_phase5', name: 'Wheat Harvest', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase5/wheat.svg'), isAnimated: false, scale: 1, tags: ['crop', 'wheat', 'phase5'] },

      // Carrot Phases
      { id: 'crop_carrot_phase1', name: 'Carrot Seed', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase1/carrot.svg'), isAnimated: false, scale: 1, tags: ['crop', 'carrot', 'phase1'] },
      { id: 'crop_carrot_phase2', name: 'Carrot Sprout', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase2/carrot.svg'), isAnimated: false, scale: 1, tags: ['crop', 'carrot', 'phase2'] },
      { id: 'crop_carrot_phase3', name: 'Carrot Growing', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase3/carrot.svg'), isAnimated: false, scale: 1, tags: ['crop', 'carrot', 'phase3'] },
      { id: 'crop_carrot_phase4', name: 'Carrot Mature', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase4/carrot.svg'), isAnimated: false, scale: 1, tags: ['crop', 'carrot', 'phase4'] },
      { id: 'crop_carrot_phase5', name: 'Carrot Harvest', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase5/carrot.svg'), isAnimated: false, scale: 1, tags: ['crop', 'carrot', 'phase5'] },

      // Tomato Phases
      { id: 'crop_tomato_phase1', name: 'Tomato Seed', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase1/tomato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'tomato', 'phase1'] },
      { id: 'crop_tomato_phase2', name: 'Tomato Sprout', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase2/tomato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'tomato', 'phase2'] },
      { id: 'crop_tomato_phase3', name: 'Tomato Growing', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase3/tomato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'tomato', 'phase3'] },
      { id: 'crop_tomato_phase4', name: 'Tomato Mature', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase4/tomato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'tomato', 'phase4'] },
      { id: 'crop_tomato_phase5', name: 'Tomato Harvest', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase5/tomato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'tomato', 'phase5'] },

      // Corn Phases
      { id: 'crop_corn_phase1', name: 'Corn Seed', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase1/corn.svg'), isAnimated: false, scale: 1, tags: ['crop', 'corn', 'phase1'] },
      { id: 'crop_corn_phase2', name: 'Corn Sprout', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase2/corn.svg'), isAnimated: false, scale: 1, tags: ['crop', 'corn', 'phase2'] },
      { id: 'crop_corn_phase3', name: 'Corn Growing', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase3/corn.svg'), isAnimated: false, scale: 1, tags: ['crop', 'corn', 'phase3'] },
      { id: 'crop_corn_phase4', name: 'Corn Mature', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase4/corn.svg'), isAnimated: false, scale: 1, tags: ['crop', 'corn', 'phase4'] },
      { id: 'crop_corn_phase5', name: 'Corn Harvest', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase5/corn.svg'), isAnimated: false, scale: 1, tags: ['crop', 'corn', 'phase5'] },

      // Potato Phases
      { id: 'crop_potato_phase1', name: 'Potato Seed', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase1/potato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'potato', 'phase1'] },
      { id: 'crop_potato_phase2', name: 'Potato Sprout', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase2/potato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'potato', 'phase2'] },
      { id: 'crop_potato_phase3', name: 'Potato Growing', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase3/potato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'potato', 'phase3'] },
      { id: 'crop_potato_phase4', name: 'Potato Mature', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase4/potato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'potato', 'phase4'] },
      { id: 'crop_potato_phase5', name: 'Potato Harvest', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase5/potato.svg'), isAnimated: false, scale: 1, tags: ['crop', 'potato', 'phase5'] },

      // Pumpkin Phases
      { id: 'crop_pumpkin_phase1', name: 'Pumpkin Seed', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase1/pumpkin.svg'), isAnimated: false, scale: 1, tags: ['crop', 'pumpkin', 'phase1'] },
      { id: 'crop_pumpkin_phase2', name: 'Pumpkin Sprout', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase2/pumpkin.svg'), isAnimated: false, scale: 1, tags: ['crop', 'pumpkin', 'phase2'] },
      { id: 'crop_pumpkin_phase3', name: 'Pumpkin Growing', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase3/pumpkin.svg'), isAnimated: false, scale: 1, tags: ['crop', 'pumpkin', 'phase3'] },
      { id: 'crop_pumpkin_phase4', name: 'Pumpkin Mature', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase4/pumpkin.svg'), isAnimated: false, scale: 1, tags: ['crop', 'pumpkin', 'phase4'] },
      { id: 'crop_pumpkin_phase5', name: 'Pumpkin Harvest', category: 'crop', source: 'builtin', path: require('../../assets/crops/phase5/pumpkin.svg'), isAnimated: false, scale: 1, tags: ['crop', 'pumpkin', 'phase5'] },

      // Decorations (Legacy support)
      { id: 'tree_oak', name: 'Oak Tree', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/tree_oak.svg'), isAnimated: false, scale: 2, tags: ['tree', 'nature'] },
      { id: 'bench', name: 'Bench', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/bench.svg'), isAnimated: false, scale: 1, tags: ['furniture'] },
      { id: 'lamp', name: 'Lamp', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/lamp.svg'), isAnimated: false, scale: 0.8, tags: ['furniture'] },

      // Animals
      { id: 'animal_chicken', name: 'Chicken', category: 'npc', source: 'builtin', path: require('../assets/animals/chicken.png'), isAnimated: false, scale: 1, tags: ['animal', 'chicken'] },
      { id: 'animal_cow', name: 'Cow', category: 'npc', source: 'builtin', path: require('../assets/animals/cow.png'), isAnimated: false, scale: 1.5, tags: ['animal', 'cow'] },
      { id: 'animal_sheep', name: 'Sheep', category: 'npc', source: 'builtin', path: require('../assets/animals/sheep.png'), isAnimated: false, scale: 1.5, tags: ['animal', 'sheep'] },

      // Artisan Machines
      { id: 'building_keg', name: 'Keg', category: 'building', source: 'builtin', path: require('../assets/machines/keg.png'), isAnimated: false, scale: 1.2, tags: ['machine', 'keg'] },
      { id: 'building_preserves_jar', name: 'Preserves Jar', category: 'building', source: 'builtin', path: require('../assets/machines/preserves_jar.png'), isAnimated: false, scale: 1.2, tags: ['machine', 'jar'] },

      // Artisan Goods
      { id: 'item_juice', name: 'Juice', category: 'item', source: 'builtin', path: require('../assets/goods/juice.png'), isAnimated: false, scale: 0.8, tags: ['artisan', 'juice'] },
      { id: 'item_jam', name: 'Jam', category: 'item', source: 'builtin', path: require('../assets/goods/jam.png'), isAnimated: false, scale: 0.8, tags: ['artisan', 'jam'] },
      { id: 'item_wine', name: 'Wine', category: 'item', source: 'builtin', path: require('../assets/goods/wine.png'), isAnimated: false, scale: 0.8, tags: ['artisan', 'wine'] },
      { id: 'item_pickles', name: 'Pickles', category: 'item', source: 'builtin', path: require('../assets/goods/pickles.png'), isAnimated: false, scale: 0.8, tags: ['artisan', 'pickles'] },
      { id: 'item_beer', name: 'Beer', category: 'item', source: 'builtin', path: require('../assets/goods/beer.png'), isAnimated: false, scale: 0.8, tags: ['artisan', 'beer'] },
      { id: 'item_flour', name: 'Flour', category: 'item', source: 'builtin', path: require('../assets/goods/flour.png'), isAnimated: false, scale: 0.8, tags: ['artisan', 'flour'] },

      // Fertilizers
      { id: 'item_fertilizer_speed', name: 'Speed-Grow', category: 'item', source: 'builtin', path: require('../assets/fertilizers/speed.png'), isAnimated: false, scale: 0.7, tags: ['fertilizer', 'speed'] },
      { id: 'item_fertilizer_quality', name: 'Quality Fertilizer', category: 'item', source: 'builtin', path: require('../assets/fertilizers/quality.png'), isAnimated: false, scale: 0.7, tags: ['fertilizer', 'quality'] },
      { id: 'item_fertilizer_water', name: 'Water Retaining Soil', category: 'item', source: 'builtin', path: require('../assets/fertilizers/water.png'), isAnimated: false, scale: 0.7, tags: ['fertilizer', 'water'] },

      // Automation
      { id: 'building_sprinkler_basic', name: 'Basic Sprinkler', category: 'building', source: 'builtin', path: require('../assets/automation/sprinkler_basic.png'), isAnimated: false, scale: 1, tags: ['automation', 'sprinkler'] },
      { id: 'building_sprinkler_quality', name: 'Quality Sprinkler', category: 'building', source: 'builtin', path: require('../assets/automation/sprinkler_quality.png'), isAnimated: false, scale: 1, tags: ['automation', 'sprinkler'] },
      { id: 'building_sprinkler_iridium', name: 'Iridium Sprinkler', category: 'building', source: 'builtin', path: require('../assets/automation/sprinkler_iridium.png'), isAnimated: false, scale: 1, tags: ['automation', 'sprinkler'] },
      { id: 'building_garage', name: 'Garage', category: 'building', source: 'builtin', path: require('../../assets/buildings/garage.svg'), isAnimated: false, scale: 2.5, tags: ['building', 'garage', 'vehicle'] },
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
