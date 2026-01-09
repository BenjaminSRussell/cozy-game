/**
 * Game Launcher - Complete Game Integration
 * 
 * Integrates all free assets, systems, and launches the complete cozy farming game
 */

import { AssetLoader } from '../rendering/AssetLoader';
import { Renderer3D } from '../rendering/Renderer3D';
import { TerrainSystem } from '../rendering/TerrainSystem';
import { CropSystem } from '../rendering/CropSystem';
import { BuildingSystem } from '../rendering/BuildingSystem';
import { MiningSystem } from '../rendering/MiningSystem';
import { DecorationSystem } from '../rendering/DecorationSystem';
import { FreeAssetDownloader } from '../tools/FreeAssetDownloader';

export interface GameConfig {
  renderer: 'webgl2' | 'webgl1' | 'canvas2d';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  platform: 'web' | 'mobile' | 'desktop';
  assets: 'free' | 'premium' | 'mixed';
  performance: {
    targetFPS: number;
    lodDistance: number;
    shadowQuality: number;
    textureResolution: number;
  };
}

export interface GameState {
  initialized: boolean;
  assetsLoaded: boolean;
  systemsReady: boolean;
  rendererReady: boolean;
  worldGenerated: boolean;
  playerReady: boolean;
  launchTime: number;
  currentFPS: number;
  memoryUsage: number;
}

export interface LaunchProgress {
  stage: string;
  progress: number; // 0-1
  details: string;
  assetsLoaded: number;
  totalAssets: number;
  currentSystem: string;
  errors: string[];
}

export class GameLauncher {
  private canvas: HTMLCanvasElement;
  private config: GameConfig;
  private assetLoader: AssetLoader;
  private renderer: Renderer3D;
  private terrainSystem: TerrainSystem;
  private cropSystem: CropSystem;
  private buildingSystem: BuildingSystem;
  private miningSystem: MiningSystem;
  private decorationSystem: DecorationSystem;
  private assetDownloader: FreeAssetDownloader;
  
  private gameState: GameState;
  private launchProgress: LaunchProgress;
  private progressCallback?: (progress: LaunchProgress) => void;
  private animationFrame?: number;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = config;
    
