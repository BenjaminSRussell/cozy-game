/**
 * Core game types for Cozy Haven farming simulation
 *
 * This file defines all TypeScript interfaces and types used throughout the game.
 * Organized into logical sections:
 * - Spatial types (Vector2D/3D)
 * - Items and inventory
 * - Farming system (crops, plots)
 * - Building system (structures, customization)
 * - Mining/Resource extraction
 * - Player progression
 * - World state
 * - Game settings
 */

// ============================================================================
// SPATIAL TYPES - Positioning and coordinates
// ============================================================================

/**
 * Two-dimensional coordinate for grid-based world positioning
 * Used for flat layouts like farm plots, ore deposits, trees
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Weather event types that affect crops and farm
 * Each weather type has different effects on crop health and growth
 */
export type WeatherType = 'drought' | 'flood' | 'normal' | 'rain' | 'storm';

/**
 * Active weather event affecting the farm
 * Weather events damage crops and can be mitigated with protection structures
 */
export interface WeatherEvent {
  /** Unique identifier for this weather event */
  id: string;
  /** Type of weather event */
  type: WeatherType;
  /** Timestamp when weather event started */
  startTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Severity level (1-5, affects damage amount) */
  severity: number;
  /** Area affected by weather event */
  affectedArea: {
    /** Center position of affected area */
    center: Vector2D;
    /** Radius of affected area in grid units */
    radius: number;
  };
  /** Whether event is currently active */
  active: boolean;
}

/**
 * Dam building for flood protection
 * Multi-block structure that protects crops from flood damage
 */
export interface DamBuilding {
  /** Unique identifier for this dam */
  id: string;
  /** Dam type affects protection capacity */
  type: 'small_dam' | 'medium_dam' | 'large_dam';
  /** 3D position for isometric rendering */
  position: Vector3D;
  /** Rotation angle in degrees */
  rotation: number;
  /** Protection level (1-5, higher = better protection) */
  protectionLevel: number;
  /** Current structural integrity (0-100) */
  integrity: number;
  /** Maximum flood level this dam can handle */
  maxFloodLevel: number;
  /** Areas protected by this dam */
  protectedAreas: Vector2D[];
  /** Dam dimensions in grid units */
  size: Vector2D;
  /** Whether dam is currently operational */
  operational: boolean;
}

/**
 * Two-dimensional vector for grid positioning
 * Used throughout the game for coordinates and sizes
 * @example { x: 10, y: 20 }
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Three-dimensional vector extending Vector2D with depth component
 * Used for 2.5D isometric rendering (z-depth for layering)
 * @example { x: 10, y: 20, z: 5 }
 */
export interface Vector3D extends Vector2D {
  z: number; // For 2.5D depth sorting in canvas rendering
}

// ============================================================================
// ITEMS & INVENTORY - Collectible resources and inventory system
// ============================================================================

/**
 * Item type enumeration for inventory management
 * Determines how items function and where they can be used
 */
export enum ItemType {
  /** Harvested crops (wheat, carrots, etc.) */
  CROP = 'crop',
  /** Mined ore resources (iron, copper, gold, etc.) */
  ORE = 'ore',
  /** Harvested wood from trees */
  WOOD = 'wood',
  /** Stone resources from mining */
  STONE = 'stone',
  /** Seeds for planting crops */
  SEED = 'seed',
  /** Custom furniture designed by player */
  FURNITURE = 'furniture',
  /** Decorative items */
  DECORATION = 'decoration',
  /** Tools for farming, mining, etc. */
  TOOL = 'tool',
}

/**
 * Inventory item representing a stack of resources
 * Items can be stacked if they have the same ID
 * All items have monetary value (sellValue for trading)
 */
