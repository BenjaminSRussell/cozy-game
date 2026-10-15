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
export interface DamBuilding extends Omit<Building, 'type'> {
  /** Dam type affects protection capacity */
  type: 'small_dam' | 'medium_dam' | 'large_dam';
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
  /** Products from animals (milk, eggs, wool) */
  ANIMAL_PRODUCT = 'animal_product',
}

/**
 * Animal products (milk, eggs, wool)
 */
export enum AnimalProductType {
  EGG = 'egg',
  MILK = 'milk',
  WOOL = 'wool',
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
  /** Item quality (affects sell price and effect) */
  quality?: 'normal' | 'silver' | 'gold' | 'iridium';
}

/**
 * Sell-price multiplier for an item quality.
 * Missing quality and `'normal'` are the base rate.
 */
export function getQualityMultiplier(quality: Item['quality']): number {
  switch (quality) {
    case 'iridium': return 2.0;
    case 'gold': return 1.5;
    case 'silver': return 1.25;
    case 'normal':
    default: return 1.0; // undefined also falls here
  }
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

/** Crop type identifier string — matches the crop type field on Crop interface */
export type CropType = 'wheat' | 'carrot' | 'tomato' | 'corn' | 'potato' | 'apple' | 'lettuce' | 'onion' | 'garlic' | 'peppers' | 'pumpkin' | 'strawberries' | 'blueberries';

/** Tile type for the isometric grid world */
export type TileType =
  | 'grass'
  | 'grass_hole'
  | 'dirt'
  | 'water'
  | 'sand'
  | 'stone'
  | 'snow'
  | 'tilled_soil'
  | 'wet_soil'
  | 'path';

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
  /** Quality determined by fertilizer and player luck (calculated at harvest) */
  qualityPreference?: 'silver' | 'gold' | 'iridium';
  /** Whether the parent plot has fertilizer applied */
  fertilizerType?: 'speed' | 'quality' | 'water';
  /** Days the crop has been in the ground. A seed just planted is 0. */
  currentDaysGrown?: number;
  /** Fertilizer copied from the soil tile at planting. */
  fertilizer?: 'speed' | 'quality' | 'water';
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
  /** Whether plot has been tilled (ready for planting) */
  tilled: boolean;
  /** Timestamp when plot was tilled */
  tilledAt?: number;
  /** Type of fertilizer applied to this plot */
  fertilizerType?: 'speed' | 'quality' | 'water';
  /** Active crop growing in this plot; null once harvested */
  crop?: Crop | null;
}

// ============================================================================
// RANCHING SYSTEM - Livestock and animal products
// ============================================================================

/**
 * Animal on the farm
 * Animals produce products if fed and cared for
 */
export interface Animal {
  /** Unique identifier for this animal instance */
  id: string;
  /** Animal species ('chicken', 'cow', 'sheep') */
  type: 'chicken' | 'cow' | 'sheep';
  /** Human-readable name */
  name: string;
  /** Reference to building (Coop/Barn) they belong to */
  buildingId: string;
  /** Hunger level (0-100, 100 = full) */
  hunger: number;
  /** Affection/Friendship level (0-1000) */
  affection: number;
  /** Timestamp when animal was last fed */
  lastFedDay: number;
  /** Whether the animal has a product ready to be collected */
  hasProduct: boolean;
  /** Target or current grid position */
  position: Vector2D;
  /** Facing direction */
  rotation: number;
}

// ============================================================================
// BUILDING SYSTEM - Structures and customization
// ============================================================================

/**
 * Building placed on farm map
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
  /** Automation type for buildings that perform automated tasks */
  automationType?: 'sprinkler_basic' | 'sprinkler_quality' | 'sprinkler_iridium';
  /** Range/radius for automation effects (in tiles) */
  range?: number;
  /** Dimensions in grid units (width, height) used for multi-tile occupancy */
  dimensions?: Vector2D;
  /** Machine processing state for artisans/factories */
  machineState?: {
    processingItemId?: string;
    startTime?: number;
    duration?: number;
    outputItemId?: string;
    isFinished?: boolean;
  };
}

/**
 * Home building with unique benefits and progression system
 * Homes provide passive benefits and can be upgraded for enhanced effects
 */
