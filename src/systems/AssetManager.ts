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
   * Automatically loads all built-in free assets.
   * Pass `{ loadBuiltinAssets: false }` to start empty (used by tests).
   */
  constructor(options?: { loadBuiltinAssets?: boolean }) {
    if (options?.loadBuiltinAssets !== false) {
      this.initializeBuiltinAssets();
    }
  }

  /**
   * Insert or replace an asset by id.
   * A second register with the same id (hot reload, remount) updates the
   * existing row instead of appending another copy to the category list.
   */
  private storeAsset(asset: SpriteAsset): void {
    const previous = this.assets.get(asset.id);
    this.assets.set(asset.id, asset);

    if (previous && previous.category !== asset.category) {
      const previousCategory = this.assetLibrary[previous.category];
      if (previousCategory) {
        this.assetLibrary[previous.category] = previousCategory.filter(
          (entry) => entry.id !== asset.id
        );
      }
    }

    if (!this.assetLibrary[asset.category]) {
      this.assetLibrary[asset.category] = [];
    }

    const categoryAssets = this.assetLibrary[asset.category];
    const existingIndex = categoryAssets.findIndex((entry) => entry.id === asset.id);
    if (existingIndex >= 0) {
      categoryAssets[existingIndex] = asset;
    } else {
      categoryAssets.push(asset);
    }
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
      { id: 'tile_grass_hole', name: 'Grass Hole', category: 'tile', source: 'builtin', path: require('../../assets/tiles/grass_hole.svg'), isAnimated: false, scale: 1, tags: ['terrain', 'planting'] },

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
      { id: 'building_garage', name: 'Garage', category: 'building', source: 'builtin', path: require('../../assets/buildings/garage.svg'), isAnimated: false, scale: 2.5, tags: ['building', 'garage', 'vehicle'] }, // Re-added from list end

      // Decorations
      { id: 'tree_oak', name: 'Oak Tree', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/tree_oak.svg'), isAnimated: false, scale: 2, tags: ['tree', 'nature'] },
      { id: 'tree_oak_trunk', name: 'Oak Trunk', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/tree_oak_premium.svg'), isAnimated: false, scale: 2, tags: ['tree', 'part'] },
      { id: 'tree_oak_canopy_back', name: 'Oak Canopy Back', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/tree_oak_premium.svg'), isAnimated: false, scale: 2, tags: ['tree', 'part'] },
      { id: 'tree_oak_canopy_front', name: 'Oak Canopy Front', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/tree_oak_premium.svg'), isAnimated: false, scale: 2, tags: ['tree', 'part'] },
      { id: 'tree_oak_shadow', name: 'Oak Shadow', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/tree_oak_premium.svg'), isAnimated: false, scale: 2, tags: ['tree', 'part'] },
      { id: 'tree_oak_fruit', name: 'Oak Fruit', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/tree_oak_premium.svg'), isAnimated: false, scale: 2, tags: ['tree', 'part'] },

      { id: 'grass_tall', name: 'Tall Grass', category: 'tile', source: 'builtin', path: require('../../assets/tiles/grass_tall.svg'), isAnimated: false, scale: 1, tags: ['terrain', 'grass'] },
      { id: 'bench', name: 'Bench', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/bench.svg'), isAnimated: false, scale: 1, tags: ['furniture'] },
      { id: 'lamp', name: 'Lamp', category: 'decoration', source: 'builtin', path: require('../../assets/decorations/lamp.svg'), isAnimated: false, scale: 0.8, tags: ['furniture'] },

      // Animals
      { id: 'animal_chicken', name: 'Chicken', category: 'npc', source: 'builtin', path: require('../../assets/animals/chicken.svg'), isAnimated: false, scale: 1, tags: ['animal', 'chicken'] },
      { id: 'animal_cow', name: 'Cow', category: 'npc', source: 'builtin', path: require('../../assets/animals/cow.svg'), isAnimated: false, scale: 1.5, tags: ['animal', 'cow'] },
      { id: 'animal_sheep', name: 'Sheep', category: 'npc', source: 'builtin', path: require('../../assets/animals/sheep.svg'), isAnimated: false, scale: 1.5, tags: ['animal', 'sheep'] },

      // Artisan Machines
      { id: 'building_keg', name: 'Keg', category: 'building', source: 'builtin', path: require('../../assets/machines/keg.svg'), isAnimated: false, scale: 1.2, tags: ['machine', 'keg'] },
      { id: 'building_preserves_jar', name: 'Preserves Jar', category: 'building', source: 'builtin', path: require('../../assets/machines/preserves.svg'), isAnimated: false, scale: 1.2, tags: ['machine', 'jar'] },

      // Artisan Goods
      { id: 'item_juice', name: 'Juice', category: 'item', source: 'builtin', path: require('../../assets/goods/juice.svg'), isAnimated: false, scale: 0.8, tags: ['artisan', 'juice'] },
      { id: 'item_jam', name: 'Jam', category: 'item', source: 'builtin', path: require('../../assets/goods/jam.svg'), isAnimated: false, scale: 0.8, tags: ['artisan', 'jam'] },
      // Artisan Goods
      { id: 'item_wine', name: 'Wine', category: 'item', source: 'builtin', path: require('../../assets/goods/wine.svg'), isAnimated: false, scale: 0.8, tags: ['artisan', 'wine'] },
      { id: 'item_pickles', name: 'Pickles', category: 'item', source: 'builtin', path: require('../../assets/goods/pickles.svg'), isAnimated: false, scale: 0.8, tags: ['artisan', 'pickles'] },
      { id: 'item_beer', name: 'Beer', category: 'item', source: 'builtin', path: require('../../assets/goods/beer.svg'), isAnimated: false, scale: 0.8, tags: ['artisan', 'beer'] },
      { id: 'item_flour', name: 'Flour', category: 'item', source: 'builtin', path: require('../../assets/goods/flour.svg'), isAnimated: false, scale: 0.8, tags: ['artisan', 'flour'] },

      // Fertilizers
      { id: 'item_fertilizer_speed', name: 'Speed-Grow', category: 'item', source: 'builtin', path: require('../../assets/fertilizers/speed.svg'), isAnimated: false, scale: 0.7, tags: ['fertilizer', 'speed'] },
      { id: 'item_fertilizer_quality', name: 'Quality Fertilizer', category: 'item', source: 'builtin', path: require('../../assets/fertilizers/quality.svg'), isAnimated: false, scale: 0.7, tags: ['fertilizer', 'quality'] },
      { id: 'item_fertilizer_water', name: 'Water Retaining Soil', category: 'item', source: 'builtin', path: require('../../assets/fertilizers/water.svg'), isAnimated: false, scale: 0.7, tags: ['fertilizer', 'water'] },

      // Automation
      { id: 'building_sprinkler_basic', name: 'Basic Sprinkler', category: 'building', source: 'builtin', path: require('../../assets/automation/sprinkler_basic.svg'), isAnimated: false, scale: 1, tags: ['automation', 'sprinkler'] },
      { id: 'building_sprinkler_quality', name: 'Quality Sprinkler', category: 'building', source: 'builtin', path: require('../../assets/automation/sprinkler_quality.svg'), isAnimated: false, scale: 1, tags: ['automation', 'sprinkler'] },
      { id: 'building_sprinkler_iridium', name: 'Iridium Sprinkler', category: 'building', source: 'builtin', path: require('../../assets/automation/sprinkler_iridium.svg'), isAnimated: false, scale: 1, tags: ['automation', 'sprinkler'] },
    ];

    // --- DYNAMIC CROP REGISTRATION ---
    // --- DYNAMIC CROP REGISTRATION (Using Static Manifest) ---
    // Import generated manifest (ensure this file exists via generate-crop-phases.js)
    const { GeneratedCrops } = require('../assets/GeneratedCrops');

    const registerCrop = (name: string, phases: number = 5) => {
      for (let i = 1; i <= phases; i++) {
        const id = `crop_${name}_phase${i}`;
        const assetPath = GeneratedCrops[id];

        if (assetPath) {
          builtinAssets.push({
            id: id,
            name: `${name.charAt(0).toUpperCase() + name.slice(1)} Phase ${i}`,
            category: 'crop',
            source: 'builtin',
            path: assetPath, // Static require from manifest
            isAnimated: false,
            scale: 1,
            tags: ['crop', name, `phase${i}`]
          });
        }
      }
    };

    const cropTypes = [
      'apple', 'peach', 'pear', 'cherry', 'strawberry', 'watermelon',
      'carrot', 'corn', 'tomato', 'asparagus', 'broccoli', 'cabbage',
      'mushroom', 'cucumber', 'pepper', 'potato', 'onion', 'garlic',
      'radish', 'lettuce', 'spinach', 'pumpkin', 'wheat', 'blueberry', 'grape'
    ];

    cropTypes.forEach(name => registerCrop(name));

    builtinAssets.forEach((asset) => {
      this.storeAsset(asset);
    });
  }

  /**
   * Register a free asset from external sources
   * Marks asset as sourced from Kenney.nl, OpenGameArt, or similar
   * @param asset - SpriteAsset definition to register
   */
  registerFreeAsset(asset: SpriteAsset): void {
    asset.source = 'free';
    this.storeAsset(asset);
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
    this.storeAsset(asset);

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
    this.storeAsset(asset);

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
   * Get all registered assets, one entry per id.
   * Repeated register calls must not make TextureManager preload the same image twice.
   * @returns Array of SpriteAsset objects with duplicate ids removed
   */
  getAllAssets(): SpriteAsset[] {
    const seen = new Set<string>();
    return Array.from(this.assets.values()).filter((asset) => {
      if (seen.has(asset.id)) {
        return false;
      }
      seen.add(asset.id);
      return true;
    });
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