export interface Item {
  /** Unique identifier for this item instance */
  id: string;
  /** Display name shown in UI */
  name: string;
  /** Item type determines behavior and properties */
  type: ItemType;
  /** Quantity in stack (can be > 1 for stackable items) */
  quantity: number;
  /** Coins earned when item is sold */
  sellValue: number;
  /** Reference to sprite/asset for rendering (emoji or image path) */
  spriteId: string;
  /** Item rarity affects value and availability */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

// ============================================================================
// FARMING SYSTEM - Crop planting and growth mechanics
// ============================================================================

/**
 * Crop growth stage progression
 * Crops advance through stages based on time and water level
 * Game loop calls updateCropGrowth() to progress stages
 */
export enum CropStage {
  /** Stage 0: Seed just planted, not yet sprouted (0-0.3 days) */
  SEED = 0,
  /** Stage 1: Seedling sprouting from soil (0.3-0.6 days) */
  SPROUTING = 1,
  /** Stage 2: Growing but not yet mature (0.6-1.2 days) */
  GROWING = 2,
  /** Stage 3: Mature, soon to be harvestable (1.2 to type-dependent days) */
  MATURE = 3,
  /** Stage 4: Ready to harvest, full yield available */
  HARVESTABLE = 4,
  /** Stage 5: Dead crop, cannot be harvested (waterLevel < 20 or health < 30) */
  DEAD = 5,
}

/**
 * Active crop growing in a farm plot
 * Tracks growth progression, health, and water level
 * Removed when harvested or dies
 */
export interface Crop {
  /** Unique identifier for this crop */
  id: string;
  /** Crop type ('wheat', 'carrot', 'tomato', 'corn', etc.) */
  type: string;
  /** Current growth stage (SEED through HARVESTABLE) */
  stage: CropStage;
  /** Grid position where crop is planted */
  position: Vector2D;
  /** Timestamp when crop was planted (Date.now()) */
  plantedTime: number;
  /** How many of this crop were harvested (optional) */
  harvestedQuantity?: number;
  /** Water level 0-100 (decreases each day, increases with watering) */
  waterLevel: number;
  /** Health 0-100 (decreases each day without water, increases with care) */
  health: number;
}

/**
 * Farm plot for planting crops
 * Plots must be tilled before crops can be planted
 * Can contain at most one crop at a time
 */
export interface FarmPlot {
  /** Unique identifier for this plot */
  id: string;
  /** Grid position where plot is located */
  position: Vector2D;
  /** Physical size of plot in grid units (usually 1x1) */
  size: Vector2D;
  /** Currently growing crop (if any) */
  crop?: Crop;
  /** Whether plot has been tilled (ready for planting) */
  tilled: boolean;
  /** Timestamp when plot was tilled */
  tilledAt?: number;
}

// ============================================================================
// BUILDING SYSTEM - Structures and customization
// ============================================================================

/**
 * Building placed on the farm map
 * Buildings provide functionality, aesthetics, and progression
 * Can be customized with colors and textures
 */
export interface Building {
  /** Unique identifier for this building instance */
  id: string;
  /** Building type ('barn', 'house', 'silo', 'coop', etc.) */
  type: string;
  /** 3D position for isometric rendering (z for depth layering) */
  position: Vector3D;
  /** Rotation angle in degrees (0-360) */
  rotation: number;
  /** Whether building is unlocked and functional */
  unlocked: boolean;
  /** Upgrade level of building (affects functionality) */
  level: number;
  /** Reference to building sprite/asset for rendering */
  spriteId: string;
  /** Optional customization data (colors, patterns, drawings) */
  customization?: FurnitureCustomization;
}

/**
 * Customization data for buildings and furniture
 * Allows players to personalize appearance and modify properties
 * Can store canvas drawing data or reference custom assets
 */
export interface FurnitureCustomization {
  /** Primary color (hex) used in building appearance */
  primaryColor: string;
  /** Secondary color (hex) for accents and details */
  secondaryColor: string;
  /** Pattern type ('solid', 'stripes', 'plaid', etc.) */
  pattern?: string;
  /** Raw canvas image data from drawing system */
  drawingData?: CanvasImageData;
  /** Reference to custom texture asset path */
  customTexture?: string;
}

// ============================================================================
// MINING & RESOURCE EXTRACTION - Underground resources
// ============================================================================

/**
 * Underground ore deposit
 * Ore deposits are finite and deplete with mining
 * Yield random quantities per mining action
 */
export interface OreDeposit {
  /** Unique identifier for this deposit */
  id: string;
  /** Grid position where deposit is located */
  position: Vector2D;
  /** Depth level (1-5, affects ore type and difficulty) */
  depth: number;
  /** Type of ore ('iron', 'copper', 'gold', 'diamond', etc.) */
  oreType: string;
  /** Remaining ore quantity (resource pool) */
  quantity: number;
  /** Durability 0-100 (decreases with mining, removed when 0) */
  durability: number;
  /** Timestamp of last mining action */
  lastMinedAt?: number;
}

/**
 * Wood source (tree) on the farm
 * Trees can be harvested once, then regrow over time
 * Provides wood resource for building and crafting
 */
export interface WoodSource {
  /** Unique identifier for this tree */
  id: string;
  /** Grid position where tree is located */
  position: Vector2D;
  /** Tree type ('oak', 'pine', 'birch', 'palm', etc.) */
  treeType: string;
  /** Health 0-100 (must be >= 50 to harvest) */
  health: number;
  /** Timestamp of last harvest */
  lastHarvestedAt?: number;
  /** Time in milliseconds until tree fully regrows (5 days) */
  regrowthTime: number;
}

// ============================================================================
// PLAYER PROGRESSION - Character stats and progression
// ============================================================================

/**
 * Player character state
 * Tracks player progress, inventory, skills, and achievements
 * Persisted with game save data
 */
export interface PlayerState {
  /** Unique identifier for player */
  id: string;
  /** Player's chosen name */
  name: string;
  /** Overall level (increases with experience) */
  level: number;
  /** Total experience points (used to calculate level) */
  experience: number;
  /** Wallet balance (earned from selling crops/ore/wood) */
  coins: number;
  /** Player's inventory (stacked items) */
  inventory: Item[];
  /** Set of unlocked features by featureId */
  unlocks: Set<string>;
  /** Specialization levels tracking skill progress */
  stats: {
    /** Farming skill level (improved by planting/harvesting) */
    farmingLevel: number;
    /** Building skill level (improved by placing structures) */
    buildingLevel: number;
    /** Digging/mining skill level (improved by mining ore) */
    diggingLevel: number;
    /** Total playtime in milliseconds */
    total_play_time: number;
  };
}

// ============================================================================
// WORLD STATE - Complete game world definition
// ============================================================================

/**
 * Complete game world
 * Contains all entities, terrain, and game state
 * Serialized for save/load functionality
 */
export interface GameWorld {
  /** Unique identifier for this game world */
  id: string;
  /** Timestamp when world was created (Date.now()) */
  createdAt: number;
  /** Timestamp of last play session (updated on save) */
  lastPlayedAt: number;
  /** Current season (affects crops, weather, resources) */
  season: Season;
  /** Minutes elapsed in current day (0-1440) */
  dayTime: number;
  /** Total days elapsed since world creation */
  totalDaysPlayed: number;
  /** Player character state */
  player: PlayerState;
  /** All farm plots with growing crops */
  farmPlots: FarmPlot[];
  /** All buildings and structures */
  buildings: Building[];
  /** All ore deposits available for mining */
  oreDeposits: OreDeposit[];
  /** All trees available for harvesting */
  woodSources: WoodSource[];
  /** Grid locations that have been tilled */
  tilledLand: Vector2D[];
  /** Map expansions (future feature) */
  expansions: GameExpansion[];
  /** Available land expansions for purchase */
  landExpansions: LandExpansion[];
  /** Total map dimensions in grid units */
  mapSize: Vector2D;
  /** Current weather type affecting the farm */
  currentWeather: WeatherType;
  /** Active weather events currently affecting the farm */
  activeWeatherEvents: WeatherEvent[];
  /** Dam buildings for flood protection */
  damBuildings: DamBuilding[];
  /** Timestamp of last weather event */
  lastWeatherEventTime: number;
}

// ============================================================================
// EXPANSION SYSTEM - Future map expansions
// ============================================================================

/**
 * Game world expansion area
 * Additional maps that can be unlocked as the player progresses
 * Each expansion has unique theme, resources, and challenges
 */
export interface GameExpansion {
  /** Unique identifier for expansion */
  id: string;
  /** Display name of expansion area */
  name: string;
  /** Whether expansion has been unlocked */
  unlocked: boolean;
  /** Timestamp when unlocked (if applicable) */
  unlockedAt?: number;
  /** Player level required to unlock */
  requiredLevel: number;
  /** Map offset from main farm */
  mapOffset: Vector2D;
  /** Size of expansion map */
  mapSize: Vector2D;
  /** Visual theme ('forest', 'mountain', 'beach', 'desert', 'sky') */
  theme: 'forest' | 'mountain' | 'beach' | 'desert' | 'sky';
}

// ============================================================================
// LAND EXPANSION SYSTEM - Land purchasing and map expansion
// ============================================================================

/**
 * Land expansion available for purchase
 * Players can buy adjacent plots to expand their farm
 * Each expansion increases available building space
 */
export interface LandExpansion {
  /** Unique identifier for this expansion plot */
  id: string;
  /** Display name for this expansion */
  name: string;
  /** Grid position where expansion is located */
  position: Vector2D;
  /** Size of expansion in grid units */
  size: Vector2D;
  /** Cost in coins to purchase this expansion */
  cost: number;
  /** Player level required to unlock this expansion */
  requiredLevel: number;
  /** Whether this expansion has been purchased */
  purchased: boolean;
  /** Timestamp when expansion was purchased */
  purchasedAt?: number;
  /** Expansion type affects visual theme and available resources */
  type: 'grassland' | 'forest' | 'riverfront' | 'hillside';
  /** Description of what this expansion provides */
  description: string;
}

// ============================================================================
// GAME SETTINGS - User preferences and configuration
// ============================================================================

/**
 * Player game settings
 * Configurable preferences for audio, graphics, and gameplay
 * Persisted separately from game world
 */
export interface GameSettings {
  /** Background music volume (0-1 scale) */
  musicVolume: number;
  /** Sound effects volume (0-1 scale) */
  sfxVolume: number;
  /** Graphics rendering quality level */
  graphicsQuality: 'low' | 'medium' | 'high';
  /** Allow crops to grow while app is closed (offline progress) */
  enableOfflineProgress: boolean;
  /** Disable analytics and telemetry (GDPR compliance) */
  privacyMode: boolean;
}

// ============================================================================
// ASSET MANAGEMENT - Sprite and animation system
// ============================================================================

/**
 * Sprite asset reference
 * Represents a game asset (image, emoji, animation) with metadata
 * Used for rendering crops, buildings, decorations, NPCs
 */
export interface SpriteAsset {
  /** Unique asset identifier */
  id: string;
  /** Human-readable asset name */
  name: string;
  /** Asset category (determines usage and rendering) */
  category: 'crop' | 'building' | 'decoration' | 'npc' | 'tile' | 'ui';
  /** Asset source (builtin emoji vs free/custom/AI) */
  source: 'builtin' | 'free' | 'custom' | 'ai_generated';
  /** Path to asset file or emoji reference */
  path: string;
  /** Number of animation frames (if animated) */
  animationFrames?: number;
  /** Whether asset has animation frames */
  isAnimated: boolean;
  /** Scale factor for rendering (1.0 = default size) */
  scale: number;
  /** Tags for categorization and search */
  tags: string[];
}

/**
 * Animation frame data
 * Defines how to render an animated sprite
 * Used for animating crops, buildings, NPCs
 */
export interface AnimationData {
  /** Width of each animation frame in pixels */
  frameWidth: number;
  /** Height of each animation frame in pixels */
  frameHeight: number;
  /** Total number of frames in animation */
  frameCount: number;
  /** Duration of each frame in milliseconds */
  frameDuration: number;
  /** Whether animation loops continuously */
  loop: boolean;
}