export interface HomeBuilding extends Building {
  /** Home type determines benefits and progression path */
  homeType: HomeType;
  /** Type of benefit this home provides */
  benefitType: HomeBenefitType;
  /** Numerical value of the benefit (percentage, coins per day, etc.) */
  benefitValue: number;
  /** Current upgrade level (1-3) */
  upgradeLevel: number;
  /** Maximum upgrade level for this home type */
  maxUpgradeLevel: number;
  /** Daily coins generated (for coin_gen homes) */
  dailyCoinsGenerated?: number;
  /** Timestamp when benefits were last claimed */
  lastBenefitClaimed?: number;
  /** Whether this home is currently occupied/active */
  occupied: boolean;
  /** Required player level to purchase this home */
  requiredLevel: number;
  /** Base cost in coins */
  baseCost: number;
  /** Upgrade costs for each level */
  upgradeCosts: number[];
  /** Description of home benefits */
  description: string;
  /** Tier classification: starter, mid-tier, premium, special */
  tier: 'starter' | 'mid-tier' | 'premium' | 'special';
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
  /** Current fruit stage (0: none, 1: budding, 2: small, 3: ripe) */
  fruitStage?: number;
  /** Number of fruits currently on tree */
  fruitCount?: number;
  /** Type of fruit ('apple', 'orange', etc.) */
  fruitType?: string;
}

// ============================================================================
// PLAYER PROGRESSION - Character stats and progression
// ============================================================================

/**
 * Tool types available in the game
 */
export enum ToolType {
  HOE = 'hoe',
  AXE = 'axe',
  PICKAXE = 'pickaxe',
  WATERING_CAN = 'watering_can',
  SCYTHE = 'scythe'
}

/**
 * Tool material tiers affecting durability and efficiency
 */
export enum ToolTier {
  WOOD = 'wood',
  STONE = 'stone',
  IRON = 'iron',
  GOLD = 'gold',
  DIAMOND = 'diamond'
}

/**
 * Tool item extending base Item
 */
export interface Tool extends Item {
  type: ItemType.TOOL;
  toolType: ToolType;
  tier: ToolTier;
  /** Current durability (0-max) */
  durability: number;
  /** Maximum durability */
  maxDurability: number;
  /** Efficiency multiplier (1.0 = base) */
  efficiency: number;
}

/**
 * Recipe for crafting or upgrading items/tools
 */
export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, number>; // itemId -> quantity
  output: {
    type: 'item' | 'tool' | 'building';
    id: string; // itemId or toolType or buildingType
    toolTier?: ToolTier; // only if tool
    quantity?: number; // only if item, default 1
  };
  type: 'craft' | 'repair' | 'upgrade';
  cost: number; // coin cost
  requiredLevel: number;
}

// ============================================================================
// PLAYER PROGRESSION - Character stats and progression
// ============================================================================

/**
 * Player character state
 * Tracks player progress, inventory, skills, and achievements
 * Persisted with game save data
 */
export type PlayerAction = 'idle' | 'walk' | 'hoe' | 'water' | 'axe' | 'pickaxe';

/** Tool clip stored on PlayerState. The isometric screen still reads these fields. */
export interface PlayerActionAnimation {
  action: PlayerAction;
  frame: number;
  direction: number; // 0: SE, 1: SW, 2: NW, 3: NE (Isometric directions)
  isPlaying: boolean;
}

export type FacingDirection = 'north' | 'south' | 'east' | 'west';
export interface PlayerAnimationState {
  direction: FacingDirection;
  frameIndex: number;
  elapsedTime: number;
  frameDuration: number; // 0.15s per frame
  isMoving: boolean;
}

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
  stamina: number; // current, 0 to maxStamina
  maxStamina: number;
  staminaRegenRate: number;
  /** Set while stamina is empty. Sleep clears it. */
  isExhausted?: boolean;
  /** Total time played in seconds. Updated every minute by the time system. */
  playTime: number;
  /** Player's inventory (stacked items) */
  inventory: Item[];
  /** Currently equipped tools */
  tools: {
    [key in ToolType]?: Tool;
  };
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
  /** Current tool/action animation. Cardinal walk frames are not stored here. */
  animation: PlayerActionAnimation;
  /** Current world position */
  position: Vector3D;
  /** Target position for movement */
  targetPosition?: Vector3D;
  /** Facing direction (0-360 degrees or 0-3 iso index) */
  rotation: number;
  /** ID of the vehicle the player is currently mounting, if any */
  mountedVehicleId?: string;
}

export type RoadGrade = 'gravel' | 'paved';

export interface Road {
  id: string;
  type: 'dirt' | 'paved'; // Legacy, keeping for compatibility
  grade: RoadGrade;
  lanes: 1 | 2;
  position: Vector2D;
  /** Bitmask for connections: 1=Top, 2=Right, 4=Bottom, 8=Left */
  connections: number;
}

export interface Vehicle {
  id: string;
  type: 'tractor' | 'truck';
  position: Vector3D;
  rotation: number;
  speed: number;
  mountedBy?: string; // Player ID
}

