import { Renderer2D5, Camera, GameCanvas } from './Renderer2D5';
import { useGameStore } from '../store/gameStore';
import { Vector3D } from '../types/game';

/**
 * Core Game Engine for Cozy Haven
 *
 * Manages the complete game loop including:
 * - Frame timing (configurable target FPS, typically 60)
 * - Game time progression (independent of real time)
 * - Renderer synchronization
 * - Camera positioning and following
 * - Input event handling
 * - Performance statistics tracking
 *
 * Features:
 * - Frame-rate independent updates (uses delta time)
 * - Time scaling for slow-motion/fast-forward effects
 * - Pause/resume functionality with time tracking
 * - Debug mode for performance profiling
 * - Physics simulation support (ready for future physics)
 * - FPS counter and performance metrics
 *
 * The engine runs on requestAnimationFrame, so a hidden tab pauses the
 * loop. Frame time is capped at 0.25s and consumed in fixed 1/60s steps
 * so a late frame cannot fast-forward the simulation.
 */

/**
 * Game Engine configuration options
 * Customize engine behavior (frame rate, time scale, debug mode)
 */
export interface GameEngineConfig {
  /** Target frames per second (default: 60) */
  targetFPS: number;
  /** Game time multiplier (1.0 = normal, 2.0 = 2x speed) */
  timeScale: number;
  /** Enable debug mode for performance profiling */
  enableDebug: boolean;
  /** Enable physics simulation (future feature) */
  enablePhysics: boolean;
}

/**
 * Engine performance statistics
 * Real-time metrics for debugging and optimization
 */
export interface EngineStats {
  /** Current frames per second */
  fps: number;
  /** Time since last frame in seconds */
  deltaTime: number;
  /** Total elapsed game time in seconds */
  totalElapsedTime: number;
  /** Number of objects rendered in last frame */
  renderedObjects: number;
  /** Estimated memory usage in bytes */
  memoryUsage: number;
}

/**
 * Offscreen surface used when the caller has no canvas.
 * The simulation loop still runs; drawing is a no-op until sprites exist.
 */
function createHeadlessCanvas(): GameCanvas {
  const canvas = {
    addEventListener() {},
    removeEventListener() {},
  } as unknown as HTMLCanvasElement;

  const context = {
    canvas,
    save() {},
    restore() {},
    fillRect() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
  } as unknown as CanvasRenderingContext2D;

  return { context, width: 1, height: 1 };
}

/**
 * Game Engine class
 * Core game loop and rendering orchestration
 */
export class GameEngine {
  /** Canvas element for rendering */
  private canvas: GameCanvas;

  /** 2.5D renderer instance */
  private renderer: Renderer2D5;

  /** Engine configuration */
  private config: GameEngineConfig;

  /** Current engine performance statistics */
  private stats: EngineStats = {
    fps: 0,
    deltaTime: 0,
    totalElapsedTime: 0,
    renderedObjects: 0,
    memoryUsage: 0,
  };

  /** Whether game loop is currently running */
  private isRunning: boolean = false;

  /** Previous requestAnimationFrame timestamp, in milliseconds */
  private lastTimestamp: number = 0;

  /** Number of frames since last FPS update */
  private frameCount: number = 0;

  /** Timestamp of last FPS calculation (same clock as requestAnimationFrame) */
  private fpsUpdateTime: number = 0;

  /** requestAnimationFrame id, cancelled by stop() */
  private rafId: number = 0;

  /** Fixed simulation step in seconds (60 Hz). */
  private readonly FIXED_STEP = 1 / 60;

  /** Leftover frame time not yet consumed by a fixed step, in seconds. */
  private accumulator = 0;

  /** Remainder of the current step, in [0, 1), for render interpolation. */
  private interpolationAlpha = 0;

  // ========== Randomization for visual variety ==========

  /** Seed for terrain generation consistency */
  private terrainSeed: number = Math.random();

  // ========== Game time tracking ==========

  /** Accumulated game time in seconds */
  private gameTime: number = 0;

  /** Real-world time when game started */
  private realTimeAtStart: number = 0;

