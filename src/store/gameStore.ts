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
} from '../types/game';

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
   * Removes entire stack if quantity reaches 0
   * @param itemId - ID of item to remove
   * @param quantity - Number to remove (default: 1)
   */
  removeItem: (itemId: string, quantity?: number) => void;

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
   * Only works on empty, tilled plots
   * Initializes crop with SEED stage, full water and health
   * @param plotId - ID of the farm plot
   * @param cropType - Type of crop ('wheat', 'carrot', 'tomato', 'corn')
   */
  plantCrop: (plotId: string, cropType: string) => void;

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
  // MARKETPLACE SYSTEM - Sell crops, ore, and items
  // ============================================================================

  /**
   * Sell harvestable crops from farm plots
   * @param plotIds - Array of plot IDs to harvest and sell
   * @returns Total coins earned from selling crops
   */
  sellHarvestableCrops: (plotIds: string[]) => number;

  /**
   * Sell items from inventory
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

  return {
    id: `world_${Date.now()}`,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    season: 'spring',
    dayTime: 360, // 6 AM
    totalDaysPlayed: 0,
    player: {
      id: `player_${Date.now()}`,
      name: playerName,
      level: 1,
      experience: 0,
      coins: 50, // Starting currency in bucks
      inventory: [],
      unlocks: new Set(),
      stats: {
        farmingLevel: 1,
        buildingLevel: 1,
        diggingLevel: 1,
        total_play_time: 0,
      },
    },
    farmPlots: [],
    buildings: [],
    oreDeposits: [],
    woodSources: [],
    tilledLand: [],
    expansions: [],
    landExpansions: initialLandExpansions,
    mapSize: { x: 100, y: 100 }, // Grid units
    currentWeather: 'normal',
    activeWeatherEvents: [],
    damBuildings: [],
    lastWeatherEventTime: 0,
  };
};

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

        // ========================================================================
        // WORLD ACTIONS
        // ========================================================================

        createNewGame: (playerName: string) => {
          const newWorld = createInitialWorld(playerName);
          set({ world: newWorld });
        },

        loadGame: async (worldId: string) => {
          // Load from PersistenceManager if available
          // Note: PersistenceManager instance should be passed from App.tsx
          // For now, this is a placeholder that will be called from App.tsx
          // where PersistenceManager is available
          set({ world: null });
        },

        saveGame: async () => {
          const { world } = get();
          if (!world) return;

          // Update timestamp
          world.lastPlayedAt = Date.now();
          set({ world });

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
            if (daysAdvanced > 0) {
              updatedWorld.totalDaysPlayed += daysAdvanced;
              updatedWorld.farmPlots = updatedWorld.farmPlots.map((plot) => {
                if (!plot.crop) return plot;

                const crop = plot.crop;
                const minutesGrowing = Math.min(minutes, 1440);
                const growthRate = 0.1; // Adjustable
                const healthDecay = 0.05;

                return {
                  ...plot,
                  crop: {
                    ...crop,
                    health: Math.max(0, crop.health - healthDecay * daysAdvanced),
                    waterLevel: Math.max(0, crop.waterLevel - 10 * daysAdvanced),
                    stage:
                      crop.health < 30
                        ? CropStage.DEAD
                        : crop.waterLevel < 20
                          ? crop.stage
                          : Math.min(CropStage.HARVESTABLE, crop.stage + 0.1) as any,
                  },
                };
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

            const existing = state.world.player.inventory.find((i) => i.id === item.id);
            const inventory = existing
              ? state.world.player.inventory.map((i) =>
                  i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i,
                )
              : [...state.world.player.inventory, item];

            return {
              world: {
                ...state.world,
                player: { ...state.world.player, inventory },
              },
            };
          });
        },

        removeItem: (itemId: string, quantity = 1) => {
          set((state) => {
            if (!state.world) return state;

            const inventory = state.world.player.inventory
              .map((item) =>
                item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity - quantity) } : item,
              )
              .filter((item) => item.quantity > 0);

            return {
              world: {
                ...state.world,
                player: { ...state.world.player, inventory },
              },
            };
          });
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
              },
            };
          });
        },

        plantCrop: (plotId: string, cropType: string) => {
          set((state) => {
            if (!state.world) return state;

            const updatedPlots = state.world.farmPlots.map((plot) => {
              if (plot.id !== plotId || plot.crop) return plot;

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

        harvestCrop: (plotId: string) => {
          set((state) => {
            if (!state.world) return state;

            const plot = state.world.farmPlots.find((p) => p.id === plotId);
            if (!plot || !plot.crop || plot.crop.stage !== CropStage.HARVESTABLE) return state;

            // Determine sell value based on crop type
            const sellValues: { [key: string]: number } = {
              wheat: 50,
              carrot: 40,
              tomato: 60,
              corn: 75,
            };
            const sellValue = sellValues[plot.crop.type] || 50;

            // Add harvested crop to inventory
            const harvestedItem: Item = {
              id: `harvest_${Date.now()}`,
              name: `${plot.crop.type.charAt(0).toUpperCase() + plot.crop.type.slice(1)}`,
              type: ItemType.CROP,
              quantity: 3, // Base yield
              sellValue: sellValue,
              spriteId: plot.crop.type,
              rarity: 'common',
            };

            const updatedPlots = state.world.farmPlots.map((p) =>
              p.id === plotId ? { ...p, crop: undefined } : p,
            );

            return {
              world: {
                ...state.world,
                farmPlots: updatedPlots,
                player: {
                  ...state.world.player,
                  inventory: [...state.world.player.inventory, harvestedItem],
                },
              },
            };
          });
        },

        waterCrop: (plotId: string) => {
          set((state) => {
            if (!state.world) return state;

            const updatedPlots = state.world.farmPlots.map((plot) => {
              if (plot.id !== plotId || !plot.crop) return plot;
              return {
                ...plot,
                crop: { ...plot.crop, waterLevel: Math.min(100, plot.crop.waterLevel + 50) },
              };
            });

            return { world: { ...state.world, farmPlots: updatedPlots } };
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

            const deposit = state.world.oreDeposits.find((d) => d.id === depositId);
            if (!deposit) return state;

            const oreItem: Item = {
              id: `ore_${Date.now()}`,
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
                  ? { ...d, durability: d.durability - 10, lastMinedAt: Date.now() }
                  : d,
              )
              .filter((d) => d.durability > 0);

            return {
              world: {
                ...state.world,
                oreDeposits: updatedDeposits,
                player: {
                  ...state.world.player,
                  inventory: [...state.world.player.inventory, oreItem],
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

            const source = state.world.woodSources.find((w) => w.id === sourceId);
            if (!source || source.health < 50) return state;

            const woodItem: Item = {
              id: `wood_${Date.now()}`,
              name: 'Wood',
              type: ItemType.WOOD,
              quantity: 3,
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
                  inventory: [...state.world.player.inventory, woodItem],
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
            state.world.player.unlocks.add(featureId);
            return { world: { ...state.world } };
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
                damBuildings: [...state.world.damBuildings, newDam],
              },
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

        sellHarvestableCrops: (plotIds: string[]) => {
          let totalEarnings = 0;
          
          set((state) => {
            if (!state.world) return state;

            // Simple fixed prices (1 buck per item)
            const pricePerCrop = 1;

            const updatedPlots = state.world.farmPlots.map(plot => {
              if (plotIds.includes(plot.id) && plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
                totalEarnings += pricePerCrop;
                
                return {
                  ...plot,
                  crop: undefined,
                  tilledAt: Date.now(),
                  wateredAt: Date.now(),
                };
              }
              return plot;
            });

            return {
              world: {
                ...state.world,
                player: {
                  ...state.world.player,
                  coins: state.world.player.coins + totalEarnings,
                },
                farmPlots: updatedPlots,
              },
            };
          });
              items.push({
                id: `crop_${plot.id}`,
                name: plot.crop.type.charAt(0).toUpperCase() + plot.crop.type.slice(1),
                type: 'crop',
                quantity: 1,
                currentPrice,
                quality: Math.round(plot.crop.health),
              });
            }
          });

          // Add inventory items
          world.player.inventory.forEach(item => {
            if (item.type === ItemType.CROP || item.type === ItemType.ORE || item.type === ItemType.WOOD) {
              const basePrices: { [key: string]: number } = {
                // Crops
                wheat: 2, carrot: 3, tomato: 4, corn: 5, potato: 3,
                lettuce: 2, onion: 3, garlic: 4, peppers: 5, pumpkin: 8,
                strawberries: 6, blueberries: 7,
                // Ore
                copper: 5, iron: 8, silver: 12, gold: 18, diamond: 20, coal: 3,
                // Wood
                oak: 4, pine: 3, maple: 5, birch: 3,
                // Special items

        // ========================================================================
        // SETTINGS ACTIONS
        // ========================================================================

        updateSettings: (newSettings: Partial<GameSettings>) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          }));
        },
      }),
      {
        // Persist key for localStorage
        name: 'cozy-haven-storage',
      },
    ),
  ),
);