/**
 * One shipping-bin row for the current day.
 * `gold` matches the coins added for this sale, with quality applied once.
 */
export interface ShippedTodayEntry {
  name: string;
  quantity: number;
  gold: number;
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
  /**
   * Sales recorded for the current day.
   * `gold` is the coins added for that sale. Cleared when the day rolls.
   */
  shippedToday: ShippedTodayEntry[];
  /** Player character state */
  player: PlayerState;
  /** All farm plots with growing crops */
  farmPlots: FarmPlot[];
  /** All buildings and structures */
  buildings: Building[];
  /** All home buildings with special benefits */
  homeBuildings: HomeBuilding[];
  /** All roads placed in the world */
  roads: Road[];
  /** All vehicles present in the world */
  vehicles: Vehicle[];
  /** All ore deposits available for mining */
  oreDeposits: OreDeposit[];
  /** All trees available for harvesting */
  woodSources: WoodSource[];
  /** All animals on the farm */
  animals: Animal[];
  /** Grid locations that have been tilled */
  tilledLand: Vector2D[];
  /** Map expansions (future feature) */
  expansions: GameExpansion[];
  /** Grass growth levels (0.0-1.0) indexed by "x,y" */
  grassGrowth: Record<string, number>;
  /** Available land expansions for purchase */
  landExpansions: LandExpansion[];
  /** Total map dimensions in grid units */
  mapSize: Vector2D;
  /** Current weather type affecting farm */
  currentWeather: WeatherType;
  /** Active weather events currently affecting farm */
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
  category: 'crop' | 'building' | 'decoration' | 'npc' | 'tile' | 'ui' | 'vehicle' | 'item';
  /** Asset source (builtin emoji vs free/custom/AI) */
  source: 'builtin' | 'free' | 'custom' | 'ai_generated';
  /** Path to asset file or emoji reference */
  path: any;
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

// ============================================================================
// TILE SYSTEM TYPES - For tile-based 2.5D rendering
// ============================================================================

/**
 * Building types for construction
 * Each building type has different functionality and requirements
 */
export type BuildingType = 'house' | 'barn' | 'silo' | 'coop' | 'greenhouse' | 'shed' | 'windmill' |
  'cottage' | 'ranch_house' | 'forest_cabin' | 'victorian_house' | 'farmhouse' | 'lake_house' |
  'mansion' | 'treehouse_estate' | 'beach_villa' | 'greenhouse_home' | 'windmill_residence' | 'wizard_tower';

/**
 * Home types with unique benefits and progression
 * Homes provide passive benefits and active abilities
 */
export type HomeType =
  | 'cottage'           // Starter: Boosts crop growth speed by 10%
  | 'ranch_house'       // Starter: Increases animal product value by 15%
  | 'forest_cabin'      // Starter: Reduces tree regrowth time by 20%
  | 'victorian_house'   // Mid-tier: Daily coin generation (50 coins/day)
  | 'farmhouse'         // Mid-tier: Stores more crops, reduces spoilage
  | 'lake_house'        // Mid-tier: Improves irrigation, reduces water needs
  | 'mansion'           // Premium: Significant daily coin generation (200 coins/day)
  | 'treehouse_estate'  // Premium: Boosts all nearby building efficiency
  | 'beach_villa'       // Premium: Attracts tourists (special events)
  | 'greenhouse_home'   // Special: Year-round growing regardless of season
  | 'windmill_residence' // Special: Generates free energy for tools
  | 'wizard_tower';     // Special: Magical crop bonuses and weather protection

/**
 * Home benefit types that determine what advantages a home provides
 */
export type HomeBenefitType =
  | 'crop_boost'         // Increases crop growth speed
  | 'coin_gen'          // Generates coins daily
  | 'storage'           // Increases storage capacity
  | 'weather_protection' // Protects from weather damage
  | 'irrigation'        // Reduces water needs
  | 'efficiency'        // Boosts nearby buildings
  | 'animal_boost'      // Increases animal product value
  | 'tree_boost'        // Reduces tree regrowth time
  | 'tourism'          // Attracts special events/tourists
  | 'season_override'   // Allows year-round growing
  | 'energy_gen'        // Provides free tool energy
  | 'magical_bonuses';  // Special magical benefits

/**
 * A fish on the line, waiting for the tension-bar mini-game to resolve.
 * Transient: the store leaves it out of saved data.
 */
export interface FishingBite {
  /** Species id, such as 'bass'. */
  fishType: string;
  /** Epoch ms when the bite started. Keys the mini-game so each bite starts from a fresh bar. */
  startedAt: number;
}