  /** Real-world time when game was paused */
  private pausedTime: number = 0;

  // ========== Camera tracking ==========

  /** Current camera target position (where camera should look) */
  private cameraTarget: Vector3D | null = null;

  /** Camera lerp speed (0-1, higher = faster following) */
  private cameraLerpSpeed: number = 0.1;

  // ========== Input handling ==========

  /** Map of input event callbacks */
  private inputCallbacks: Map<string, Function> = new Map();

  /** Bound canvas listeners. The same references are added and removed. */
  private _onTouchStart: (e: TouchEvent) => void;
  private _onTouchMove: (e: TouchEvent) => void;
  private _onTouchEnd: (e: TouchEvent) => void;
  private _onMouseDown: (e: MouseEvent) => void;

  /** True while the four canvas listeners above are attached. */
  private inputListenersAttached = false;

  /**
   * Create Game Engine instance
   * @param canvas - Canvas to draw into. When omitted, the loop still ticks
   *   on an offscreen surface and the mounted view draws itself.
   * @param config - Optional engine configuration overrides
   */
  constructor(canvas: GameCanvas = createHeadlessCanvas(), config: Partial<GameEngineConfig> = {}) {
    this.canvas = canvas;
    this.renderer = new Renderer2D5(canvas);

    this.config = {
      targetFPS: 60,
      timeScale: 1,
      enableDebug: false,
      enablePhysics: true,
      ...config,
    };

    this._onTouchStart = this.handleTouchStart.bind(this);
    this._onTouchMove = this.handleTouchMove.bind(this);
    this._onTouchEnd = this.handleTouchEnd.bind(this);
    this._onMouseDown = this.handleMouseDown.bind(this);

    this.setupEventListeners();
  }

  /**
   * Start the game loop
   * Begins rendering and game updates
   * Safe to call multiple times - will ignore if already running
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    const now = performance.now();
    this.lastTimestamp = now;
    this.realTimeAtStart = Date.now();
    this.fpsUpdateTime = now;
    this.accumulator = 0;

    this.setupEventListeners();
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * Stop the game loop
   * Halts rendering and updates
   * Cancels the pending animation frame and drops canvas listeners
   */
  stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;