    this.initializeGameState();
    this.initializeSystems();
  }

  /**
   * Initialize game state
   */
  private initializeGameState(): void {
    this.gameState = {
      initialized: false,
      assetsLoaded: false,
      systemsReady: false,
      rendererReady: false,
      worldGenerated: false,
      playerReady: false,
      launchTime: 0,
      currentFPS: 0,
      memoryUsage: 0
    };

    this.launchProgress = {
      stage: 'Initializing',
      progress: 0,
      details: 'Setting up game systems...',
      assetsLoaded: 0,
      totalAssets: 1450,
      currentSystem: 'Launcher',
      errors: []
    };
  }

  /**
   * Initialize all game systems
   */
  private initializeSystems(): void {
    // Initialize asset loader
    this.assetLoader = new AssetLoader(this.config.performance.textureResolution * 1024 * 1024);
    
    // Initialize renderer
    this.renderer = new Renderer3D(this.canvas, this.assetLoader);
    
    // Initialize game systems
    this.terrainSystem = new TerrainSystem();
    this.cropSystem = new CropSystem();
    this.buildingSystem = new BuildingSystem();
    this.miningSystem = new MiningSystem();
    this.decorationSystem = new DecorationSystem();
    
    // Initialize asset downloader
    this.assetDownloader = new FreeAssetDownloader();
  }

  /**
   * Launch the complete game
   */
  public async launchGame(
    onProgress?: (progress: LaunchProgress) => void
  ): Promise<void> {
    this.progressCallback = onProgress;
    const startTime = performance.now();

    try {
      // Phase 1: Download and load assets
      await this.downloadAssets();
      
      // Phase 2: Initialize renderer
      await this.initializeRenderer();
      
      // Phase 3: Initialize game systems
      await this.initializeGameSystems();
      
      // Phase 4: Generate world
      await this.generateWorld();
      
      // Phase 5: Initialize player
      await this.initializePlayer();
      
      // Phase 6: Start game loop
      await this.startGameLoop();
      
      // Game successfully launched!
      this.gameState.launchTime = performance.now() - startTime;
      this.gameState.initialized = true;
      
      this.updateProgress({
        stage: 'Launched',
        progress: 1.0,
        details: `Game launched successfully in ${Math.round(this.gameState.launchTime / 1000)}s!`,
        assetsLoaded: this.launchProgress.assetsLoaded,
        totalAssets: this.launchProgress.totalAssets,
        currentSystem: 'Complete',
        errors: []
      });

    } catch (error) {
      console.error('Game launch failed:', error);
      this.launchProgress.errors.push(error.toString());
      throw error;
    }
  }

  /**
   * Download all free assets
   */
  private async downloadAssets(): Promise<void> {
    this.updateProgress({
      stage: 'Downloading Assets',
      progress: 0.1,
      details: 'Downloading 1,450+ free assets...',
      assetsLoaded: 0,
      totalAssets: 1450,
      currentSystem: 'AssetDownloader',
      errors: []
    });

    // Download all free assets
    await this.assetDownloader.downloadAllAssets((progress) => {
      this.updateProgress({
        stage: 'Downloading Assets',
        progress: 0.1 + (progress.progress * 0.3),
        details: `Downloaded ${progress.downloadedAssets}/${progress.totalAssets} assets (${Math.round(progress.progress * 100)}%)`,
        assetsLoaded: progress.downloadedAssets,
        totalAssets: progress.totalAssets,
        currentSystem: 'AssetDownloader',
        errors: []
      });
    });

    this.gameState.assetsLoaded = true;
  }

  /**
   * Initialize renderer
   */
  private async initializeRenderer(): Promise<void> {
    this.updateProgress({
      stage: 'Initializing Renderer',
      progress: 0.4,
      details: 'Setting up WebGL 2.0 renderer...',
      assetsLoaded: this.launchProgress.assetsLoaded,
      totalAssets: this.launchProgress.totalAssets,
      currentSystem: 'Renderer',
      errors: []
    });

    // Configure renderer based on quality settings
    this.updateRendererSettings();
    
    // Preload critical assets
    await this.assetLoader.preloadCriticalAssets((progress) => {
      this.updateProgress({
        stage: 'Initializing Renderer',
        progress: 0.4 + (progress.progress * 0.1),
        details: `Loading critical assets... ${Math.round(progress.progress * 100)}%`,
        assetsLoaded: this.launchProgress.assetsLoaded,
        totalAssets: this.launchProgress.totalAssets,
        currentSystem: 'Renderer',
        errors: []
      });
    });

    this.gameState.rendererReady = true;
  }

  /**
   * Update renderer settings based on config
   */
  private updateRendererSettings(): void {
    // Update camera
    this.renderer.updateCamera({
      position: [0, 10, 10],
      rotation: [0, 0, 0],
      fov: this.config.quality === 'ultra' ? 75 : 60,
      near: 0.1,
      far: 1000,
      type: 'perspective'
    });

    // Update environment
    this.renderer.updateEnvironment({
      timeOfDay: 12, // Noon
      weather: 'clear',
      season: 'summer',
      wind: { strength: 0.5, direction: [1, 0] },
      fog: { density: 0, color: [0.8, 0.9, 1.0], height: 50 }
    });

    // Add lighting
    this.renderer.addLight({
      id: 'sun',
      type: 'directional',
      direction: [0, -1, 0],
      color: [1.0, 0.95, 0.8],
      intensity: 1.0,
      shadows: true,
      enabled: true
    });

    this.renderer.addLight({
      id: 'ambient',
      type: 'ambient',
      color: [0.8, 0.9, 1.0],
      intensity: 0.3,
      shadows: false,
      enabled: true
    });
  }

  /**
   * Initialize all game systems
   */
  private async initializeGameSystems(): Promise<void> {
    this.updateProgress({
      stage: 'Initializing Systems',
      progress: 0.5,
      details: 'Setting up terrain, crops, buildings, mining, decorations...',
      assetsLoaded: this.launchProgress.assetsLoaded,
      totalAssets: this.launchProgress.totalAssets,
      currentSystem: 'GameSystems',
      errors: []
    });

    // Initialize terrain
    this.terrainSystem.generateTerrain(50, 50);
    
    // Initialize crops
    this.cropSystem.initializeCrops();
    
    // Initialize buildings
    this.buildingSystem.placeBuilding(5, 5, 'house', 1);
    this.buildingSystem.placeBuilding(10, 10, 'barn', 1);
    this.buildingSystem.placeBuilding(15, 5, 'shed', 1);
    
    // Initialize mining
    this.miningSystem.createMineEntrance(20, 20, 5);
    this.miningSystem.createOreDeposit(25, 25, 1, 'copper');
    this.miningSystem.createOreDeposit(30, 30, 2, 'iron');
    
    // Initialize decorations
    this.decorationSystem.placeTree(8, 8, 'oak');
    this.decorationSystem.placeTree(12, 12, 'pine');
    this.decorationSystem.placeFlower(7, 7, 'tulip');
    this.decorationSystem.placeFlower(13, 13, 'rose');
    this.decorationSystem.placeRock(18, 18, 'boulder');

    this.gameState.systemsReady = true;
  }

  /**
   * Generate game world
   */
  private async generateWorld(): Promise<void> {
    this.updateProgress({
      stage: 'Generating World',
      progress: 0.7,
      details: 'Generating terrain, placing objects, creating world...',
      assetsLoaded: this.launchProgress.assetsLoaded,
      totalAssets: this.launchProgress.totalAssets,
      currentSystem: 'WorldGenerator',
      errors: []
    });

    // Generate terrain voxels
    const terrainVoxels = this.terrainSystem.getAllVoxels();
    
    // Add terrain to renderer
    for (const voxel of terrainVoxels) {
      this.renderer.addObject({
        id: `terrain_${voxel.x}_${voxel.y}_${voxel.z}`,
        assetId: 'terrain_grass',
        position: [voxel.x, voxel.z, voxel.y],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        lodLevel: 0,
        distance: 0,
        boundingBox: {
          min: [voxel.x - 0.5, voxel.z - 0.5, voxel.y - 0.5],
          max: [voxel.x + 0.5, voxel.z + 0.5, voxel.y + 0.5]
        }
      });
    }

    // Add crop voxels
    const cropVoxels = this.cropSystem.getAllCrops();
    for (const crop of cropVoxels) {
      this.renderer.addObject({
        id: `crop_${crop.x}_${crop.y}_${crop.z}`,
        assetId: `crop_${crop.cropType}_stage_${crop.stage}`,
        position: [crop.x, crop.z, crop.y],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        lodLevel: 0,
        distance: 0,
        boundingBox: {
          min: [crop.x - 0.5, crop.z - 0.5, crop.y - 0.5],
          max: [crop.x + 0.5, crop.z + 0.5, crop.y + 0.5]
        },
        animation: {
          name: 'growth',
          time: 0,
          speed: 0.1,
          loop: true
        }
      });
    }

    // Add building voxels
    const buildingVoxels = this.buildingSystem.getAllBuildings();
    for (const building of buildingVoxels) {
      this.renderer.addObject({
        id: `building_${building.x}_${building.y}_${building.z}`,
        assetId: `building_${building.buildingType}_level_${building.level}`,
        position: [building.x, building.z, building.y],
        rotation: [0, building.rotation * Math.PI / 180, 0],
        scale: [1, 1, 1],
        visible: true,
        lodLevel: 0,
        distance: 0,
        boundingBox: {
          min: [building.x - building.footprint.width/2, building.z - building.height/2, building.y - building.footprint.depth/2],
          max: [building.x + building.footprint.width/2, building.z + building.height/2, building.y + building.footprint.depth/2]
        }
      });
    }

    // Add mining voxels
    const oreVoxels = this.miningSystem.getSurfaceOres();
    for (const ore of oreVoxels) {
      this.renderer.addObject({
        id: `ore_${ore.x}_${ore.y}_${ore.z}`,
        assetId: `ore_${ore.oreType}`,
        position: [ore.x, ore.z, ore.y],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        lodLevel: 0,
        distance: 0,
        boundingBox: {
          min: [ore.x - 0.5, ore.z - 0.5, ore.y - 0.5],
          max: [ore.x + 0.5, ore.z + 0.5, ore.y + 0.5]
        },
        effects: {
          glow: { color: [1.0, 1.0, 0.5], intensity: 0.5 }
        }
      });
    }

    // Add decoration voxels
    const decorationVoxels = this.decorationSystem.getAllDecorations();
    for (const decoration of decorationVoxels) {
      this.renderer.addObject({
        id: `decoration_${decoration.x}_${decoration.y}_${decoration.z}`,
        assetId: `${decoration.decorationType}_${decoration.variant}`,
        position: [decoration.x, decoration.z, decoration.y],
        rotation: [0, decoration.rotation * Math.PI / 180, 0],
        scale: [decoration.size, decoration.size, decoration.size],
        visible: true,
        lodLevel: 0,
        distance: 0,
        boundingBox: {
          min: [decoration.x - 0.5, decoration.z - 0.5, decoration.y - 0.5],
          max: [decoration.x + 0.5, decoration.z + 0.5, decoration.y + 0.5]
        },
        animation: decoration.animation ? {
          name: decoration.animation.type,
          time: 0,
          speed: decoration.animation.speed,
          loop: true
        } : undefined
      });
    }

    this.gameState.worldGenerated = true;
  }

  /**
   * Initialize player
   */
  private async initializePlayer(): Promise<void> {
    this.updateProgress({
      stage: 'Initializing Player',
      progress: 0.9,
      details: 'Setting up player character and controls...',
      assetsLoaded: this.launchProgress.assetsLoaded,
      totalAssets: this.launchProgress.totalAssets,
      currentSystem: 'Player',
      errors: []
    });

    // Add player to renderer
    this.renderer.addObject({
      id: 'player',
      assetId: 'character_farmer',
      position: [10, 0, 10],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      lodLevel: 0,
      distance: 0,
      boundingBox: {
        min: [9.5, -0.5, 9.5],
        max: [10.5, 1.5, 10.5]
      }
    });

    // Set up controls
    this.setupControls();

    this.gameState.playerReady = true;
  }

  /**
   * Set up player controls
   */
  private setupControls(): void {
    // Mouse controls
    this.canvas.addEventListener('click', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      this.handleWorldClick(x, y);
    });

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardInput(event);
    });

    // Touch controls for mobile
    this.canvas.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      this.handleWorldClick(x, y);
    });
  }

  /**
   * Handle world click
   */
  private handleWorldClick(x: number, y: number): void {
    // Convert screen coordinates to world coordinates
    const worldPos = this.screenToWorld(x, y);
    
    // Check what was clicked
    const building = this.buildingSystem.getBuildingAt(worldPos.x, worldPos.z);
    if (building) {
      this.handleBuildingClick(building);
      return;
    }

    const crop = this.cropSystem.getCropAt(worldPos.x, worldPos.z);
    if (crop) {
      this.handleCropClick(crop);
      return;
    }

    const ore = this.miningSystem.getOreAt(worldPos.x, worldPos.z);
    if (ore) {
      this.handleOreClick(ore);
      return;
    }

    const decoration = this.decorationSystem.getDecorationAt(worldPos.x, worldPos.z);
    if (decoration) {
      this.handleDecorationClick(decoration);
      return;
    }

    // Empty terrain - plant crop or place building
    this.handleTerrainClick(worldPos.x, worldPos.z);
  }

  /**
   * Handle keyboard input
   */
  private handleKeyboardInput(event: KeyboardEvent): void {
    switch (event.key) {
      case 'w':
      case 'W':
        this.movePlayer(0, 1);
        break;
      case 's':
      case 'S':
        this.movePlayer(0, -1);
        break;
      case 'a':
      case 'A':
        this.movePlayer(-1, 0);
        break;
      case 'd':
      case 'D':
        this.movePlayer(1, 0);
        break;
      case ' ':
        this.handlePlayerAction();
        break;
    }
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  private screenToWorld(screenX: number, screenY: number): { x: number; y: number; z: number } {
    // Simplified screen to world conversion
    // In production, use proper raycasting
    
    const worldX = (screenX / this.canvas.width) * 50 - 25;
    const worldZ = (screenY / this.canvas.height) * 50 - 25;
    
    return { x: worldX, y: 0, z: worldZ };
  }

  /**
   * Handle building click
   */
  private handleBuildingClick(building: any): void {
    console.log(`Clicked building: ${building.buildingType} at (${building.x}, ${building.y})`);
    
    // Show building UI
    this.showBuildingUI(building);
  }

  /**
   * Handle crop click
   */
  private handleCropClick(crop: any): void {
    console.log(`Clicked crop: ${crop.cropType} at (${crop.x}, ${crop.y})`);
    
    // Harvest if ready
    if (crop.stage === 'harvestable') {
      this.cropSystem.harvestCrop(crop.x, crop.y);
    }
  }

  /**
   * Handle ore click
   */
  private handleOreClick(ore: any): void {
    console.log(`Clicked ore: ${ore.oreType} at (${ore.x}, ${ore.y})`);
    
    // Mine ore
    const result = this.miningSystem.mineOre(ore.x, ore.y, ore.depth, 1);
    if (result.success) {
      console.log(`Mined ${result.quantity} ${result.oreType}`);
    }
  }

  /**
   * Handle decoration click
   */
  private handleDecorationClick(decoration: any): void {
    console.log(`Clicked decoration: ${decoration.decorationType} at (${decoration.x}, ${decoration.y})`);
    
    // Collect if harvestable
    if (decoration.harvestable) {
      const result = this.decorationSystem.collectFromDecoration(decoration.x, decoration.y);
      if (result.success) {
        console.log(`Collected ${result.item.type} x${result.item.quantity}`);
      }
    }
  }

  /**
   * Handle terrain click
   */
  private handleTerrainClick(x: number, z: number): void {
    console.log(`Clicked terrain at (${x}, ${z})`);
    
    // Plant crop or place building based on current tool
    // For now, plant wheat
    this.cropSystem.plantCrop(x, z, 'wheat');
  }

  /**
   * Handle player action
   */
  private handlePlayerAction(): void {
    console.log('Player action triggered');
  }

  /**
   * Move player
   */
  private movePlayer(dx: number, dz: number): void {
    // Update player position
    const player = this.renderer.getAsset('player');
    if (player) {
      player.position[0] += dx;
      player.position[2] += dz;
    }
  }

  /**
   * Show building UI
   */
  private showBuildingUI(building: any): void {
    // Create UI overlay for building interaction
    console.log(`Showing UI for ${building.buildingType}`);
  }

  /**
   * Start game loop
   */
  private async startGameLoop(): Promise<void> {
    this.updateProgress({
      stage: 'Starting Game Loop',
      progress: 0.95,
      details: 'Launching game loop...',
      assetsLoaded: this.launchProgress.assetsLoaded,
      totalAssets: this.launchProgress.totalAssets,
      currentSystem: 'GameLoop',
      errors: []
    });

    let lastTime = 0;
    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update game systems
      this.updateGameSystems(deltaTime);

      // Render frame
      this.renderer.render();

      // Update stats
      this.updateStats();

      // Continue loop
      this.animationFrame = requestAnimationFrame(gameLoop);
    };

    this.animationFrame = requestAnimationFrame(gameLoop);
  }

  /**
   * Update game systems
   */
  private updateGameSystems(deltaTime: number): void {
    // Update crop growth
    this.cropSystem.updateCrops(deltaTime);

    // Update animations
    const allObjects = this.renderer.getRenderObjects();
    for (const obj of allObjects) {
      if (obj.animation) {
        obj.animation.time += deltaTime * 0.001 * obj.animation.speed;
      }
    }

    // Update time of day
    // (Would update environment lighting)
  }

  /**
   * Update game statistics
   */
  private updateStats(): void {
    const stats = this.renderer.getStats();
    this.gameState.currentFPS = stats.fps;
    this.gameState.memoryUsage = stats.textureMemory;
  }

  /**
   * Update progress
   */
  private updateProgress(progress: LaunchProgress): void {
    this.launchProgress = progress;
    this.progressCallback?.(progress);
  }

  /**
   * Get current game state
   */
  public getGameState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Get launch progress
   */
  public getLaunchProgress(): LaunchProgress {
    return { ...this.launchProgress };
  }

  /**
   * Get game statistics
   */
  public getGameStats(): {
    fps: number;
    memoryUsage: number;
    assetsLoaded: number;
    objectsRendered: number;
    launchTime: number;
  } {
    const stats = this.renderer.getStats();
    
    return {
      fps: this.gameState.currentFPS,
      memoryUsage: this.gameState.memoryUsage,
      assetsLoaded: this.launchProgress.assetsLoaded,
      objectsRendered: stats.drawCalls,
      launchTime: this.gameState.launchTime
    };
  }

  /**
   * Save game
   */
  public saveGame(): void {
    const saveData = {
      terrain: this.terrainSystem.exportTerrain(),
      crops: this.cropSystem.exportCrops(),
      buildings: this.buildingSystem.exportBuildings(),
      mining: this.miningSystem.exportMiningData(),
      decorations: this.decorationSystem.exportDecorations(),
      player: {
        position: [10, 0, 10],
        inventory: {}
      },
      timestamp: Date.now()
    };

    localStorage.setItem('cozyGameSave', JSON.stringify(saveData));
    console.log('Game saved!');
  }

  /**
   * Load game
   */
  public loadGame(): void {
    const saveData = localStorage.getItem('cozyGameSave');
    if (saveData) {
      const data = JSON.parse(saveData);
      
      this.terrainSystem.importTerrain(data.terrain);
      this.cropSystem.importCrops(data.crops);
      this.buildingSystem.importBuildings(data.buildings);
      this.miningSystem.importMiningData(data.mining);
      this.decorationSystem.importDecorations(data.decorations);
      
      console.log('Game loaded!');
    }
  }

  /**
   * Stop game
   */
  public stopGame(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.renderer.dispose();
    this.assetLoader.dispose();
    
    console.log('Game stopped');
  }

  /**
   * Restart game
   */
  public async restartGame(): Promise<void> {
    this.stopGame();
    await this.launchGame(this.progressCallback);
  }
}
