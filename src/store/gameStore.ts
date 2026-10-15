import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  GameWorld,
  PlayerState,
  GameSettings,
  Crop,
  CropStage,
  FarmPlot,
  Building,
  HomeBuilding,
  Item,
  ItemType,
  OreDeposit,
  WoodSource,
  Season,
  LandExpansion,
  WeatherType,
  WeatherEvent,
  DamBuilding,
  Vector2D,
  Vector3D,
  HomeType,
  HomeBenefitType,
  Tool,
  ToolType,
  ToolTier,
  CraftingRecipe,
  PlayerAction,
  PlayerAnimationState,
  Animal,
  Road,
  RoadGrade,
  Vehicle,
  ShippedTodayEntry,
  getQualityMultiplier,
} from '../types/game';
import { RoadSystem } from '../systems/RoadSystem';
import { EXHAUSTED_MESSAGE, liveIsometricRenderers, playerIsExhausted } from '../rendering/IsometricRenderer';
import { consumeCraftingInputs, hasCraftingInputs } from './craftingInputs';

export const createTool = (
  type: ToolType | `${ToolType}`,
  tier: ToolTier | `${ToolTier}`,
): Tool => {
  const toolType = type as ToolType;
  const toolTier = tier as ToolTier;
  /**
   * Tool durability by tier. Gold is a soft metal with low durability and high efficiency.
   * Wood 50: utility starter. Stone 100: first upgrade. Iron 250: professional.
   * Gold 100: magic efficiency. Diamond 1000: endgame.
   */
  const baseDurability = {
    [ToolTier.WOOD]: 50,
    [ToolTier.STONE]: 100,
    [ToolTier.IRON]: 250,
    [ToolTier.GOLD]: 100,
    [ToolTier.DIAMOND]: 1000,
  }[toolTier];

  /**
   * Efficiency multiplier affects actions per second.
   * Wood 1.0, Stone 1.2, Iron 1.5, Gold 2.0, Diamond 3.0.
   * Gold's 2.0 efficiency is intentional between Iron 1.5 and Diamond 3.0.
   */
  const efficiency = {
    [ToolTier.WOOD]: 1.0,
    [ToolTier.STONE]: 1.2,
    [ToolTier.IRON]: 1.5,
    [ToolTier.GOLD]: 2.0,
    [ToolTier.DIAMOND]: 3.0,
  }[toolTier];

  return {
    id: `tool_${type}_${tier}`,
    name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}`,
    type: ItemType.TOOL,
    toolType,
    tier: toolTier,
    durability: baseDurability,
    maxDurability: baseDurability,
    efficiency,
    quantity: 1,
    sellValue: 0,
    spriteId: `tool_${type}_${tier}`,
    rarity: 'common'
  };
};

/**
 * Apply one tool swing.
 * At 0 durability the matching inventory entry is removed and the store's
 * existing console notice reports the break once. Equipped tools stay at 0
 * so a later swing cannot spend them again.
 */
function consumeToolDurability(
  player: PlayerState,
  tool: Tool,
  cost = 1,
): { tools: PlayerState['tools']; inventory: Item[] } {
  const durability = Math.max(0, tool.durability - cost);
  const worn: Tool = { ...tool, durability };
  const inventory = durability <= 0
    ? player.inventory.filter((item) => item.id !== tool.id)
    : player.inventory.map((item) => (
      item.id === tool.id ? { ...item, durability } : item
    ));

  if (durability <= 0) {
    showNotification(`Your ${tool.name} broke!`);
  }

  return {
    tools: { ...player.tools, [tool.toolType]: worn },
    inventory,
  };
}

/** Player-facing notices in this store. Not a second notification channel. */
function showNotification(message: string): void {
  console.log(message);
}

/**
 * Heavy tool swings stop at empty stamina.
 * Returns the next state when the swing is refused, otherwise null.
 * Sets `isExhausted` the first time stamina is empty.
 */
function rejectExhaustedSwing<T extends { world: GameWorld | null }>(
  state: T,
): { world: GameWorld } | null {
  const world = state.world;
  if (!world || !playerIsExhausted(world.player)) return null;
  showNotification(EXHAUSTED_MESSAGE);
  if (world.player.isExhausted === true) return { world };
  return {
    world: {
      ...world,
      player: { ...world.player, isExhausted: true },
    },
  };
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // STONE TIER UPGRADES
  {
    id: 'upgrade_hoe_stone',
    name: 'Stone Hoe',
    description: 'Sturdier hoe for detailed work.',
    inputs: { 'wood': 25, 'stone': 15 },
    output: { type: 'tool', id: ToolType.HOE, toolTier: ToolTier.STONE },
    type: 'upgrade',
    cost: 200,
    requiredLevel: 2
  },
  {
    id: 'upgrade_axe_stone',
    name: 'Stone Axe',
    description: 'Chops wood faster.',
    inputs: { 'wood': 30, 'stone': 20 },
    output: { type: 'tool', id: ToolType.AXE, toolTier: ToolTier.STONE },
    type: 'upgrade',
    cost: 200,
    requiredLevel: 2
  },
  {
    id: 'upgrade_pickaxe_stone',
    name: 'Stone Pickaxe',
    description: 'Mines ore with ease.',
    inputs: { 'wood': 20, 'stone': 30 },
    output: { type: 'tool', id: ToolType.PICKAXE, toolTier: ToolTier.STONE },
    type: 'upgrade',
    cost: 200,
    requiredLevel: 2
  },
  {
    id: 'upgrade_water_stone',
    name: 'Stone Can',
    description: 'Durable watering can.',
    inputs: { 'stone': 40 },
    output: { type: 'tool', id: ToolType.WATERING_CAN, toolTier: ToolTier.STONE },
    type: 'upgrade',
    cost: 200,
    requiredLevel: 2
  },
  // IRON TIER UPGRADES
  {
    id: 'upgrade_hoe_iron',
    name: 'Iron Hoe',
    description: 'Professional farming tool.',
    inputs: { 'wood': 50, 'iron': 10 },
    output: { type: 'tool', id: ToolType.HOE, toolTier: ToolTier.IRON },
    type: 'upgrade',
    cost: 1000,
    requiredLevel: 5
  },
  // AUTOMATION - SPRINKLERS
  {
    id: 'craft_sprinkler_basic',
    name: 'Basic Sprinkler',
    description: 'Waters adjacent 4 tiles daily.',
    inputs: { 'copper': 5, 'iron': 3 },
    output: { type: 'building', id: 'sprinkler_basic' },
    type: 'craft',
    cost: 500,
    requiredLevel: 3
  },
  {
    id: 'craft_sprinkler_quality',
    name: 'Quality Sprinkler',
    description: 'Waters 8 surrounding tiles daily.',
    inputs: { 'iron': 5, 'gold': 3 },
    output: { type: 'building', id: 'sprinkler_quality' },
    type: 'craft',
    cost: 1500,
    requiredLevel: 6
  },
  // PROCESSING MACHINES
  {
    id: 'craft_preserves_jar',
    name: 'Preserves Jar',
    description: 'Turns fruit into jam and vegetables into pickles.',
    inputs: { 'wood': 50, 'stone': 40, 'iron': 8 },
    output: { type: 'building', id: 'preserves_jar' },
    type: 'craft',
    cost: 1000,
    requiredLevel: 4
  },
  {
    id: 'craft_keg',
    name: 'Keg',
    description: 'Brews beverages from fruits and vegetables.',
    inputs: { 'wood': 30, 'copper': 5, 'iron': 1, 'ore_iron': 1 }, // Placeholder resin as iron ore for now
    output: { type: 'building', id: 'keg' },
    type: 'craft',
    cost: 2500,
    requiredLevel: 8
  },
  // FERTILIZERS
  {
    id: 'craft_fertilizer_speed',
    name: 'Speed-Grow',
    description: 'Increases crop growth speed by 50%.',
    inputs: { 'wood': 20, 'stone': 10 },
    output: { type: 'item', id: 'fertilizer_speed', quantity: 5 },
    type: 'craft',
    cost: 100,
    requiredLevel: 2
  },
  {
    id: 'craft_fertilizer_quality',
    name: 'Quality Fertilizer',
    description: 'Improves chance for higher quality crops.',
    inputs: { 'iron': 2, 'stone': 20 },
    output: { type: 'item', id: 'fertilizer_quality', quantity: 5 },
    type: 'craft',
    cost: 150,
    requiredLevel: 4
  },
  {
    id: 'craft_fertilizer_water',
    name: 'Water Retaining Soil',
    description: 'Reduces water consumption by 50%.',
    inputs: { 'stone': 30 },
    output: { type: 'item', id: 'fertilizer_water', quantity: 5 },
    type: 'craft',
    cost: 80,
    requiredLevel: 3
  },
  // BUILDINGS - GARAGE
  {
    id: 'craft_garage',
    name: 'Garage',
    description: 'A cozy spot for your tractor. Protects it from the elements.',
    inputs: { 'wood': 100, 'stone': 50, 'iron': 10 },
    output: { type: 'building', id: 'garage' },
    type: 'craft',
    cost: 5000,
    requiredLevel: 2
  }
];


/**
 * Game Store Interface - Complete state management for Cozy Haven
 *
 * Manages all game state including world, player, farming, buildings, mining, and settings.
 * Uses Zustand with devtools and persist middleware for state management and persistence.
 * All state mutations are immutable and atomic (single set() call completes entire operation).
 */
interface GameStore {
  // ============================================================================
  // WORLD STATE
  // ============================================================================

  /** The complete game world instance containing all entities, players, and environment */
  world: GameWorld | null;

  /** User-configurable game settings (audio volumes, graphics quality, etc.) */
  settings: GameSettings;

  /**
   * Next suffix for `vehicle_${type}_${n}` ids.
   * Also stamped on the world so the cozy_save blob keeps the sequence.
   */
  nextVehicleId: number;

  // ============================================================================
  // WORLD ACTIONS - Game creation, loading, and persistence
  // ============================================================================

  /**
   * Create a new game with initial world
   * @param playerName - Name of the player character
   */
  createNewGame: (playerName: string) => void;

  /**
   * Load an existing game world from storage
   * @param worldId - ID of the world to load
   */
  loadGame: (worldId: string) => void;

  /**
   * Save current game state to persistent storage
   * Updates world.lastPlayedAt timestamp
   */
  saveGame: () => Promise<void>;

  // ============================================================================
  // TIME & PROGRESSION - Day/night cycle, seasons, and game time
  // ============================================================================

  /**
   * Advance game time by specified minutes
   * Updates crop growth, health decay, and water consumption
   * Handles day transitions and updates crop stages
   * @param minutes - Number of game minutes to advance (0.1 = real-time movement)
   */
  advanceTime: (minutes: number) => void;

  /**
   * Advance to the next season (spring → summer → autumn → winter → spring)
   * Affects crop growth rates and available resources
   */
  advanceSeason: () => void;

  /**
   * Get current hour of the day (0-23)
   * @returns Hour value from dayTime (dayTime / 60)
   */
  getCurrentHour: () => number;

  /**
   * Get current minute of the hour (0-59)
   * @returns Minute value from dayTime (dayTime % 60)
   */
  getCurrentMinute: () => number;

  // ============================================================================
  // INVENTORY MANAGEMENT - Item storage and tracking
  // ============================================================================

  /**
   * Add an item to player inventory
   * Stacks with existing items of the same ID or creates new stack
   * @param item - Item to add with quantity
   */
  addItem: (item: Item) => void;

  /**
   * Remove items from inventory
   * Returns false and changes nothing when the item is missing or the stack is smaller than quantity.
   * Removes the stack when the quantities match, otherwise replaces it with a lower quantity.
   * @param itemId - ID of item to remove
   * @param quantity - Number to remove (default: 1)
   */
  removeItem: (itemId: string, quantity?: number) => boolean;

  /**
   * Get a specific inventory item by ID
   * @param itemId - ID of item to retrieve
   * @returns Item if found, undefined otherwise
   */
  getInventoryItem: (itemId: string) => Item | undefined;

  // ============================================================================
  // FARMING SYSTEM - Crop planting, growth, and harvesting
  // ============================================================================

  /**
   * Create a new farm plot on the map
   * Plots start in tilled state and ready for crop planting
   * @param position - Grid coordinates {x, y} where plot is placed
   */
  createFarmPlot: (position: { x: number; y: number }) => void;

  /**
   * Plant a crop in a farm plot
   * Empty plots and dead crops accept a new seed. A living crop is left unchanged.
   * Initializes crop with SEED stage, full water and health
   * @param plotId - ID of the farm plot
   * @param cropType - Type of crop ('wheat', 'carrot', 'tomato', 'corn')
   */
  plantCrop: (plotId: string, cropType: string) => void;

  /**
   * Plant one seed packet on a soil tile.
   * Untilled or occupied tiles return without spending a seed.
   * A season outside that seed's crop data toasts and does not spend a seed.
   * removeItem spends one seed; a false return does not plant.
   * The sprout starts at stage 0 with currentDaysGrown 0 and the tile's fertilizer.
   * @param tileX - Tile column
   * @param tileY - Tile row
   * @param seedItemId - Inventory id of the seed packet
   */
  plantSeed: (tileX: number, tileY: number, seedItemId: string) => void;

  /**
   * Harvest a mature crop
   * Only works if crop stage is HARVESTABLE
   * Adds harvested items to inventory and clears plot
   * @param plotId - ID of the farm plot containing crop
   */
  harvestCrop: (plotId: string) => void;

  /**
   * Water a crop to replenish water level
   * Increases water level by 50 (max 100)
   * Improves crop health and growth rate
   * @param plotId - ID of the farm plot containing crop
   */
  waterCrop: (plotId: string) => void;

  /**
   * Update crop growth based on elapsed time
   * Called regularly from game loop to progress crops through growth stages
   * Advances stages based on days elapsed and water level thresholds
   * @param deltaTime - Elapsed time in seconds since last update
   */
  updateCropGrowth: (deltaTime: number) => void;

  // ============================================================================
  // BUILDING & PLACEMENT - Structures on the farm
  // ============================================================================

  /**
   * Place a new building on the map
   * Buildings can be customized and are persistent
   * @param building - Building object with position, type, and dimensions
   */
  placeBuilding: (building: Building) => void;

  /**
   * Remove a building from the map
   * Completely deletes the building and clears that map space
   * @param buildingId - ID of building to remove
   */
  removeBuilding: (buildingId: string) => void;

  /**
   * Customize a placed building with custom data/appearance
   * Allows players to modify building properties after placement
   * @param buildingId - ID of building to customize
   * @param customization - Any custom data object to store
   */
  customizeBuilding: (buildingId: string, customization: any) => void;

  // ============================================================================
  // MINING & DIGGING - Underground resource extraction
  // ============================================================================

  /**
   * Create an ore deposit at a location
   * Deposits are finite and deplete with mining (durability-based)
   * @param position - Grid coordinates {x, y} where deposit is placed
   * @param oreType - Type of ore ('iron', 'copper', 'gold', 'diamond', etc.)
   * @param depth - Depth level of deposit (affects difficulty/quality)
   */
  createOreDeposit: (position: { x: number; y: number }, oreType: string, depth: number) => void;

  /**
   * Mine ore from a deposit
   * Decreases deposit durability by 10 per mining action
   * Removes deposit when durability reaches 0
   * Adds ore to player inventory
   * @param depositId - ID of ore deposit to mine
   */
  mineOre: (depositId: string) => void;

  // ============================================================================
  // WOOD HARVESTING - Tree resources
  // ============================================================================

  /**
   * Create a wood source (tree) on the map
   * Trees regenerate after set regrowth time
   * @param position - Grid coordinates {x, y} where tree is placed
   * @param treeType - Type of tree ('oak', 'pine', 'birch', etc.)
   */
  createWoodSource: (position: { x: number; y: number }, treeType: string) => void;

  /**
   * Harvest wood from a tree
   * Tree must have health >= 50 to harvest
   * Sets tree health to 0 and records harvest time for regrowth
   * Adds wood to player inventory
   * @param sourceId - ID of wood source to harvest
   */
  harvestWood: (sourceId: string) => void;

  // ============================================================================
  // PLAYER PROGRESSION - Experience and unlocks
  // ============================================================================

  /**
   * Add experience points to player
   * Player levels up every 1000 XP (level = Math.floor(xp / 1000) + 1)
   * @param amount - Amount of experience to add
   */
  addExperience: (amount: number) => void;

  /**
   * Add coins to player wallet
   * Used for buying seeds, tools, and decorations
   * @param amount - Number of coins to add
   */
  addCoins: (amount: number) => void;

  /**
   * Unlock a feature for the player
   * Features are stored as a Set for quick lookup
   * @param featureId - ID of feature to unlock ('furniture_designer', 'advanced_mining', etc.)
   */
  unlockFeature: (featureId: string) => void;

  // ============================================================================
  // LAND EXPANSION - Purchasing and managing land
  // ============================================================================

  /**
   * Purchase a land expansion
   * Only works if player has enough coins and meets level requirement
   * Deducts cost from player coins and marks expansion as purchased
   * @param expansionId - ID of the land expansion to purchase
   */
  purchaseLandExpansion: (expansionId: string) => void;

  /**
   * Get available land expansions for purchase
   * Returns expansions that haven't been purchased yet
   * @returns Array of available land expansions
   */
  getAvailableLandExpansions: () => LandExpansion[];

  /**
   * Get purchased land expansions
   * Returns expansions that the player has bought
   * @returns Array of purchased land expansions
   */
  getPurchasedLandExpansions: () => LandExpansion[];

  // ============================================================================
  // WEATHER SYSTEM - Droughts, floods, and protection
  // ============================================================================

  /**
   * Trigger a weather event
   * Creates weather events that affect crops based on probability and season
   * @param weatherType - Type of weather to trigger
   * @param severity - Severity level (1-5)
   * @param center - Center position of affected area
   * @param radius - Radius of affected area
   */
  triggerWeatherEvent: (weatherType: WeatherType, severity: number, center: Vector2D, radius: number) => void;

  /**
   * Update active weather events
   * Called from game loop to process weather effects and expire old events
   * @param deltaTime - Time elapsed since last update in seconds
   */
  updateWeatherEvents: (deltaTime: number) => void;

  /**
   * Build a dam for flood protection
   * Multi-block structure that protects crops from flood damage
   * @param dam - Dam building object with position and properties
   */
  buildDam: (dam: DamBuilding) => void;
  // Natural Simulation
  advanceNature: () => void;

  /**
   * Remove a dam building
   * @param damId - ID of dam to remove
   */
  removeDam: (damId: string) => void;

  /**
   * Check if a position is protected by dams
   * Returns protection level based on nearby dams
   * @param position - Position to check for protection
   * @returns Protection level (0-5, 0 = no protection)
   */
  getFloodProtection: (position: Vector2D) => number;

  /**
   * Apply weather damage to crops
   * Called during weather events to damage crops based on type and severity
   * @param weatherEvent - Active weather event
   */
  applyWeatherDamage: (weatherEvent: WeatherEvent) => void;

  // ============================================================================
  // HOME SYSTEM - Purchase, upgrade, and manage homes with benefits
  // ============================================================================

  /**
   * Purchase a new home building
   * Checks level requirements and coin cost before placing
   * @param homeType - Type of home to purchase
   * @param position - Grid position where home will be placed
   */
  purchaseHome: (homeType: HomeType, position: Vector3D) => void;

  /**
   * Upgrade an existing home to next level
   * Increases benefits and unlocks new features
   * @param homeId - ID of home to upgrade
   */
  upgradeHome: (homeId: string) => void;

  /**
   * Claim daily benefits from a home
   * Collects coins, applies passive bonuses
   * @param homeId - ID of home to claim benefits from
   */
  claimHomeBenefits: (homeId: string) => void;

  /**
   * Get available homes for purchase based on player level
   * Returns homes that meet level requirements
   * @returns Array of available home types with data
   */
  getAvailableHomes: () => Array<{
    homeType: HomeType;
    requiredLevel: number;
    baseCost: number;
    description: string;
    tier: string;
    benefitType: HomeBenefitType;
    benefitValue: number;
  }>;

  /**
   * Get all owned homes and their current status
   * @returns Array of owned homes with benefit info
   */
  getOwnedHomes: () => HomeBuilding[];

  /**
   * Calculate total active benefits from all homes
   * Returns combined effects of all owned homes
   * @returns Object with total bonus values
   */
  getTotalHomeBenefits: () => {
    cropGrowthBonus: number;
    dailyCoinGeneration: number;
    storageBonus: number;
    weatherProtection: number;
    irrigationBonus: number;
    efficiencyBonus: number;
  };

  /**
   * Remove a home building
   * @param homeId - ID of home to remove
   */
  removeHome: (homeId: string) => void;

  // ============================================================================
  // MARKETPLACE SYSTEM - Sell crops, ore, and items
  // ============================================================================

  /**
   * Sell harvestable crops from farm plots.
   * Each crop sold appends one shippedToday row. Row gold sums to the coins added.
   * @param plotIds - Array of plot IDs to harvest and sell
   * @returns Total coins earned from selling crops
   */
  sellHarvestableCrops: (plotIds: string[]) => number;

  /**
   * Sell items from inventory.
   * On success, appends one shippedToday row whose gold equals the coins added.
   * A failed removal returns 0 and appends nothing.
   * @param itemId - ID of item to sell
   * @param quantity - Quantity to sell
   * @returns Total coins earned from selling items
   */
  sellInventoryItem: (itemId: string, quantity: number) => number;

  /**
   * Get current market prices for all items
   * @returns Current market prices with demand multipliers
   */
  getMarketPrices: () => { [key: string]: { basePrice: number; currentPrice: number; demandMultiplier: number } };

  /**
   * Update market prices based on supply and demand
   */
  updateMarketPrices: () => void;

  /**
   * Get sellable items from farm and inventory
   * @returns Array of sellable items with current prices
   */
  getSellableItems: () => Array<{
    id: string;
    name: string;
    type: 'crop' | 'ore' | 'wood';
    quantity: number;
    currentPrice: number;
    quality?: number;
  }>;

  /**
   * Update game settings
   * Only specified settings are updated, others remain unchanged
   * @param newSettings - Partial settings object with values to update
   */
  updateSettings: (newSettings: Partial<GameSettings>) => void;

  // ============================================================================
  // CRAFTING & ANIMATIONS
  // ============================================================================

  /**
   * Craft an item or upgrade a tool
   * @param recipeId - ID of the recipe to craft
   */
  craftItem: (recipeId: string) => void;

  /**
   * Repair a tool's durability
   * @param toolType - Type of tool to repair
   */
  repairTool: (toolType: ToolType) => void;

  /**
   * Start processing an item in a machine
   * @param buildingId - ID of the machine building
   * @param itemId - ID of the item to process
   */
  processItem: (buildingId: string, itemId: string) => void;

  /**
   * Collect the output from a finished machine
   * @param buildingId - ID of the machine building
   */
  collectMachineOutput: (buildingId: string) => void;

  /**
   * Apply fertilizer to the crop on the plot at a grid cell.
   * The cell is compared to Math.floor of the plot position, not the plot id.
   * @param position - Grid cell of the plot
   * @param fertilizerType - Fertilizer to store on the plot
   */
  applyFertilizer: (position: Vector2D, fertilizerType: 'speed' | 'quality' | 'water') => void;

  /**
   * Purchase an animal
   * @param type - Animal species
   * @param buildingId - Building to house the animal
   */
  buyAnimal: (type: 'chicken' | 'cow' | 'sheep', buildingId: string) => void;

  /**
   * Interact with an animal
   * @param animalId - ID of animal
   * @param action - Care action ('pet' or 'feed')
   */
  careForAnimal: (animalId: string, action: 'pet' | 'feed') => void;

  /**
   * Collect product from an animal
   * @param animalId - ID of animal
   */
  collectAnimalProduct: (animalId: string) => void;

  /**
   * Set player animation state
   * @param action - Current player action ('idle', 'walk', etc.)
   */
  setPlayerAnimation: (action: PlayerAction) => void;


  // ============================================================================
  // TRANSPORTATION SYSTEM
  // ============================================================================

  buildRoad: (position: Vector2D, grade?: RoadGrade, lanes?: 1 | 2) => void;
  upgradeRoad: (position: Vector2D) => void;
  spawnVehicle: (type: 'tractor' | 'truck', position: Vector3D) => void;
  mountVehicle: (vehicleId: string) => void;
  dismountVehicle: () => void;
  /**
   * Sleep clears exhaustion.
   * Stamina returns to max, or half of max after passing out.
   */
  sleep: (passedOut?: boolean) => void;
  /** Copy empty stamina onto `player.isExhausted`. */
  syncExhaustion: () => void;
  movePlayer: (position: Vector3D) => void;
}

/**
 * Default game settings applied to all new games
 * - Music volume: 70% (0-1 scale)
 * - SFX volume: 80% (0-1 scale)
 * - Graphics quality: High detail rendering
 * - Offline progress: Crops grow while app is closed
 * - Privacy mode: Disable analytics (for GDPR compliance)
 */
const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  graphicsQuality: 'high',
  enableOfflineProgress: true,
  privacyMode: false,
};

/**
 * Create initial game world for a new player
 *
 * Initializes:
 * - Player character with starting stats (level 1, 500 coins, empty inventory)
 * - Empty farm (no plots, buildings, or resources)
 * - 100x100 grid map size
 * - Spring season start
 * - 6 AM (dayTime = 360 minutes from midnight)
 * - Available land expansions for purchase
 *
 * @param playerName - Name for the player character
 * @returns Newly initialized GameWorld object ready for gameplay
 */
const createInitialWorld = (playerName: string): GameWorld => {
  // Create initial land expansions available for purchase
  const initialLandExpansions: LandExpansion[] = [
    {
      id: 'expansion_1',
      name: 'East Meadow',
      position: { x: 10, y: 0 },
      size: { x: 10, y: 10 },
      cost: 500,
      requiredLevel: 2,
      purchased: false,
      type: 'grassland',
      description: 'Fertile grassland perfect for crops',
    },
    {
      id: 'expansion_2',
      name: 'Forest Edge',
      position: { x: 0, y: 10 },
      size: { x: 10, y: 10 },
      cost: 750,
      requiredLevel: 3,
      purchased: false,
      type: 'forest',
      description: 'Wooded area with valuable timber',
    },
    {
      id: 'expansion_3',
      name: 'Riverfront',
      position: { x: 10, y: 10 },
      size: { x: 10, y: 10 },
      cost: 1000,
      requiredLevel: 4,
      purchased: false,
      type: 'riverfront',
      description: 'Waterfront property for irrigation',
    },
    {
      id: 'expansion_4',
      name: 'Hillside Plot',
      position: { x: 20, y: 0 },
      size: { x: 15, y: 15 },
      cost: 1500,
      requiredLevel: 5,
      purchased: false,
      type: 'hillside',
      description: 'Elevated land with scenic views',
    },
  ];

  const startingTools = {
    [ToolType.HOE]: createTool(ToolType.HOE, ToolTier.WOOD),
    [ToolType.WATERING_CAN]: createTool(ToolType.WATERING_CAN, ToolTier.WOOD),
    [ToolType.AXE]: createTool(ToolType.AXE, ToolTier.WOOD),
    [ToolType.PICKAXE]: createTool(ToolType.PICKAXE, ToolTier.WOOD),
    [ToolType.SCYTHE]: createTool(ToolType.SCYTHE, ToolTier.WOOD),
  };

  return stampNextVehicleId({
    id: `world_${Date.now()}`,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    season: 'spring',
    dayTime: 360, // 6 AM
    totalDaysPlayed: 0,
    shippedToday: [],
    player: {
      id: `player_${Date.now()}`,
      name: playerName,
      level: 1,
      experience: 0,
      coins: 3000, // Starting currency for testing ranching
      stamina: 100,
      maxStamina: 100,
      staminaRegenRate: 0,
      isExhausted: false,
      playTime: 0,
      inventory: [
        {
          id: 'item_hay_starting',
          name: 'Hay',
          type: ItemType.CROP,
          quantity: 50,
          sellValue: 5,
          spriteId: 'hay',
          rarity: 'common'
        }
      ],
      tools: startingTools,
      unlocks: new Set(),
      stats: {
        farmingLevel: 1,
        buildingLevel: 1,
        diggingLevel: 1,
        total_play_time: 0,
      },
      animation: {
        action: 'idle',
        frame: 0,
        direction: 0,
        isPlaying: false
      },
      position: { x: 50, y: 50, z: 1 },
      rotation: 0
    },
    farmPlots: [],
    buildings: [
      {
        id: 'starting_garage',
        type: 'garage',
        position: { x: 55, y: 45, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: 'building_garage'
      }
    ],
    homeBuildings: [], // Initialize empty home buildings array
    roads: [],
    vehicles: [
      {
        id: 'starting_tractor',
        type: 'tractor',
        position: { x: 55, y: 45, z: 1.1 }, // Parked at the garage
        rotation: 90, // Default to West
        speed: 2.0
      }
    ],
    oreDeposits: [],
    woodSources: [],
    animals: [],
    tilledLand: [],
    expansions: [],
    grassGrowth: {}, // Start with empty growth (clean slate)
    landExpansions: initialLandExpansions,
    mapSize: { x: 100, y: 100 }, // Grid units
    currentWeather: 'normal',
    activeWeatherEvents: [],
    damBuildings: [],
    lastWeatherEventTime: 0,
  }, 0);
};

/** `cozy_save_*` JSON keeps own fields that are not on GameWorld. */
type WorldWithVehicleCounter = GameWorld & { nextVehicleId?: number };

function stampNextVehicleId(world: GameWorld, nextVehicleId: number): GameWorld {
  (world as WorldWithVehicleCounter).nextVehicleId = nextVehicleId;
  return world;
}

/**
 * Next id to issue. Prefers the saved counter, then one past any
 * `vehicle_${type}_${n}` already in the world, so a load cannot reuse 0.
 */
function readNextVehicleId(world: GameWorld | null | undefined): number {
  if (!world) return 0;
  const stamped = (world as WorldWithVehicleCounter).nextVehicleId;
  let next = typeof stamped === 'number' && Number.isFinite(stamped) ? Math.max(0, stamped) : 0;
  for (const vehicle of world.vehicles ?? []) {
    const match = /^vehicle_(?:tractor|truck)_(\d+)$/.exec(vehicle.id);
    if (!match) continue;
    const after = Number(match[1]) + 1;
    if (after > next) next = after;
  }
  return next;
}

/** `isMounted` is stored on the vehicle object; Vehicle itself has no field for it. */
type VehicleWithMount = Vehicle & { isMounted: boolean };

function withMountState(vehicle: Vehicle, isMounted: boolean, mountedBy: string | undefined): Vehicle {
  const next: VehicleWithMount = { ...vehicle, isMounted, mountedBy };
  return next;
}

/** Soil cell carried on the world. movePlayer reads the same optional tiles list. */
type SoilTile = {
  position: Vector2D;
  state?: string;
  type?: string;
  walkable?: boolean;
  fertilizer?: Crop['fertilizer'];
  crop?: Crop | null;
};

type WorldWithTiles = GameWorld & { tiles?: readonly SoilTile[] | null };

function readSoilTiles(world: GameWorld): readonly SoilTile[] | undefined {
  const tiles = (world as WorldWithTiles).tiles;
  if (!Array.isArray(tiles)) return undefined;
  return tiles;
}

function isTilledSoil(tile: SoilTile): boolean {
  const soil = tile.state ?? tile.type;
  return soil === 'tilled_dry' || soil === 'tilled_wet';
}

function nextShippedToday(
  world: GameWorld,
  rows: readonly ShippedTodayEntry[],
): ShippedTodayEntry[] {
  const previous = Array.isArray(world.shippedToday) ? world.shippedToday : [];
  if (rows.length === 0) return previous;
  return [...previous, ...rows];
}

/**
 * Crop id and seasons for seed packets that already exist.
 * Same ids and seasons as SEED_PACKETS and the rendering CropSystem configs.
 */
function seedCropData(seedItemId: string): { type: string; seasons: readonly Season[] } | undefined {
  switch (seedItemId) {
    case 'wheat_seeds':
      return { type: 'wheat', seasons: ['spring', 'summer', 'autumn'] };
    case 'carrot_seeds':
      return { type: 'carrot', seasons: ['spring', 'summer', 'autumn'] };
    case 'tomato_seeds':
      return { type: 'tomato', seasons: ['spring', 'summer', 'autumn'] };
    case 'corn_seeds':
      return { type: 'corn', seasons: ['spring', 'summer'] };
    default:
      return undefined;
  }
}

/**
 * Cozy Haven Game Store Hook
 *
 * Central state management for all game logic using Zustand.
 * Features:
 * - Devtools middleware for browser debugging and time-travel
 * - Persist middleware for automatic localStorage persistence
 * - Immutable state updates (atomic, all-or-nothing)
 * - Type-safe actions with complete TypeScript coverage
 *
 * Usage:
 * ```typescript
 * const { world, createNewGame, plantCrop } = useGameStore();
 * createNewGame('PlayerName');
 * plantCrop(plotId, 'wheat');
 * ```
 *
 * State is automatically persisted to 'cozy-haven-storage' key in localStorage
 * and available for debugging in Redux DevTools browser extension.
 */
export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        world: null,
        settings: DEFAULT_SETTINGS,
        nextVehicleId: 0,

        // ========================================================================
        // WORLD ACTIONS
        // ========================================================================

        createNewGame: (playerName: string) => {
          const newWorld = createInitialWorld(playerName);
          set({ world: newWorld, nextVehicleId: 0 });
        },

        loadGame: async (worldId: string) => {
          // Load from PersistenceManager if available
          // Note: PersistenceManager instance should be passed from App.tsx
          // For now, this is a placeholder that will be called from App.tsx
          // where PersistenceManager is available
          set({ world: null });
        },

        saveGame: async () => {
          const { world, nextVehicleId } = get();
          if (!world) return;

          // Update timestamp. Stamp the counter on the world so PersistenceManager
          // writes it into cozy_save_${worldId} without a new storage key.
          world.lastPlayedAt = Date.now();
          const counter = Math.max(nextVehicleId, readNextVehicleId(world));
          stampNextVehicleId(world, counter);
          set({ world, nextVehicleId: counter });

          // Note: Actual persistence is handled by PersistenceManager
          // which is called from App.tsx after state update
          // Cloud save can be triggered via PersistenceManager.syncToCloud()
        },

        // ========================================================================
        // TIME & PROGRESSION ACTIONS
        // ========================================================================

        advanceTime: (minutes: number) => {
          set((state) => {
            if (!state.world) return state;

            const newDayTime = (state.world.dayTime + minutes) % 1440;
            const daysAdvanced = Math.floor((state.world.dayTime + minutes) / 1440);

            // Update crop growth based on time advancement
            const updatedWorld = { ...state.world, dayTime: newDayTime };

            const newDaysPlayed = state.world.totalDaysPlayed + daysAdvanced;
            if (newDaysPlayed > state.world.totalDaysPlayed) {
              updatedWorld.totalDaysPlayed = newDaysPlayed;
              // The tally belongs to the day that just ended. Same-day advances keep it.
              updatedWorld.shippedToday = [];

              // NEW DAY LOGIC
              get().advanceNature(); // Simulate nature growth

              // Reset animal products and hunger
              if (updatedWorld.animals) {
                updatedWorld.animals = updatedWorld.animals.map(a => ({
                  ...a,
                  hasProduct: false, // Reset product status for new day
                  hunger: Math.max(0, a.hunger - 20) // Daily hunger decay
                }));
              }
            }
            // RUN AUTOMATION - Sprinklers water crops
            const sprinklers = updatedWorld.buildings.filter(b => b.automationType?.startsWith('sprinkler'));
            const wateredPlots = new Set<string>();

            sprinklers.forEach(sprinkler => {
              const range = sprinkler.automationType === 'sprinkler_basic' ? 1 :
                sprinkler.automationType === 'sprinkler_quality' ? 1 : 2;
              const pattern = sprinkler.automationType === 'sprinkler_basic' ? 'cross' : 'square';

              // Find plots in range
              updatedWorld.farmPlots.forEach(plot => {
                const dx = Math.abs(plot.position.x - sprinkler.position.x);
                const dy = Math.abs(plot.position.y - sprinkler.position.y);

                let inRange = false;
                if (pattern === 'cross') {
                  // Basic: only cardinal directions (N, S, E, W)
                  inRange = (dx === 0 && dy <= range) || (dy === 0 && dx <= range);
                } else {
                  // Quality/Iridium: all tiles in square
                  inRange = dx <= range && dy <= range;
                }

                if (inRange && plot.crop) {
                  wateredPlots.add(plot.id);
                }
              });
            });

            updatedWorld.farmPlots = updatedWorld.farmPlots.map((plot) => {
              if (!plot.crop) return plot;

              const crop = plot.crop;
              const healthDecay = 0.05;

              // Fertilizer logic
              const speedFactor = plot.fertilizerType === 'speed' ? 1.5 : 1.0;
              const waterRetainFactor = plot.fertilizerType === 'water' ? 0.5 : 1.0;

              // Apply sprinkler watering
              const wasWatered = wateredPlots.has(plot.id);
              const newWaterLevel = wasWatered ? 100 : Math.max(0, crop.waterLevel - (10 * daysAdvanced * waterRetainFactor));

              return {
                ...plot,
                watered: wasWatered,
                crop: {
                  ...crop,
                  health: Math.max(0, crop.health - healthDecay * daysAdvanced),
                  waterLevel: newWaterLevel,
                  stage:
                    crop.health < 30
                      ? CropStage.DEAD
                      : newWaterLevel < 20
                        ? crop.stage
                        : Math.min(CropStage.HARVESTABLE, crop.stage + (0.1 * daysAdvanced * speedFactor)) as any,
                },
              };
            });

            // Update machine processing
            if (updatedWorld.buildings) {
              updatedWorld.buildings = updatedWorld.buildings.map((building) => {
                if (!building.machineState || !building.machineState.processingItemId || building.machineState.isFinished) {
                  return building;
                }

                const newState = { ...building.machineState };
                const remaining = (newState.duration || 0) - minutes;

                if (remaining <= 0) {
                  return {
                    ...building,
                    machineState: {
                      ...newState,
                      duration: 0,
                      isFinished: true
                    }
                  };
                }

                return {
                  ...building,
                  machineState: {
                    ...newState,
                    duration: remaining
                  }
                };
              });
            }

            // Update animals
            if (updatedWorld.animals) {
              updatedWorld.animals = updatedWorld.animals.map((animal) => {
                let newState = { ...animal };

                // Hunger decay (approx 20% per day, so 20/1440 per minute)
                newState.hunger = Math.max(0, newState.hunger - (20 / 1440) * minutes);

                // AI movement (random walk near building)
                const building = updatedWorld.buildings.find(b => b.id === animal.buildingId);
                if (building && Math.random() < 0.05 * (minutes / 10)) { // Scale movement with time jump
                  const dx = (Math.random() - 0.5) * 4;
                  const dy = (Math.random() - 0.5) * 4;
                  newState.position = {
                    x: Math.max(building.position.x - 3, Math.min(building.position.x + 3, newState.position.x + dx)),
                    y: Math.max(building.position.y - 3, Math.min(building.position.y + 3, newState.position.y + dy))
                  };
                  newState.rotation = dx > 0 ? 0 : 180;
                }

                // Product generation (once per day jump)
                if (daysAdvanced > 0 && newState.hunger > 20 && !newState.hasProduct) {
                  const produceChance = 0.4 + (newState.affection / 2000);
                  if (Math.random() < produceChance) {
                    newState.hasProduct = true;
                  }
                }

                return newState;
              });
            }

            return { world: updatedWorld };
          });
        },

        advanceSeason: () => {
          set((state) => {
            if (!state.world) return state;
            const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
            const currentIndex = seasons.indexOf(state.world.season);
            const nextSeason = seasons[(currentIndex + 1) % seasons.length];

            return {
              world: {
                ...state.world,
                season: nextSeason,
              },
            };
          });
        },

        getCurrentHour: () => {
          const { world } = get();
          return world ? Math.floor(world.dayTime / 60) : 0;
        },

        getCurrentMinute: () => {
          const { world } = get();
          return world ? world.dayTime % 60 : 0;
        },

        // ========================================================================
        // INVENTORY MANAGEMENT ACTIONS
        // ========================================================================

        addItem: (item: Item) => {
          set((state) => {
            if (!state.world) return state;

            const previous = state.world.player.inventory;
            const existingIndex = previous.findIndex((entry) => entry.id === item.id);
            const inventory = existingIndex === -1
              ? [...previous, { ...item }]
              : previous.map((entry, index) =>
                index === existingIndex
                  ? { ...entry, quantity: entry.quantity + item.quantity }
                  : entry,
              );

            return {
              world: {
                ...state.world,
                player: { ...state.world.player, inventory },
              },
            };
          });
        },

        removeItem: (itemId: string, quantity = 1): boolean => {
          let removed = false;
          set((state) => {
            if (!state.world) return state;

            const previous = state.world.player.inventory;
            const index = previous.findIndex((entry) => entry.id === itemId);
            if (index === -1) return state;

            const item = previous[index];
            if (item.quantity < quantity) return state;

            const inventory = item.quantity === quantity
              ? previous.filter((_, entryIndex) => entryIndex !== index)
              : previous.map((entry, entryIndex) =>
                entryIndex === index
                  ? { ...entry, quantity: entry.quantity - quantity }
                  : entry,
              );

            removed = true;
            return {
              world: {
                ...state.world,
                player: { ...state.world.player, inventory },
              },
            };
          });
          return removed;
        },

        getInventoryItem: (itemId: string) => {
          const { world } = get();
          return world?.player.inventory.find((item) => item.id === itemId);
        },

        // ========================================================================
        // FARMING SYSTEM ACTIONS
        // ========================================================================

        createFarmPlot: (position) => {
          set((state) => {
            if (!state.world) return state;
            const exhausted = rejectExhaustedSwing(state);
            if (exhausted) return exhausted;

            // Check for Hoe
            const tools = state.world.player.tools;
            const hoe = tools[ToolType.HOE];

            if (!hoe) {
              console.log("No hoe equipped!");
              return state;
            }

            // Till soil. A hoe already at 0 cannot swing again.
            if (hoe.durability <= 0) return state;

            const worn = consumeToolDurability(state.world.player, hoe);

            const newPlot: FarmPlot = {
              id: `plot_${Date.now()}`,
              position,
              size: { x: 1, y: 1 },
              tilled: true,
              tilledAt: Date.now(),
            };

            return {
              world: {
                ...state.world,
                farmPlots: [...state.world.farmPlots, newPlot],
                player: {
                  ...state.world.player,
                  tools: worn.tools,
                  inventory: worn.inventory,
                },
              },
            };
          });
        },

        plantCrop: (plotId: string, cropType: string) => {
          const occupied = get().world?.farmPlots.find((plot) => plot.id === plotId);
          // Living crops stay. Dead crops are removed and replaced below.
          if (occupied?.crop && occupied.crop.stage !== CropStage.DEAD) {
            console.log("This plot already has a crop!");
            return;
          }

          set((state) => {
            if (!state.world) return state;

            const updatedPlots = state.world.farmPlots.map((plot) => {
              if (plot.id !== plotId) return plot;
              if (plot.crop && plot.crop.stage !== CropStage.DEAD) return plot;

              const crop: Crop = {
                id: `crop_${Date.now()}`,
                type: cropType,
                stage: CropStage.SEED,
                position: plot.position,
                plantedTime: Date.now(),
                waterLevel: 100,
                health: 100,
              };

              return { ...plot, crop };
            });

            return { world: { ...state.world, farmPlots: updatedPlots } };
          });
        },

        plantSeed: (tileX: number, tileY: number, seedItemId: string) => {
          const world = get().world;
          if (!world) return;

          const tiles = readSoilTiles(world);
          const tile = tiles?.find((entry) => entry.position.x === tileX && entry.position.y === tileY);
          if (!tile || !isTilledSoil(tile) || tile.crop) return;

          const currentSeason = world.season;
          const cropData = seedCropData(seedItemId);
          if (!cropData) return;
          if (!cropData.seasons.includes(currentSeason)) {
            showNotification('Cannot plant in this season!');
            return;
          }

          if (!get().removeItem(seedItemId, 1)) return;

          const planted: Crop = {
            id: `crop_${tileX}_${tileY}_${Date.now()}`,
            type: cropData.type,
            stage: CropStage.SEED,
            position: { x: tileX, y: tileY },
            plantedTime: Date.now(),
            waterLevel: 100,
            health: 100,
            currentDaysGrown: 0,
            fertilizer: tile.fertilizer,
          };

          set((state) => {
            if (!state.world) return state;
            const currentTiles = readSoilTiles(state.world);
            if (!currentTiles) return state;

            let placed = false;
            const nextTiles = currentTiles.map((entry) => {
              if (placed) return entry;
              if (entry.position.x !== tileX || entry.position.y !== tileY) return entry;
              if (!isTilledSoil(entry) || entry.crop) return entry;
              placed = true;
              return { ...entry, crop: planted };
            });
            if (!placed) return state;

            const nextWorld: WorldWithTiles = { ...state.world, tiles: nextTiles };
            return { world: nextWorld };
          });
        },

        harvestCrop: (plotId: string) => {
          set((state) => {
            if (!state.world) return state;

            const plot = state.world.farmPlots.find((p) => p.id === plotId);
            if (!plot || plot.crop === null || plot.crop === undefined) return state;
            if (plot.crop.stage !== CropStage.HARVESTABLE) return state;

            const player = state.world.player;
            const crop = plot.crop;

            // Determine base sell value
            const baseSellValues: { [key: string]: number } = {
              wheat: 10,
              carrot: 12,
              tomato: 15,
              corn: 20,
            };
            const baseValue = baseSellValues[crop.type] || 10;

            // Quality Logic
            // Chance for higher quality increases with level
            const roll = Math.random();
            const levelBonus = player.level * 0.02;
            const fertilizerBonus = plot.fertilizerType === 'quality' ? 0.2 : 0;
            const totalBonus = levelBonus + fertilizerBonus;

            let quality: 'normal' | 'silver' | 'gold' | 'iridium' = 'normal';

            if (roll < 0.05 + totalBonus / 2 && player.level >= 10) {
              quality = 'iridium';
            } else if (roll < 0.15 + totalBonus) {
              quality = 'gold';
            } else if (roll < 0.4 + totalBonus) {
              quality = 'silver';
            }

            // Yield logic - influenced by health
            const yieldCount = Math.floor(2 + (crop.health / 50));

            // Add harvested crop to inventory
            const harvestedItem: Item = {
              id: `harvest_${crop.type}_${quality}_${Date.now()}`,
              name: `${crop.type.charAt(0).toUpperCase() + crop.type.slice(1)} (${quality !== 'normal' ? quality : 'Normal'})`,
              type: ItemType.CROP,
              quantity: yieldCount,
              sellValue: baseValue,
              spriteId: crop.type,
              rarity: quality === 'iridium' ? 'legendary' : quality === 'gold' ? 'rare' : quality === 'silver' ? 'uncommon' : 'common',
              quality: quality,
            };

            // Add item to inventory (stacking logic check)
            let newInventory = [...player.inventory];
            const existingIndex = newInventory.findIndex(i => i.id === harvestedItem.id);

            if (existingIndex >= 0) {
              newInventory[existingIndex] = {
                ...newInventory[existingIndex],
                quantity: newInventory[existingIndex].quantity + yieldCount
              };
            } else {
              newInventory.push(harvestedItem);
            }

            const updatedPlots = state.world.farmPlots.map((p) =>
              p.id === plotId ? { ...p, crop: null, fertilizerType: undefined } : p,
            );

            return {
              world: {
                ...state.world,
                farmPlots: updatedPlots,
                player: {
                  ...player,
                  inventory: newInventory,
                },
              },
            };
          });
        },

        waterCrop: (plotId: string) => {
          const plot = get().world?.farmPlots.find((entry) => entry.id === plotId);
          if (plot?.crop?.stage === CropStage.DEAD) return;

          set((state) => {
            if (!state.world) return state;
            const exhausted = rejectExhaustedSwing(state);
            if (exhausted) return exhausted;

            // Check for Watering Can
            const tools = state.world.player.tools;
            const can = tools[ToolType.WATERING_CAN];

            if (!can || can.durability <= 0) {
              console.log("No watering can or empty!");
              return state;
            }

            const worn = consumeToolDurability(state.world.player, can);

            const updatedPlots = state.world.farmPlots.map((plot) => {
              if (plot.id !== plotId || !plot.crop) return plot;
              return {
                ...plot,
                crop: { ...plot.crop, waterLevel: Math.min(100, plot.crop.waterLevel + 30) },
              };
            });

            return {
              world: {
                ...state.world,
                farmPlots: updatedPlots,
                player: {
                  ...state.world.player,
                  tools: worn.tools,
                  inventory: worn.inventory,
                },
              },
            };
          });
        },

        updateCropGrowth: (deltaTime: number) => {
          // Called regularly from game loop to update crop growth progression
          // deltaTime in seconds - typically 0.016s at 60 FPS
          set((state) => {
            if (!state.world) return state;

            // Apply weather damage from active events
            state.world.activeWeatherEvents.forEach(event => {
              if (event.active) {
                state.applyWeatherDamage(event);
              }
            });

            const updatedPlots = state.world.farmPlots.map((plot) => {
              if (!plot.crop || plot.crop.stage === CropStage.DEAD) return plot;

              const timeSincePlanting = Date.now() - plot.crop.plantedTime;
              const daysElapsed = timeSincePlanting / (24 * 60 * 60 * 1000);

              // Growth progression based on crop type and days
              // Map crop types to growth days: wheat=3, carrot=2, tomato=4, corn=5
              const growthDays: { [key: string]: number } = {
                wheat: 3,
                carrot: 2,
                tomato: 4,
                corn: 5,
              };
              const cropGrowthDays = growthDays[plot.crop.type] || 3;
              const stageProgressionThresholds = [0, 0.3, 0.6, 1.2, cropGrowthDays];

              let newStage = CropStage.SEED;
              if (daysElapsed > stageProgressionThresholds[0] && plot.crop.waterLevel > 20) newStage = CropStage.SEED;
              if (daysElapsed > stageProgressionThresholds[1] && plot.crop.waterLevel > 20) newStage = CropStage.SPROUTING;
              if (daysElapsed > stageProgressionThresholds[2] && plot.crop.waterLevel > 20) newStage = CropStage.GROWING;
              if (daysElapsed > stageProgressionThresholds[3] && plot.crop.waterLevel > 20) newStage = CropStage.MATURE;
              if (daysElapsed > stageProgressionThresholds[4] && plot.crop.waterLevel > 20) newStage = CropStage.HARVESTABLE;

              return {
                ...plot,
                crop: {
                  ...plot.crop,
                  stage: Math.max(plot.crop.stage, newStage),
                },
              };
            });

            return { world: { ...state.world, farmPlots: updatedPlots } };
          });
        },

        // ========================================================================
        // BUILDING & PLACEMENT ACTIONS
        // ========================================================================

        placeBuilding: (building: Building) => {
          set((state) => {
            if (!state.world) return state;
            return {
              world: {
                ...state.world,
                buildings: [...state.world.buildings, building],
              },
            };
          });
        },

        removeBuilding: (buildingId: string) => {
          set((state) => {
            if (!state.world) return state;
            return {
              world: {
                ...state.world,
                buildings: state.world.buildings.filter((b) => b.id !== buildingId),
              },
            };
          });
        },

        customizeBuilding: (buildingId: string, customization: any) => {
          set((state) => {
            if (!state.world) return state;

            const updatedBuildings = state.world.buildings.map((b) =>
              b.id === buildingId ? { ...b, customization } : b,
            );

            return {
              world: {
                ...state.world,
                buildings: updatedBuildings,
              },
            };
          });
        },

        // ========================================================================
        // MINING & DIGGING ACTIONS
        // ========================================================================

        createOreDeposit: (position, oreType, depth) => {
          set((state) => {
            if (!state.world) return state;

            const deposit: OreDeposit = {
              id: `ore_${Date.now()}`,
              position,
              depth,
              oreType,
              quantity: Math.random() * 50 + 20,
              durability: 100,
            };

            return {
              world: {
                ...state.world,
                oreDeposits: [...state.world.oreDeposits, deposit],
              },
            };
          });
        },

        mineOre: (depositId: string) => {
          set((state) => {
            if (!state.world) return state;
            const exhausted = rejectExhaustedSwing(state);
            if (exhausted) return exhausted;

            // Check for Pickaxe
            const tools = state.world.player.tools;
            const pickaxe = tools[ToolType.PICKAXE];

            if (!pickaxe || pickaxe.durability <= 0) {
              console.log("No pickaxe!");
              return state;
            }

            const deposit = state.world.oreDeposits.find((d) => d.id === depositId);
            if (!deposit) return state;

            const durabilityCost = 1;
            const miningPower = 10 * pickaxe.efficiency;
            const worn = consumeToolDurability(state.world.player, pickaxe, durabilityCost);

            const oreItem: Item = {
              id: deposit.oreType, // Use consistent ID for stacking
              name: deposit.oreType,
              type: ItemType.ORE,
              quantity: Math.floor(Math.random() * 3) + 1,
              sellValue: 100,
              spriteId: deposit.oreType,
              rarity: 'uncommon',
            };

            const updatedDeposits = state.world.oreDeposits
              .map((d) =>
                d.id === depositId
                  ? { ...d, durability: d.durability - miningPower, lastMinedAt: Date.now() }
                  : d,
              )
              .filter((d) => d.durability > 0);

            return {
              world: {
                ...state.world,
                oreDeposits: updatedDeposits,
                player: {
                  ...state.world.player,
                  inventory: [...worn.inventory, oreItem],
                  tools: worn.tools,
                },
              },
            };
          });
        },

        // ========================================================================
        // WOOD HARVESTING ACTIONS
        // ========================================================================

        createWoodSource: (position, treeType) => {
          set((state) => {
            if (!state.world) return state;

            const source: WoodSource = {
              id: `wood_${Date.now()}`,
              position,
              treeType,
              health: 100,
              regrowthTime: 5 * 24 * 60 * 60 * 1000, // 5 days
            };

            return {
              world: {
                ...state.world,
                woodSources: [...state.world.woodSources, source],
              },
            };
          });
        },

        harvestWood: (sourceId: string) => {
          set((state) => {
            if (!state.world) return state;
            const exhausted = rejectExhaustedSwing(state);
            if (exhausted) return exhausted;

            // Check for Axe
            const tools = state.world.player.tools;
            const axe = tools[ToolType.AXE];

            if (!axe || axe.durability <= 0) {
              console.log("No axe!");
              return state;
            }

            const source = state.world.woodSources.find((w) => w.id === sourceId);
            if (!source || source.health < 50) return state;

            const worn = consumeToolDurability(state.world.player, axe);

            const woodItem: Item = {
              id: `wood_${Date.now()}`,
              name: 'Wood',
              type: ItemType.WOOD,
              quantity: 3 * Math.floor(axe.efficiency),
              sellValue: 75,
              spriteId: 'wood',
              rarity: 'common',
            };

            const updatedSources = state.world.woodSources.map((w) =>
              w.id === sourceId ? { ...w, health: 0, lastHarvestedAt: Date.now() } : w,
            );

            return {
              world: {
                ...state.world,
                woodSources: updatedSources,
                player: {
                  ...state.world.player,
                  inventory: [...worn.inventory, woodItem],
                  tools: worn.tools,
                },
              },
            };
          });
        },

        // ========================================================================
        // PLAYER PROGRESSION ACTIONS
        // ========================================================================

        addExperience: (amount: number) => {
          set((state) => {
            if (!state.world) return state;
            const newExp = state.world.player.experience + amount;
            const newLevel = Math.floor(newExp / 1000) + 1;

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  experience: newExp,
                  level: newLevel,
                },
              },
            };
          });
        },

        addCoins: (amount: number) => {
          set((state) => {
            if (!state.world) return state;
            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins + amount,
                },
              },
            };
          });
        },

        unlockFeature: (featureId: string) => {
          set((state) => {
            if (!state.world) return state;
            // zustand persist writes a Set as {}, so a world restored from it has no Set.
            const unlocks = state.world.player.unlocks instanceof Set
              ? state.world.player.unlocks
              : new Set<string>();
            unlocks.add(featureId);
            return { world: { ...state.world, player: { ...state.world.player, unlocks } } };
          });
        },

        // ========================================================================
        // LAND EXPANSION ACTIONS
        // ========================================================================

        purchaseLandExpansion: (expansionId: string) => {
          set((state) => {
            if (!state.world) return state;

            const expansion = state.world.landExpansions.find(e => e.id === expansionId);
            if (!expansion || expansion.purchased) return state;

            // Check if player meets requirements
            if (state.world.player.coins < expansion.cost) return state;
            if (state.world.player.level < expansion.requiredLevel) return state;

            // Purchase the expansion
            const updatedExpansions = state.world.landExpansions.map(e =>
              e.id === expansionId
                ? { ...e, purchased: true, purchasedAt: Date.now() }
                : e
            );

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - expansion.cost,
                },
                landExpansions: updatedExpansions,
              },
            };
          });
        },

        getAvailableLandExpansions: () => {
          const { world } = get();
          if (!world) return [];
          return world.landExpansions.filter(expansion => !expansion.purchased);
        },

        getPurchasedLandExpansions: () => {
          const { world } = get();
          if (!world) return [];
          return world.landExpansions.filter(expansion => expansion.purchased);
        },

        // ========================================================================
        // WEATHER SYSTEM ACTIONS
        // ========================================================================

        triggerWeatherEvent: (weatherType: WeatherType, severity: number, center: Vector2D, radius: number) => {
          set((state) => {
            if (!state.world) return state;

            const weatherEvent: WeatherEvent = {
              id: `weather_${Date.now()}`,
              type: weatherType,
              startTime: Date.now(),
              duration: severity * 60000, // 1 minute per severity level
              severity,
              affectedArea: { center, radius },
              active: true,
            };

            return {
              world: {
                ...state.world,
                currentWeather: weatherType,
                activeWeatherEvents: [...state.world.activeWeatherEvents, weatherEvent],
                lastWeatherEventTime: Date.now(),
              },
            };
          });
        },

        updateWeatherEvents: (deltaTime: number) => {
          set((state) => {
            if (!state.world) return state;

            const now = Date.now();
            const activeEvents = state.world.activeWeatherEvents.filter(event => {
              if (now - event.startTime > event.duration) {
                return false; // Event expired
              }
              return true;
            });

            // Random weather chance (0.1% per second)
            if (Math.random() < 0.001 * deltaTime && state.world.lastWeatherEventTime < now - 300000) { // 5 minutes between events
              const weatherTypes: WeatherType[] = ['drought', 'flood', 'rain', 'storm'];
              const randomType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
              const randomSeverity = Math.floor(Math.random() * 3) + 1; // 1-3 severity
              const randomCenter = {
                x: Math.random() * state.world.mapSize.x,
                y: Math.random() * state.world.mapSize.y
              };
              const randomRadius = Math.random() * 20 + 10; // 10-30 units radius

              const newEvent: WeatherEvent = {
                id: `weather_${Date.now()}`,
                type: randomType,
                startTime: now,
                duration: randomSeverity * 60000,
                severity: randomSeverity,
                affectedArea: { center: randomCenter, radius: randomRadius },
                active: true,
              };

              activeEvents.push(newEvent);
            }

            return {
              world: {
                ...state.world,
                activeWeatherEvents: activeEvents,
                currentWeather: activeEvents.length > 0 ? activeEvents[activeEvents.length - 1].type : 'normal',
                lastWeatherEventTime: activeEvents.length > 0 ? now : state.world.lastWeatherEventTime,
              },
            };
          });
        },

        buildDam: (dam: DamBuilding) => {
          set((state) => {
            if (!state.world) return state;

            // Calculate protected areas based on dam position and size
            const protectedAreas: Vector2D[] = [];
            const damSize = dam.size.x * dam.size.y; // Total blocks
            const protectionRadius = Math.sqrt(damSize) * 3; // Protection radius based on dam size

            // Generate protected area grid
            for (let x = dam.position.x - protectionRadius; x <= dam.position.x + protectionRadius; x += 2) {
              for (let y = dam.position.y - protectionRadius; y <= dam.position.y + protectionRadius; y += 2) {
                const distance = Math.sqrt(Math.pow(x - dam.position.x, 2) + Math.pow(y - dam.position.y, 2));
                if (distance <= protectionRadius) {
                  protectedAreas.push({ x: Math.floor(x), y: Math.floor(y) });
                }
              }
            }

            const newDam: DamBuilding = {
              ...dam,
              protectedAreas,
              operational: true,
            };

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - 5000 // Dam cost
                },
                buildings: [...state.world.buildings, newDam]
              }
            };
          });
        },

        // ========================================================================
        // NATURE SIMULATION
        // ========================================================================

        advanceNature: () => {
          set((state) => {
            if (!state.world) return state;
            const world = state.world; // Local ref for type narrowing

            // 1. GRASS GROWTH & SPREADING
            const newGrassGrowth = { ...world.grassGrowth };
            const growthChance = 0.1;

            Object.entries(world.grassGrowth).forEach(([key, level]) => {
              if (level > 0.5 && Math.random() < growthChance) {
                const [x, y] = key.split(',').map(Number);
                const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
                neighbors.forEach(([nx, ny]) => {
                  const nKey = `${nx},${ny}`;
                  if (!newGrassGrowth[nKey]) {
                    if (nx >= 0 && nx < world.mapSize.x && ny >= 0 && ny < world.mapSize.y) {
                      newGrassGrowth[nKey] = 0.1;
                    }
                  }
                });
              }
              if (newGrassGrowth[key] < 1.0) {
                newGrassGrowth[key] = Math.min(1.0, newGrassGrowth[key] + 0.1);
              }
            });

            // Random growth
            for (let i = 0; i < 5; i++) {
              const rx = Math.floor(Math.random() * world.mapSize.x);
              const ry = Math.floor(Math.random() * world.mapSize.y);
              const rKey = `${rx},${ry}`;
              if (!newGrassGrowth[rKey]) newGrassGrowth[rKey] = 0.2;
            }

            // 2. TREE & FRUIT GROWTH
            const updatedWoodSources = world.woodSources.map(tree => {
              if (tree.health <= 0) return tree;

              let newFruitStage = tree.fruitStage || 0;
              let newFruitCount = tree.fruitCount || 0;

              if (Math.random() < 0.3) {
                if (newFruitStage < 3) {
                  newFruitStage++;
                } else {
                  newFruitCount = Math.min(5, newFruitCount + 1);
                }
              }

              return {
                ...tree,
                fruitStage: newFruitStage,
                fruitCount: newFruitCount,
                fruitType: 'apple'
              };
            });

            return {
              world: {
                ...world,
                grassGrowth: newGrassGrowth,
                woodSources: updatedWoodSources
              }
            };
          });
        },


        removeDam: (damId: string) => {
          set((state) => {
            if (!state.world) return state;

            return {
              world: {
                ...state.world,
                damBuildings: state.world.damBuildings.filter(dam => dam.id !== damId),
              },
            };
          });
        },

        getFloodProtection: (position: Vector2D) => {
          const { world } = get();
          if (!world) return 0;

          let maxProtection = 0;
          for (const dam of world.damBuildings) {
            if (!dam.operational) continue;

            // Check if position is within dam's protected areas
            const isProtected = dam.protectedAreas.some(protectedPos =>
              Math.abs(protectedPos.x - position.x) <= 1 && Math.abs(protectedPos.y - position.y) <= 1
            );

            if (isProtected) {
              maxProtection = Math.max(maxProtection, dam.protectionLevel);
            }
          }

          return maxProtection;
        },

        applyWeatherDamage: (weatherEvent: WeatherEvent) => {
          set((state) => {
            if (!state.world) return state;

            const updatedPlots = state.world.farmPlots.map(plot => {
              if (!plot.crop) return plot;

              // Check if plot is within weather event area
              const distance = Math.sqrt(
                Math.pow(plot.position.x - weatherEvent.affectedArea.center.x, 2) +
                Math.pow(plot.position.y - weatherEvent.affectedArea.center.y, 2)
              );

              if (distance > weatherEvent.affectedArea.radius) return plot;

              let damage = 0;
              let waterChange = 0;

              switch (weatherEvent.type) {
                case 'drought':
                  // Droughts increase water consumption and damage health
                  waterChange = -weatherEvent.severity * 15;
                  damage = weatherEvent.severity * 5;
                  break;
                case 'flood':
                  // Floods can destroy crops unless protected by dams
                  const protection = state.world?.damBuildings?.reduce((max, dam) => {
                    if (!dam.operational) return max;
                    const isProtected = dam.protectedAreas.some(protectedPos =>
                      Math.abs(protectedPos.x - plot.position.x) <= 1 &&
                      Math.abs(protectedPos.y - plot.position.y) <= 1
                    );
                    return isProtected ? Math.max(max, dam.protectionLevel) : max;
                  }, 0) || 0;

                  if (protection < weatherEvent.severity) {
                    damage = weatherEvent.severity * 20; // High damage from floods
                    waterChange = 50; // Floods add water but damage crops
                  } else {
                    waterChange = 20; // Protected crops get moderate water
                  }
                  break;
                case 'storm':
                  // Storms cause moderate damage and water changes
                  damage = weatherEvent.severity * 10;
                  waterChange = weatherEvent.severity * 5;
                  break;
                case 'rain':
                  // Rain is beneficial, adds water without damage
                  waterChange = weatherEvent.severity * 10;
                  damage = 0;
                  break;
              }

              return {
                ...plot,
                crop: {
                  ...plot.crop,
                  health: Math.max(0, plot.crop.health - damage),
                  waterLevel: Math.max(0, Math.min(100, plot.crop.waterLevel + waterChange)),
                  stage: plot.crop.health - damage < 30 ? CropStage.DEAD : plot.crop.stage,
                },
              };
            });

            return {
              world: {
                ...state.world,
                farmPlots: updatedPlots,
              },
            };
          });
        },

        // ========================================================================
        // MARKETPLACE ACTIONS
        // ========================================================================

        sellHarvestableCrops: (plotIds: string[]): number => {
          let totalEarnings = 0;

          set((state) => {
            if (!state.world) return state;

            // Simple fixed prices (1 buck per item)
            const pricePerCrop = 1;
            const batch: ShippedTodayEntry[] = [];
            let batchGold = 0;

            const updatedPlots = state.world.farmPlots.map(plot => {
              if (plotIds.includes(plot.id) && plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
                batchGold += pricePerCrop;
                batch.push({
                  name: plot.crop.type,
                  quantity: 1,
                  gold: pricePerCrop,
                });

                return {
                  ...plot,
                  crop: undefined,
                  tilledAt: Date.now(),
                  wateredAt: Date.now(),
                };
              }
              return plot;
            });

            totalEarnings += batchGold;

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins + batchGold,
                },
                farmPlots: updatedPlots,
                shippedToday: batch.length > 0
                  ? nextShippedToday(state.world, batch)
                  : state.world.shippedToday,
              },
            };
          });

          return totalEarnings;
        },

        buyAnimal: (type, buildingId) => {
          set((state) => {
            if (!state.world) return state;

            const building = state.world.buildings.find(b => b.id === buildingId);
            if (!building) return state;

            const cost = type === 'chicken' ? 800 : type === 'cow' ? 1500 : 2000;
            if (state.world.player.coins < cost) return state;

            const newAnimal: Animal = {
              id: `animal_${type}_${Date.now()}`,
              type,
              name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${state.world.animals ? state.world.animals.length + 1 : 1}`,
              buildingId,
              hunger: 100,
              affection: 0,
              lastFedDay: state.world.totalDaysPlayed,
              hasProduct: false,
              position: { x: building.position.x, y: building.position.y },
              rotation: 0
            };

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - cost
                },
                animals: [...(state.world.animals || []), newAnimal]
              }
            };
          });
        },

        careForAnimal: (animalId, action) => {
          set((state) => {
            if (!state.world || !state.world.animals) return state;

            let updatedAnimals = [...state.world.animals];
            const animalIdx = updatedAnimals.findIndex(a => a.id === animalId);
            if (animalIdx === -1) return state;

            const animal = updatedAnimals[animalIdx];

            if (action === 'pet') {
              updatedAnimals[animalIdx] = {
                ...animal,
                affection: Math.min(1000, animal.affection + 10)
              };
            } else if (action === 'feed') {
              // Check for hay in inventory
              const hayIdx = state.world.player.inventory.findIndex(i => i.spriteId === 'hay');
              if (hayIdx === -1) return state;

              const newInventory = [...state.world.player.inventory];
              if (newInventory[hayIdx].quantity > 1) {
                newInventory[hayIdx] = { ...newInventory[hayIdx], quantity: newInventory[hayIdx].quantity - 1 };
              } else {
                newInventory.splice(hayIdx, 1);
              }

              updatedAnimals[animalIdx] = {
                ...animal,
                hunger: 100,
                lastFedDay: state.world.totalDaysPlayed
              };

              return {
                world: {
                  ...state.world,
                  player: {
                    ...state.world.player,
                    inventory: newInventory
                  },
                  animals: updatedAnimals
                }
              };
            }

            return {
              world: {
                ...state.world,
                animals: updatedAnimals
              }
            };
          });
        },

        collectAnimalProduct: (animalId) => {
          set((state) => {
            if (!state.world || !state.world.animals) return state;

            const animal = state.world.animals.find(a => a.id === animalId);
            if (!animal || !animal.hasProduct) return state;

            const productType = animal.type === 'chicken' ? 'egg' : animal.type === 'cow' ? 'milk' : 'wool';
            const quality = animal.affection > 800 ? 'gold' : animal.affection > 400 ? 'silver' : 'normal';
            const value = productType === 'egg' ? 25 : productType === 'milk' ? 100 : 150;

            const productItem: Item = {
              id: `${productType}_${Date.now()}`,
              name: `${productType.charAt(0).toUpperCase() + productType.slice(1)} (${quality})`,
              type: ItemType.ANIMAL_PRODUCT,
              quantity: 1,
              sellValue: value,
              spriteId: productType,
              rarity: quality === 'gold' ? 'rare' : quality === 'silver' ? 'uncommon' : 'common',
              quality: quality as any
            };

            const newInventory = [...state.world.player.inventory];
            const existingIdx = newInventory.findIndex(i => i.spriteId === productItem.spriteId && i.quality === productItem.quality);
            if (existingIdx >= 0) {
              newInventory[existingIdx] = { ...newInventory[existingIdx], quantity: newInventory[existingIdx].quantity + 1 };
            } else {
              newInventory.push(productItem);
            }

            const updatedAnimals = state.world.animals.map(a =>
              a.id === animalId ? { ...a, hasProduct: false } : a
            );

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  inventory: newInventory
                },
                animals: updatedAnimals
              }
            };
          });
        },
        sellInventoryItem: (itemId: string, quantity: number) => {
          const item = get().world?.player.inventory.find((entry) => entry.id === itemId);
          const removed = get().removeItem(itemId, quantity);
          if (!item || !removed) return 0;

          const earnings = item.sellValue * getQualityMultiplier(item.quality) * quantity;
          set((state) => {
            if (!state.world) return state;
            return {
              world: {
                ...state.world,
                shippedToday: nextShippedToday(state.world, [
                  { name: item.name, quantity, gold: earnings },
                ]),
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins + earnings,
                },
              },
            };
          });
          return earnings;
        },

        getMarketPrices: () => {
          return {
            wheat: { basePrice: 50, currentPrice: 50, demandMultiplier: 1 },
            carrot: { basePrice: 40, currentPrice: 40, demandMultiplier: 1 },
            tomato: { basePrice: 60, currentPrice: 60, demandMultiplier: 1 },
            copper: { basePrice: 100, currentPrice: 100, demandMultiplier: 1 },
            iron: { basePrice: 150, currentPrice: 150, demandMultiplier: 1 },
            gold: { basePrice: 500, currentPrice: 500, demandMultiplier: 1 },
          };
        },

        updateMarketPrices: () => {
          // Future implementation: fluctuate prices
        },

        getSellableItems: () => {
          const { world } = get();
          if (!world) return [];

          return world.player.inventory.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type as 'crop' | 'ore' | 'wood',
            quantity: item.quantity,
            currentPrice: item.sellValue,
            quality: 1
          }));
        },

        // ========================================================================
        // HOME SYSTEM ACTIONS
        // ========================================================================

        purchaseHome: (homeType: HomeType, position: Vector3D) => {
          set((state) => {
            if (!state.world) return state;

            // Home configurations with benefits and costs
            const homeConfigs: { [key in HomeType]: {
              requiredLevel: number;
              baseCost: number;
              benefitType: HomeBenefitType;
              benefitValue: number;
              description: string;
              tier: 'starter' | 'mid-tier' | 'premium' | 'special';
              upgradeCosts: number[];
            } } = {
              cottage: {
                requiredLevel: 1,
                baseCost: 200,
                benefitType: 'crop_boost',
                benefitValue: 10,
                description: 'Boosts crop growth speed by 10%',
                tier: 'starter',
                upgradeCosts: [300, 500]
              },
              ranch_house: {
                requiredLevel: 1,
                baseCost: 250,
                benefitType: 'animal_boost',
                benefitValue: 15,
                description: 'Increases animal product value by 15%',
                tier: 'starter',
                upgradeCosts: [350, 600]
              },
              forest_cabin: {
                requiredLevel: 2,
                baseCost: 300,
                benefitType: 'tree_boost',
                benefitValue: 20,
                description: 'Reduces tree regrowth time by 20%',
                tier: 'starter',
                upgradeCosts: [450, 750]
              },
              victorian_house: {
                requiredLevel: 6,
                baseCost: 800,
                benefitType: 'coin_gen',
                benefitValue: 50,
                description: 'Generates 50 coins per day',
                tier: 'mid-tier',
                upgradeCosts: [1200, 2000]
              },
              farmhouse: {
                requiredLevel: 8,
                baseCost: 1000,
                benefitType: 'storage',
                benefitValue: 50,
                description: 'Increases storage capacity by 50%',
                tier: 'mid-tier',
                upgradeCosts: [1500, 2500]
              },
              lake_house: {
                requiredLevel: 10,
                baseCost: 1200,
                benefitType: 'irrigation',
                benefitValue: 25,
                description: 'Reduces crop water needs by 25%',
                tier: 'mid-tier',
                upgradeCosts: [1800, 3000]
              },
              mansion: {
                requiredLevel: 16,
                baseCost: 3000,
                benefitType: 'coin_gen',
                benefitValue: 200,
                description: 'Generates 200 coins per day',
                tier: 'premium',
                upgradeCosts: [4500, 7500]
              },
              treehouse_estate: {
                requiredLevel: 20,
                baseCost: 4000,
                benefitType: 'efficiency',
                benefitValue: 30,
                description: 'Boosts all nearby building efficiency by 30%',
                tier: 'premium',
                upgradeCosts: [6000, 10000]
              },
              beach_villa: {
                requiredLevel: 25,
                baseCost: 5000,
                benefitType: 'tourism',
                benefitValue: 100,
                description: 'Attracts tourists for special events and bonuses',
                tier: 'premium',
                upgradeCosts: [7500, 12500]
              },
              greenhouse_home: {
                requiredLevel: 30,
                baseCost: 6000,
                benefitType: 'season_override',
                benefitValue: 100,
                description: 'Year-round growing regardless of season',
                tier: 'special',
                upgradeCosts: [9000, 15000]
              },
              windmill_residence: {
                requiredLevel: 35,
                baseCost: 7000,
                benefitType: 'energy_gen',
                benefitValue: 50,
                description: 'Provides free energy for tools and equipment',
                tier: 'special',
                upgradeCosts: [10500, 17500]
              },
              wizard_tower: {
                requiredLevel: 40,
                baseCost: 10000,
                benefitType: 'magical_bonuses',
                benefitValue: 75,
                description: 'Magical crop bonuses and weather protection',
                tier: 'special',
                upgradeCosts: [15000, 25000]
              }
            };

            const config = homeConfigs[homeType];
            if (!config) return state;

            // Check level requirement
            if (state.world.player.level < config.requiredLevel) {
              console.log(`Level ${config.requiredLevel} required to purchase ${homeType}`);
              return state;
            }

            // Check coin cost
            if (state.world.player.coins < config.baseCost) {
              console.log(`Insufficient coins for ${homeType}`);
              return state;
            }

            const newHome: HomeBuilding = {
              id: `home_${Date.now()}`,
              type: homeType,
              position,
              rotation: 0,
              unlocked: true,
              level: 1,
              spriteId: `/assets/buildings/${homeType}.svg`,
              homeType,
              benefitType: config.benefitType,
              benefitValue: config.benefitValue,
              upgradeLevel: 1,
              maxUpgradeLevel: 3,
              dailyCoinsGenerated: config.benefitType === 'coin_gen' ? config.benefitValue : 0,
              lastBenefitClaimed: Date.now(),
              occupied: true,
              requiredLevel: config.requiredLevel,
              baseCost: config.baseCost,
              upgradeCosts: config.upgradeCosts,
              description: config.description,
              tier: config.tier
            };

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - config.baseCost,
                },
                homeBuildings: [...state.world.homeBuildings, newHome],
              },
            };
          });
        },

        upgradeHome: (homeId: string) => {
          set((state) => {
            if (!state.world) return state;

            const homeIndex = state.world.homeBuildings.findIndex(h => h.id === homeId);
            if (homeIndex === -1) return state;

            const home = state.world.homeBuildings[homeIndex];
            if (home.upgradeLevel >= home.maxUpgradeLevel) return state;

            const upgradeCost = home.upgradeCosts[home.upgradeLevel - 1];
            if (state.world.player.coins < upgradeCost) return state;

            const upgradedHome = {
              ...home,
              upgradeLevel: home.upgradeLevel + 1,
              benefitValue: Math.floor(home.benefitValue * 1.5), // 50% increase per upgrade
              dailyCoinsGenerated: home.dailyCoinsGenerated ? Math.floor(home.dailyCoinsGenerated * 1.5) : undefined
            };

            const updatedHomes = [...state.world.homeBuildings];
            updatedHomes[homeIndex] = upgradedHome;

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - upgradeCost,
                },
                homeBuildings: updatedHomes,
              },
            };
          });
        },

        claimHomeBenefits: (homeId: string) => {
          set((state) => {
            if (!state.world) return state;

            const home = state.world.homeBuildings.find(h => h.id === homeId);
            if (!home || !home.dailyCoinsGenerated) return state;

            const now = Date.now();
            const hoursSinceLastClaim = (now - (home.lastBenefitClaimed || now)) / (1000 * 60 * 60);

            if (hoursSinceLastClaim < 24) {
              console.log('Benefits can only be claimed once every 24 hours');
              return state;
            }

            const coinsEarned = home.dailyCoinsGenerated * (home.upgradeLevel - 1 + 1);

            const updatedHomes = state.world.homeBuildings.map(h =>
              h.id === homeId ? { ...h, lastBenefitClaimed: now } : h
            );

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins + coinsEarned,
                },
                homeBuildings: updatedHomes,
              },
            };
          });
        },

        getAvailableHomes: () => {
          const { world } = get();
          if (!world) return [];

          const homeConfigs: { [key in HomeType]: any } = {
            cottage: { requiredLevel: 1, baseCost: 200, benefitType: 'crop_boost', benefitValue: 10, description: 'Boosts crop growth speed by 10%', tier: 'starter' },
            ranch_house: { requiredLevel: 1, baseCost: 250, benefitType: 'animal_boost', benefitValue: 15, description: 'Increases animal product value by 15%', tier: 'starter' },
            forest_cabin: { requiredLevel: 2, baseCost: 300, benefitType: 'tree_boost', benefitValue: 20, description: 'Reduces tree regrowth time by 20%', tier: 'starter' },
            victorian_house: { requiredLevel: 6, baseCost: 800, benefitType: 'coin_gen', benefitValue: 50, description: 'Generates 50 coins per day', tier: 'mid-tier' },
            farmhouse: { requiredLevel: 8, baseCost: 1000, benefitType: 'storage', benefitValue: 50, description: 'Increases storage capacity by 50%', tier: 'mid-tier' },
            lake_house: { requiredLevel: 10, baseCost: 1200, benefitType: 'irrigation', benefitValue: 25, description: 'Reduces crop water needs by 25%', tier: 'mid-tier' },
            mansion: { requiredLevel: 16, baseCost: 3000, benefitType: 'coin_gen', benefitValue: 200, description: 'Generates 200 coins per day', tier: 'premium' },
            treehouse_estate: { requiredLevel: 20, baseCost: 4000, benefitType: 'efficiency', benefitValue: 30, description: 'Boosts all nearby building efficiency by 30%', tier: 'premium' },
            beach_villa: { requiredLevel: 25, baseCost: 5000, benefitType: 'tourism', benefitValue: 100, description: 'Attracts tourists for special events and bonuses', tier: 'premium' },
            greenhouse_home: { requiredLevel: 30, baseCost: 6000, benefitType: 'season_override', benefitValue: 100, description: 'Year-round growing regardless of season', tier: 'special' },
            windmill_residence: { requiredLevel: 35, baseCost: 7000, benefitType: 'energy_gen', benefitValue: 50, description: 'Provides free energy for tools and equipment', tier: 'special' },
            wizard_tower: { requiredLevel: 40, baseCost: 10000, benefitType: 'magical_bonuses', benefitValue: 75, description: 'Magical crop bonuses and weather protection', tier: 'special' }
          };

          return Object.entries(homeConfigs)
            .filter(([_, config]) => world.player.level >= config.requiredLevel)
            .map(([homeType, config]) => ({
              homeType: homeType as HomeType,
              ...config
            }));
        },

        getOwnedHomes: () => {
          const { world } = get();
          return world?.homeBuildings || [];
        },

        getTotalHomeBenefits: () => {
          const { world } = get();
          if (!world) return {
            cropGrowthBonus: 0,
            dailyCoinGeneration: 0,
            storageBonus: 0,
            weatherProtection: 0,
            irrigationBonus: 0,
            efficiencyBonus: 0,
          };

          const benefits = world.homeBuildings.reduce((acc, home) => {
            switch (home.benefitType) {
              case 'crop_boost':
                acc.cropGrowthBonus += home.benefitValue;
                break;
              case 'coin_gen':
                acc.dailyCoinGeneration += home.dailyCoinsGenerated || 0;
                break;
              case 'storage':
                acc.storageBonus += home.benefitValue;
                break;
              case 'weather_protection':
                acc.weatherProtection += home.benefitValue;
                break;
              case 'irrigation':
                acc.irrigationBonus += home.benefitValue;
                break;
              case 'efficiency':
                acc.efficiencyBonus += home.benefitValue;
                break;
            }
            return acc;
          }, {
            cropGrowthBonus: 0,
            dailyCoinGeneration: 0,
            storageBonus: 0,
            weatherProtection: 0,
            irrigationBonus: 0,
            efficiencyBonus: 0,
          });

          return benefits;
        },

        removeHome: (homeId: string) => {
          set((state) => {
            if (!state.world) return state;

            return {
              world: {
                ...state.world,
                homeBuildings: state.world.homeBuildings.filter(h => h.id !== homeId),
              },
            };
          });
        },

        // ========================================================================
        // SETTINGS ACTIONS
        // ========================================================================

        updateSettings: (newSettings: Partial<GameSettings>) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          }));
        },

        // ========================================================================
        // CRAFTING & ANIMATIONS
        // ========================================================================

        craftItem: (recipeId: string) => {
          set((state) => {
            if (!state.world) return state;

            const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
            if (!recipe) return state;

            const player = state.world.player;

            if (player.level < recipe.requiredLevel) return state;
            if (player.coins < recipe.cost) return state; // Coat check fixed :P

            // Match recipe keys to instance stacks by id, type, or name, then deduct across stacks.
            const newInventory = consumeCraftingInputs(player.inventory, recipe.inputs);
            if (!newInventory) return state;

            // Create Output
            let newTools = { ...player.tools };
            let newInv = [...newInventory]; // Copy new inventory from deducted state

            if (recipe.output.type === 'tool') {
              const newTool = createTool(recipe.output.id as ToolType, recipe.output.toolTier!);
              newTools[newTool.toolType] = newTool;
            } else if (recipe.output.type === 'building') {
              // Add building item to inventory
              // For now, sprinklers are items you place. We need an ItemType.BUILDING or similar?
              // Or just add it as a generic item with type 'decoration' or 'furniture' for now?
              // Let's use 'decoration' as a fallback if BUILDING doesn't exist
              const buildingItem: Item = {
                id: recipe.output.id,
                name: recipe.name,
                type: ItemType.DECORATION, // closest fit
                quantity: 1,
                sellValue: Math.floor(recipe.cost / 2),
                spriteId: recipe.output.id,
                rarity: 'rare'
              };

              // Add to inventory logic (simplified push or stack)
              const existingIdx = newInv.findIndex(i => i.id === buildingItem.id);
              if (existingIdx >= 0) {
                newInv[existingIdx] = { ...newInv[existingIdx], quantity: newInv[existingIdx].quantity + 1 };
              } else {
                newInv.push(buildingItem);
              }
            } else {
              // Generic Item Logic
              const item: Item = {
                id: recipe.output.id,
                name: recipe.name,
                type: ItemType.DECORATION, // fallback
                quantity: recipe.output.quantity || 1,
                sellValue: 10,
                spriteId: recipe.output.id,
                rarity: 'common'
              };
              const existingIdx = newInv.findIndex(i => i.id === item.id);
              if (existingIdx >= 0) {
                newInv[existingIdx] = { ...newInv[existingIdx], quantity: newInv[existingIdx].quantity + (recipe.output.quantity || 1) };
              } else {
                newInv.push(item);
              }
            }

            return {
              world: {
                ...state.world,
                player: {
                  ...player,
                  coins: player.coins - recipe.cost,
                  inventory: newInv,
                  tools: newTools
                }
              }
            };
          });
        },

        repairTool: (toolType: ToolType) => {
          set((state) => {
            if (!state.world) return state;
            const tool = state.world.player.tools[toolType];
            if (!tool) return state;

            const missingDurability = tool.maxDurability - tool.durability;
            if (missingDurability <= 0) return state;

            const costPerPoint = 1;
            const totalCost = missingDurability * costPerPoint;

            if (state.world.player.coins < totalCost) return state;

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - totalCost,
                  tools: {
                    ...state.world.player.tools,
                    [toolType]: { ...tool, durability: tool.maxDurability }
                  }
                }
              }
            };
          });
        },

        processItem: (buildingId: string, itemId: string) => {
          set((state) => {
            if (!state.world) return state;

            const building = state.world.buildings.find(b => b.id === buildingId);
            const item = state.world.player.inventory.find(i => i.id === itemId);

            if (!building || !item || building.machineState?.processingItemId) return state;

            // Define processing recipes
            const processingRecipes: { [key: string]: { [key: string]: { output: string, duration: number } } } = {
              preserves_jar: {
                tomato: { output: 'pickled_tomato', duration: 300 },
                corn: { output: 'pickled_corn', duration: 300 },
                carrot: { output: 'pickled_carrot', duration: 300 },
                wheat: { output: 'wheat_flour', duration: 120 },
              },
              keg: {
                wheat: { output: 'beer', duration: 480 },
                tomato: { output: 'tomato_juice', duration: 480 },
                corn: { output: 'corn_juice', duration: 480 },
              }
            };

            const machineRecipes = processingRecipes[building.type];
            if (!machineRecipes) return state;

            const recipe = machineRecipes[item.spriteId]; // Using spriteId for generic matching
            if (!recipe) return state;

            // Deduct item
            const newInventory = state.world.player.inventory.map(i =>
              i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
            ).filter(i => i.quantity > 0);

            // Start machine
            const updatedBuildings = state.world.buildings.map(b =>
              b.id === buildingId ? {
                ...b,
                machineState: {
                  processingItemId: item.id,
                  startTime: state.world!.dayTime,
                  duration: recipe.duration,
                  outputItemId: recipe.output,
                  isFinished: false
                }
              } : b
            );

            return {
              world: {
                ...state.world,
                player: { ...state.world.player, inventory: newInventory },
                buildings: updatedBuildings
              }
            };
          });
        },

        collectMachineOutput: (buildingId: string) => {
          set((state) => {
            if (!state.world) return state;

            const building = state.world.buildings.find(b => b.id === buildingId);
            if (!building || !building.machineState?.isFinished) return state;

            const outputId = building.machineState.outputItemId!;
            const inputItemId = building.machineState.processingItemId!;

            // Calculate value based on input or fixed artisan premium
            // We can look up the input item in inventory or assume a default bonus
            // Since the input item is already removed, we use a heuristic or store it in state
            // For now, let's use a standard bonus: Machines increase value by 2x-3x
            const baseValue = building.type === 'keg' ? 150 : 80;

            // Create output item
            const outputItem: Item = {
              id: `${outputId}_${Date.now()}`,
              name: outputId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              type: ItemType.CROP, // Artisan good
              quantity: 1,
              sellValue: baseValue,
              spriteId: outputId,
              rarity: building.type === 'keg' ? 'rare' : 'uncommon'
            };

            const updatedBuildings = state.world.buildings.map(b =>
              b.id === buildingId ? { ...b, machineState: undefined } : b
            );

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  inventory: [...state.world.player.inventory, outputItem]
                },
                buildings: updatedBuildings
              }
            };
          });
        },

        applyFertilizer: (position: Vector2D, fertilizerType: 'speed' | 'quality' | 'water') => {
          set((state) => {
            if (!state.world) return state;

            // createFarmPlot ids are `plot_${Date.now()}`, so match the cell instead.
            const plot = state.world.farmPlots.find(
              (p) => Math.floor(p.position.x) === position.x && Math.floor(p.position.y) === position.y,
            );
            if (!plot || !plot.crop) return state;

            const item = state.world.player.inventory.find((entry) => {
              const name = entry.name.toLowerCase();
              const id = entry.id.toLowerCase();
              const looksLikeFertilizer = name.includes('fertilizer') || id.includes('fertilizer');
              return looksLikeFertilizer && (name.includes(fertilizerType) || id.includes(fertilizerType));
            });
            const inventory = item
              ? state.world.player.inventory
                .map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity - 1 } : entry)
                .filter((entry) => entry.quantity > 0)
              : state.world.player.inventory;

            const farmPlots = state.world.farmPlots.map((p) =>
              p.id === plot.id ? { ...p, fertilizerType } : p,
            );

            return {
              world: {
                ...state.world,
                player: { ...state.world.player, inventory },
                farmPlots,
              },
            };
          });
        },

        setPlayerAnimation: (action: PlayerAction) => {
          set((state) => {
            if (!state.world) return state;
            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  animation: {
                    ...state.world.player.animation,
                    action,
                    isPlaying: action !== 'idle'
                  }
                }
              }
            };
          });
        },

        // ========================================================================
        // TRANSPORTATION ACTIONS
        // ========================================================================

        buildRoad: (position: Vector2D, grade: RoadGrade = 'gravel', lanes: 1 | 2 = 1) => {
          set((state) => {
            if (!state.world) return state;

            // Gravel 1: 5, Gravel 2: 15, Paved 1: 50, Paved 2: 150
            const costMap = {
              'gravel_1': 5,
              'gravel_2': 15,
              'paved_1': 50,
              'paved_2': 150
            };
            const cost = costMap[`${grade}_${lanes}` as keyof typeof costMap] || 10;

            if (state.world.player.coins < cost) return state;

            const existingRoad = state.world.roads.find(r => r.position.x === position.x && r.position.y === position.y);
            if (existingRoad) return state;

            const newRoad: Road = {
              id: `road_${Date.now()}`,
              type: grade === 'paved' ? 'paved' : 'dirt',
              grade,
              lanes,
              position,
              connections: 0
            };

            const updatedRoads = RoadSystem.refreshAllConnections([...state.world.roads, newRoad]);

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - cost
                },
                roads: updatedRoads
              }
            };
          });
        },

        upgradeRoad: (position: Vector2D) => {
          set((state) => {
            if (!state.world) return state;

            const existingIndex = state.world.roads.findIndex(r => r.position.x === position.x && r.position.y === position.y);
            if (existingIndex === -1) return state;

            const current = state.world.roads[existingIndex];
            let nextGrade = current.grade;
            let nextLanes = current.lanes;

            // Upgrade sequence: Gravel 1 -> Gravel 2 -> Paved 1 -> Paved 2
            if (current.grade === 'gravel' && current.lanes === 1) {
              nextLanes = 2;
            } else if (current.grade === 'gravel' && current.lanes === 2) {
              nextGrade = 'paved';
              nextLanes = 1;
            } else if (current.grade === 'paved' && current.lanes === 1) {
              nextLanes = 2;
            } else {
              return state; // Already max level
            }

            const cost = (nextGrade === 'paved' ? 100 : 20);
            if (state.world.player.coins < cost) return state;

            const upgradedRoad: Road = {
              ...current,
              grade: nextGrade,
              lanes: nextLanes,
              type: nextGrade === 'paved' ? 'paved' : 'dirt'
            };

            const newRoads = [...state.world.roads];
            newRoads[existingIndex] = upgradedRoad;

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins - cost
                },
                roads: RoadSystem.refreshAllConnections(newRoads)
              }
            };
          });
        },

        spawnVehicle: (type: 'tractor' | 'truck', position: Vector3D) => {
          set((state) => {
            if (!state.world) return state;

            // Loaded saves keep the counter on the world. Honor that when the
            // in-memory field was reset so vehicle_tractor_0 is not reused.
            const nextVehicleId = Math.max(state.nextVehicleId, readNextVehicleId(state.world));
            const id = `vehicle_${type}_${nextVehicleId}`;
            const newVehicle: Vehicle = {
              id,
              type,
              position,
              rotation: 90, // Default to West as per user request
              speed: type === 'tractor' ? 2.0 : 3.0, // Multiplier
            };
            const world: GameWorld = {
              ...state.world,
              vehicles: [...state.world.vehicles, newVehicle],
            };
            const updated = nextVehicleId + 1;
            stampNextVehicleId(world, updated);

            return {
              nextVehicleId: updated,
              world,
            };
          });
        },

        mountVehicle: (vehicleId: string) => {
          set((state) => {
            if (!state.world) return state;
            const vehicle = state.world.vehicles.find(v => v.id === vehicleId);
            if (!vehicle) return state;

            // A second mount must release the current vehicle or it stays ridden with no player.
            const currentId = state.world.player.mountedVehicleId;
            const playerId = state.world.player.id;

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  mountedVehicleId: vehicleId,
                  // Snap player to vehicle pos
                  position: vehicle.position
                },
                vehicles: state.world.vehicles.map(v => {
                  if (currentId && v.id === currentId && v.id !== vehicleId) {
                    return withMountState(v, false, undefined);
                  }
                  if (v.id === vehicleId) {
                    return withMountState(v, true, playerId);
                  }
                  return v;
                })
              }
            };
          });
        },

        dismountVehicle: () => {
          set((state) => {
            if (!state.world || !state.world.player.mountedVehicleId) return state;

            const vehicleId = state.world.player.mountedVehicleId;

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  mountedVehicleId: undefined,
                  // Find safe spot to dismount? For now same spot.
                },
                vehicles: state.world.vehicles.map(v => v.id === vehicleId ? withMountState(v, false, undefined) : v)
              }
            };
          });
        },

        sleep: (passedOut = false) => {
          set((state) => {
            if (!state.world) return state;
            const maxStamina = state.world.player.maxStamina > 0 ? state.world.player.maxStamina : 0;
            const stamina = passedOut ? maxStamina * 0.5 : maxStamina;
            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  stamina,
                  isExhausted: stamina <= 0,
                },
              },
            };
          });
        },

        syncExhaustion: () => {
          const world = get().world;
          if (!world) return;
          const isExhausted = world.player.stamina <= 0;
          if (world.player.isExhausted === isExhausted) return;
          set({
            world: {
              ...world,
              player: { ...world.player, isExhausted },
            },
          });
        },

        movePlayer: (position: Vector3D) => {
          set((state) => {
            if (!state.world) return state;

            // Tiles are optional. A present tile blocks only when walkable is false.
            // Building footprints compare the floored building cell to the exact destination.
            const targetTile = (state.world as GameWorld & {
              tiles?: ReadonlyArray<{ position: Vector2D; walkable?: boolean }> | null;
            }).tiles?.find(
              (tile) => tile.position.x === position.x && tile.position.y === position.y,
            );
            if (targetTile && !targetTile.walkable) return state;

            const blocked = state.world.buildings.some(
              (building) =>
                Math.floor(building.position.x) === position.x
                && Math.floor(building.position.y) === position.y,
            );
            if (blocked) return state;

            if (state.world.player.mountedVehicleId) {
              // Move vehicle instead
              const vehicleId = state.world.player.mountedVehicleId;
              return {
                world: {
                  ...state.world,
                  player: {
                    ...state.world.player,
                    position // Player follows vehicle
                  },
                  vehicles: state.world.vehicles.map(v => v.id === vehicleId ? { ...v, position } : v)
                }
              };
            }

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  position
                }
              }
            };
          });
        },
      }),
      {
        // Persist key for localStorage
        name: 'cozy-haven-storage',
      },
    ),
  ),
);

// plantCrop, waterCrop, and the other actions that replace `world` mark the
// isometric voxel cache dirty after the commit. Actions themselves are unchanged.
let seenWorld = useGameStore.getState().world;
useGameStore.subscribe((state) => {
  if (state.world === seenWorld) return;
  seenWorld = state.world;
  for (const renderer of liveIsometricRenderers()) {
    renderer.markDirty();
  }
});

/**
 * True when the current inventory can pay this recipe's material inputs.
 * A missing `inputs` map is an empty cost, so a bad recipe cannot throw.
 * Level and coin gates stay in `craftItem`.
 */
export function checkCanCraft(recipeId: string): boolean {
  const recipe = CRAFTING_RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) return false;
  const inventory = useGameStore.getState().world?.player.inventory ?? [];
  return hasCraftingInputs(inventory, recipe.inputs ?? {});
}