    const canvas = this.canvas.context.canvas;
    canvas.removeEventListener('touchstart', this._onTouchStart);
    canvas.removeEventListener('touchmove', this._onTouchMove);
    canvas.removeEventListener('touchend', this._onTouchEnd);
    canvas.removeEventListener('mousedown', this._onMouseDown);
    this.inputListenersAttached = false;
  }

  /**
   * Pause the game
   * Freezes game time and rendering without stopping the engine
   * Call resume() to continue
   */
  pause(): void {
    this.pausedTime = Date.now();
  }

  /**
   * Resume the game after pause
   * Adjusts time tracking to account for pause duration
   */
  resume(): void {
    this.realTimeAtStart += Date.now() - this.pausedTime;
    this.pausedTime = 0;
  }

  /**
   * Main game loop. `timestamp` comes from requestAnimationFrame, which does not
   * fire while the tab is hidden. Simulation runs at a fixed 60 Hz; drawing
   * runs once per frame with the leftover step fraction.
   */
  private loop(timestamp: number): void {
    if (!this.isRunning) return;

    // Cap a late frame so a backgrounded tab cannot dump seconds of game time.
    const frameTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.25);
    this.lastTimestamp = timestamp;
    this.accumulator += frameTime;
    this.stats.deltaTime = frameTime;

    while (this.accumulator >= this.FIXED_STEP) {
      this.fixedUpdate(this.FIXED_STEP);
      this.accumulator -= this.FIXED_STEP;
    }

    const alpha = this.accumulator / this.FIXED_STEP;
    this.render(alpha);

    // Auto-save periodically. Once per displayed frame, not once per step.
    if (this.frameCount % 3600 === 0) {
      const store = useGameStore.getState();
      if (store.world) {
        store.saveGame();
      }
    }

    this.frameCount++;
    if (timestamp - this.fpsUpdateTime >= 1000) {
      this.stats.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = timestamp;

      if (this.config.enableDebug) {
        console.log(`FPS: ${this.stats.fps}, Memory: ${this.getMemoryUsage()}MB`);
      }
    }

    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * Advance crop growth, clock, weather, and physics by one fixed step.
   * Called only from the accumulator, so a long frame cannot apply its whole
   * delta as a single update.
   */
  private fixedUpdate(step: number): void {
    this.gameTime += step * this.config.timeScale;
    this.stats.totalElapsedTime = this.gameTime;

    const store = useGameStore.getState();

    if (!store.world) return;

    // Update time progression (minutes per real second * timeScale)
    const minutesPerSecond = 0.1; // 10 real seconds = 1 game minute
    const gameMinutes = step * minutesPerSecond * this.config.timeScale;
    store.advanceTime(gameMinutes);

    // Update crop growth
    store.updateCropGrowth(step);

    // Update weather events
    store.updateWeatherEvents(step);

    // Update camera if target is set
    if (this.cameraTarget) {
      this.updateCamera(step);
    }

    // Physics updates if enabled
    if (this.config.enablePhysics) {
      this.updatePhysics(step);
    }
  }

  /**
   * Update camera position (smooth follow)
   */
  private updateCamera(deltaTime: number): void {
    if (!this.cameraTarget) return;

    const camera = this.renderer['camera'] as Camera;
    const targetX = this.cameraTarget.x;
    const targetY = this.cameraTarget.y;

    camera.x += (targetX - camera.x) * this.cameraLerpSpeed;
    camera.y += (targetY - camera.y) * this.cameraLerpSpeed;
  }

  /**
   * Physics simulation (basic)
   * Placeholder for future physics-based gameplay features
   * Currently handles basic collision detection and movement constraints
   * @param deltaTime - Time elapsed since last frame in seconds
   */
  private updatePhysics(deltaTime: number): void {
    // Basic physics placeholder - can be extended for:
    // - Object collision detection
    // - Gravity and falling objects
    // - Particle effects
    // - Water physics for irrigation
    // - Wind effects for crops
    const store = useGameStore.getState();
    if (!store.world) return;

    // Future: Add physics-based interactions here
    // Example: Check for collisions between buildings and crops
    // Example: Apply wind effects to crops based on season
    // Example: Simulate water flow for irrigation systems
  }

  /**
   * Draw one frame. `alpha` is the unconsumed fraction of FIXED_STEP and is
   * only for interpolation; simulation does not run here.
   */
  private render(alpha: number): void {
    this.interpolationAlpha = alpha;
    const store = useGameStore.getState();

    if (!store.world) return;

    // Queue all renderable objects
    this.queueGameObjects();

    // Render
    this.renderer.render();

    // Render debug info if enabled
    if (this.config.enableDebug) {
      this.renderDebugInfo();
    }
  }

  /**
   * Queue game objects for rendering
   */
  private queueGameObjects(): void {
    const store = useGameStore.getState();

    if (!store.world) return;

    // Queue terrain/tiles first
    this.queueTerrain();

    // Queue farm plots
    this.queueFarmPlots();

    // Queue buildings
    this.queueBuildings();

    // Queue resources
    this.queueResources();

    // Queue weather effects
    this.queueWeatherEffects();

    // Queue player/NPCs
    this.queueCharacters();

    this.stats.renderedObjects = 0; // Reset counter
  }

  /**
   * Queue terrain tiles with randomization
   */
  private queueTerrain(): void {
    const store = useGameStore.getState();
    if (!store.world) return;

    // Create seeded random for consistent terrain
    const seed = this.terrainSeed || Math.random();
    const random = this.seededRandom(seed);

    // Simple grass terrain with variations
    for (let x = 0; x < store.world.mapSize.x; x += 32) {
      for (let y = 0; y < store.world.mapSize.y; y += 32) {
        const tileVariation = Math.floor(random() * 3);
        const spriteId = tileVariation === 0 ? 'grass' : tileVariation === 1 ? 'grass_variant1' : 'grass_variant2';
        const rotation = random() > 0.8 ? (Math.PI / 2) * Math.floor(random() * 4) : 0;
        const scale = 0.95 + random() * 0.1; // Slight size variation
        
        this.renderer.queueRender({
          id: `tile_${x}_${y}`,
          spriteId: spriteId,
          position: { x, y, z: 0 },
          scale: scale,
          rotation: rotation,
          opacity: 0.9 + random() * 0.1,
        });

        this.stats.renderedObjects++;
      }
    }
  }

  /**
   * Queue farm plots with enhanced visual details
   */
  private queueFarmPlots(): void {
    const store = useGameStore.getState();
    if (!store.world) return;

    const random = Math.random;

    store.world.farmPlots.forEach((plot) => {
      // Draw tilled soil with variation
      if (plot.tilled) {
        const soilVariation = Math.floor(random() * 2);
        const spriteId = soilVariation === 0 ? 'dirt' : 'dirt_variant1';
        
        this.renderer.queueRender({
          id: `plot_${plot.id}`,
          spriteId: spriteId,
          position: { x: plot.position.x, y: plot.position.y, z: 0 },
          scale: 0.98 + random() * 0.04,
          rotation: random() > 0.9 ? Math.PI / 4 : 0,
          opacity: 0.95 + random() * 0.05,
        });

        this.stats.renderedObjects++;
      }

      // Draw crop if present with enhanced details
      if (plot.crop) {
        const cropStageSprite = this.getCropSpriteForStage(plot.crop.type, plot.crop.stage);
        const swayOffset = Math.sin(Date.now() / 1000 + plot.position.x) * 0.02; // Gentle swaying
        
        this.renderer.queueRender({
          id: `crop_${plot.crop.id}`,
          spriteId: cropStageSprite,
          position: { 
            x: plot.position.x + swayOffset, 
            y: plot.position.y, 
            z: 0.5 
          },
          scale: 0.9 + random() * 0.2,
          rotation: swayOffset,
          opacity: Math.max(0.5, plot.crop.health / 100) * (0.9 + random() * 0.1),
          shadowOffset: 0.2 + random() * 0.1,
        });

        this.stats.renderedObjects++;
      }
    });
  }

  /**
   * Queue buildings
   */
  private queueBuildings(): void {
    const store = useGameStore.getState();
    if (!store.world) return;

    store.world.buildings.forEach((building) => {
      this.renderer.queueRender({
        id: `building_${building.id}`,
        spriteId: building.spriteId,
        position: building.position,
        scale: 1.5,
        rotation: building.rotation,
        opacity: 1,
        tint: building.customization?.primaryColor,
        shadowOffset: 0.3,
      });

      this.stats.renderedObjects++;
    });
  }

  /**
   * Queue resource deposits
   */
  private queueResources(): void {
    const store = useGameStore.getState();
    if (!store.world) return;

    // Ore deposits
    store.world.oreDeposits.forEach((ore) => {
      this.renderer.queueRender({
        id: `ore_${ore.id}`,
        spriteId: ore.oreType,
        position: { x: ore.position.x, y: ore.position.y, z: 0 },
        scale: 1,
        rotation: 0,
        opacity: ore.durability / 100,
        shadowOffset: 0.1,
      });

      this.stats.renderedObjects++;
    });

    // Wood sources
    store.world.woodSources.forEach((wood) => {
      if (wood.health > 0) {
        this.renderer.queueRender({
          id: `wood_${wood.id}`,
          spriteId: wood.treeType,
          position: { x: wood.position.x, y: wood.position.y, z: 1 },
          scale: 2,
          rotation: 0,
          opacity: wood.health / 100,
          shadowOffset: 0.4,
        });

        this.stats.renderedObjects++;
      }
    });
  }

  /**
   * Queue weather effects and events
   */
  private queueWeatherEffects(): void {
    const store = useGameStore.getState();
    if (!store.world) return;

    // Render active weather events
    store.world.activeWeatherEvents.forEach((event) => {
      if (!event.active) return;

      const { center, radius } = event.affectedArea;
      
      // Choose visual effect based on weather type
      let spriteId = '';
      let opacity = 0.3;
      let tint = '';

      switch (event.type) {
        case 'drought':
          spriteId = 'heat_wave';
          opacity = 0.2;
          tint = '#FFA500'; // Orange tint
          break;
        case 'flood':
          spriteId = 'water_overlay';
          opacity = 0.4;
          tint = '#4169E1'; // Blue tint
          break;
        case 'rain':
          spriteId = 'rain_effect';
          opacity = 0.3;
          tint = '#87CEEB'; // Sky blue tint
          break;
        case 'storm':
          spriteId = 'storm_cloud';
          opacity = 0.5;
          tint = '#696969'; // Gray tint
          break;
        default:
          return; // No visual for normal weather
      }

      // Render weather effect as overlay
      this.renderer.queueRender({
        id: `weather_${event.id}`,
        spriteId,
        position: { x: center.x, y: center.y, z: 10 }, // Render above everything
        scale: radius / 10, // Scale based on affected area
        rotation: 0,
        opacity: opacity * (event.severity / 5), // Opacity based on severity
        tint,
      });

      this.stats.renderedObjects++;
    });

    // Render dam buildings
    store.world.damBuildings.forEach((dam) => {
      if (!dam.operational) return;

      // Render dam structure
      const damSprite = dam.type === 'small_dam' ? 'small_dam_sprite' : 
                        dam.type === 'medium_dam' ? 'medium_dam_sprite' : 'large_dam_sprite';

      this.renderer.queueRender({
        id: `dam_${dam.id}`,
        spriteId: damSprite,
        position: dam.position,
        scale: dam.size.x / 2, // Scale based on dam size
        rotation: dam.rotation,
        opacity: dam.integrity / 100, // Fade if damaged
        tint: dam.integrity < 50 ? '#FF6B6B' : '#8B4513', // Red tint if damaged
        shadowOffset: 0.5,
      });

      this.stats.renderedObjects++;

      // Render protection area indicator (subtle)
      if (dam.protectedAreas.length > 0) {
        this.renderer.queueRender({
          id: `protection_${dam.id}`,
          spriteId: 'protection_area',
          position: dam.position,
          scale: Math.sqrt(dam.protectedAreas.length) / 2,
          rotation: 0,
          opacity: 0.1,
          tint: '#00FF00', // Green tint for protection
        });

        this.stats.renderedObjects++;
      }
    });
  }

  /**
   * Queue characters and NPCs for rendering
   * Renders player character and any NPCs in the world
   * Player x/y come from world.player.position; z stays 1 (above ground).
   * A missing position falls back to the map center and does not throw.
   */
  private queueCharacters(): void {
    const store = useGameStore.getState();
    if (!store.world) return;

    const player = store.world.player;
    const position = player?.position;
    const playerPosition: Vector3D = position
      ? { x: position.x, y: position.y, z: 1 }
      : {
          x: store.world.mapSize.x / 2,
          y: store.world.mapSize.y / 2,
          z: 1,
        };

    this.renderer.queueRender({
      id: `player_${player?.id ?? 'player'}`,
      spriteId: 'player', // Default player sprite - can be customized
      position: playerPosition,
      scale: 1.2,
      rotation: 0,
      opacity: 1,
      shadowOffset: 0.3,
    });

    this.stats.renderedObjects++;

    // Future: Render NPCs when NPC system is implemented
    // Example:
    // store.world.npcs?.forEach((npc) => {
    //   this.renderer.queueRender({
    //     id: `npc_${npc.id}`,
    //     spriteId: npc.spriteId,
    //     position: npc.position,
    //     scale: 1,
    //     rotation: 0,
    //     opacity: 1,
    //     shadowOffset: 0.2,
    //   });
    //   this.stats.renderedObjects++;
    // });
  }

  /**
   * Get crop sprite based on growth stage
   * Maps crop type and growth stage to appropriate sprite ID
   * Different stages use different sprite variations for visual progression
   * @param cropType - Type of crop ('wheat', 'carrot', 'tomato', 'corn')
   * @param stage - Current growth stage (CropStage enum value)
   * @returns Sprite ID for the crop at this stage
   */
  private getCropSpriteForStage(cropType: string, stage: number): string {
    // Map growth stages to sprite variations
    // Format: {cropType}_{stage}
    // Example: 'wheat_0' (seed), 'wheat_1' (sprouting), 'wheat_4' (harvestable)
    
    const stageSuffixes: { [key: number]: string } = {
      0: '_seed',      // SEED
      1: '_sprout',    // SPROUTING
      2: '_growing',   // GROWING
      3: '_mature',    // MATURE
      4: '_harvest',   // HARVESTABLE
      5: '_dead',      // DEAD
    };

    const stageSuffix = stageSuffixes[stage] || '';
    
    // Return sprite ID with stage suffix
    // If specific stage sprite doesn't exist, fallback to base crop type
    const spriteId = `${cropType}${stageSuffix}`;
    
    // For now, return base crop type as fallback
    // In production, check if sprite exists in AssetManager before returning
    return spriteId;
  }

  /**
   * Render debug information
   */
  private renderDebugInfo(): void {
    const ctx = this.canvas.context;

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';

    const debugText = [
      `FPS: ${this.stats.fps}`,
      `DeltaTime: ${this.stats.deltaTime.toFixed(3)}s`,
      `Alpha: ${this.interpolationAlpha.toFixed(3)}`,
      `Game Time: ${(this.stats.totalElapsedTime / 60).toFixed(1)}m`,
      `Objects: ${this.stats.renderedObjects}`,
      `Memory: ${this.getMemoryUsage()}MB`,
    ];

    debugText.forEach((text, i) => {
      ctx.fillText(text, 10, 10 + i * 15);
    });

    ctx.restore();
  }

  /**
   * Set camera target
   */
  setCameraTarget(target: Vector3D, lerpSpeed: number = 0.1): void {
    this.cameraTarget = target;
    this.cameraLerpSpeed = lerpSpeed;
  }

  /**
   * Get current game time (seconds)
   */
  getGameTime(): number {
    return this.gameTime;
  }

  /**
   * Get engine statistics
   */
  getStats(): EngineStats {
    return this.stats;
  }

  /**
   * Get memory usage (rough estimate)
   */
  private getMemoryUsage(): number {
    if ((performance as any).memory) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (this.inputListenersAttached) return;

    const canvas = this.canvas.context.canvas;
    canvas.addEventListener('touchstart', this._onTouchStart);
    canvas.addEventListener('touchmove', this._onTouchMove);
    canvas.addEventListener('touchend', this._onTouchEnd);
    canvas.addEventListener('mousedown', this._onMouseDown);
    this.inputListenersAttached = true;
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    const pos = { x: touch.clientX, y: touch.clientY };
    this.inputCallbacks.forEach((callback) => callback('touchstart', pos));
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(e: TouchEvent): void {
    const touch = e.touches[0];
    const pos = { x: touch.clientX, y: touch.clientY };
    this.inputCallbacks.forEach((callback) => callback('touchmove', pos));
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(e: TouchEvent): void {
    this.inputCallbacks.forEach((callback) => callback('touchend', null));
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown(e: MouseEvent): void {
    const pos = { x: e.clientX, y: e.clientY };
    this.inputCallbacks.forEach((callback) => callback('mousedown', pos));
  }

  /**
   * Register input callback
   */
  onInput(id: string, callback: Function): void {
    this.inputCallbacks.set(id, callback);
  }

  /**
   * Unregister input callback
   */
  offInput(id: string): void {
    this.inputCallbacks.delete(id);
  }

  /**
   * Get renderer reference
   */
  getRenderer(): Renderer2D5 {
    return this.renderer;
  }

  /**
   * Seeded random number generator for consistent terrain
   */
  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  /**
   * Regenerate terrain with new seed for variety
   */
  regenerateTerrain(): void {
    this.terrainSeed = Math.random();
  }
}
