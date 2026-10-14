/**
 * 2.5D Isometric Voxel Renderer for Cozy Haven
 * 
 * Creates beautiful isometric 3D view using textured assets
 * Perfect for cozy farming games with depth and dimension
 */

import { GameWorld, CropStage } from '../types/game';
import { TextureManager } from './TextureManager';
import { WindSystem, WindVector } from '../systems/WindSystem';
import { DemoAssets } from '../assets/DemoAssets';


interface Voxel {
  x: number;
  y: number;
  z: number;
  type: 'grass' | 'dirt' | 'grass_hole' | 'water' | 'crop' | 'building' | 'ore' | 'wood' | 'player' | 'road' | 'vehicle' | 'animal';
  color?: string;
  texture?: string;
  height?: number;
  cropType?: string;
  cropStage?: CropStage;
  buildingType?: string;
  dimensions?: { x: number; y: number }; // Dimensions in grid units
  oreType?: string;
  treeType?: string;
  treeFruitStage?: number;
  treeFruitType?: string;
  grassGrowth?: number; // 0.0 to 1.0
  roadType?: 'dirt' | 'paved';
  roadGrade?: 'gravel' | 'paved';
  roadLanes?: 1 | 2;
  roadConnections?: number;
  vehicleType?: 'tractor' | 'truck';
  rotation?: number;
  playerState?: any; // Avoiding circular import issues, just treat as any for rendering
  machineState?: any;
  animalType?: 'chicken' | 'cow' | 'sheep';
  animalState?: any;
  grassNeighbors?: number; // Bitmask: N=1, E=2, S=4, W=8
}

interface IsometricPoint {
  screenX: number;
  screenY: number;
  depth: number;
}

export class IsometricRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private voxels: Voxel[] = [];
  private camera = { x: 0, y: 0, z: 0 };
  /** World bounds from the last render(); picks outside this are rejected. */
  private mapSize: { x: number; y: number } | null = null;
  private tileSize = 64; // Increased for better detail
  private voxelHeight = 16;
  private textureManager: TextureManager;
  private windSystem: WindSystem;
  private playerGridPos: { x: number, y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');
    this.ctx = ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
    this.textureManager = TextureManager.getInstance();
    this.windSystem = WindSystem.getInstance();

    // Set closer default zoom/tile size
    this.tileSize = 64;
  }

  private isTreeCrop(world: GameWorld, x: number, y: number): boolean {
    const plot = world.farmPlots.find(p => Math.floor(p.position.x) === x && Math.floor(p.position.y) === y);
    if (!plot || !plot.crop) return false;

    // List of crops that should use the planting hole visual (Trees)
    // Adding 'apple', 'pear' etc.
    const treeTypes = ['apple', 'pear', 'peach', 'cherry', 'orange', 'apple_tree'];
    return treeTypes.includes(plot.crop.type.toLowerCase());
  }

  /**
   * Convert 3D world coordinates to 2D isometric screen coordinates
   */
  private worldToIsometric(x: number, y: number, z: number): IsometricPoint {
    const isoX = (x - y) * (this.tileSize / 2);
    const isoY = (x + y) * (this.tileSize / 4) - (z * this.voxelHeight);

    return {
      screenX: isoX + this.canvas.width / 2 + this.camera.x,
      screenY: isoY + this.canvas.height / 3 + this.camera.y,
      depth: x + y + z // Simple depth sorting key
    };
  }

  /**
   * Build voxel world from game data
   */
  private buildVoxelWorld(world: GameWorld): void {
    this.voxels = [];

    // Build terrain base layer
    this.buildTerrain(world);

    // Add crops on top
    this.buildCrops(world);

    // Add buildings
    this.buildBuildings(world);

    // Add ore deposits
    this.buildOreDeposits(world);

    // Add wood sources (trees)
    this.buildWoodSources(world);

    // Add animals
    this.buildAnimals(world);

    // Add Player
    const player = world.player;
    if (player && player.position && !player.mountedVehicleId) {
      this.voxels.push({
        x: player.position.x,
        y: player.position.y,
        z: player.position.z || 1,
        type: 'player',
        playerState: player,
        height: 1.5
      });
    }

    // Add Roads
    this.buildRoads(world);

    // Add Vehicles
    this.buildVehicles(world);

    // Sort voxels by depth for proper rendering order
    // Order: lower Z first, then by X+Y
    this.voxels.sort((a, b) => {
      // First compare Z levels
      if (a.z !== b.z) return a.z - b.z;

      // Then compare isometric depth (back to front)
      const depthA = a.x + a.y;
      const depthB = b.x + b.y;
      return depthA - depthB;
    });
  }

  private buildTerrain(world: GameWorld): void {
    // Create base terrain layer
    const worldSize = 40; // Increased render distance

    const centerX = Math.floor(world.mapSize.x / 2); // Assuming map is centered on 10,10 in demo
    // But store.gameStore creates plots at 10,10... let's just render 0-30 for now to match demo area

    const plotSet = new Set(world.farmPlots.map(p => `${Math.floor(p.position.x)},${Math.floor(p.position.y)}`));

    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) {
        const hasPlot = plotSet.has(`${x},${y}`);

        let grassNeighbors = 0;
        if (hasPlot) {
          // Check neighbors (Grid coordinates)
          // If neighbor is NOT a plot, it's grass
          if (!plotSet.has(`${x},${y - 1}`)) grassNeighbors |= 1; // N (Top-Left iso)
          if (!plotSet.has(`${x + 1},${y}`)) grassNeighbors |= 2; // E (Top-Right iso)
          if (!plotSet.has(`${x},${y + 1}`)) grassNeighbors |= 4; // S (Bottom-Right iso)
          if (!plotSet.has(`${x - 1},${y}`)) grassNeighbors |= 8; // W (Bottom-Left iso)
        }

        const growthKey = `${x},${y}`;
        const grassGrowth = world.grassGrowth?.[growthKey] || 0;

        this.voxels.push({
          x,
          y,
          z: 0,
          type: hasPlot ? (this.isTreeCrop(world, x, y) ? 'grass_hole' : 'dirt') : 'grass',
          height: 1,
          grassGrowth: hasPlot ? 0 : grassGrowth,
          grassNeighbors: hasPlot ? grassNeighbors : 0
        });
      }
    }
  }

  private buildCrops(world: GameWorld): void {
    world.farmPlots.forEach((plot) => {
      if (plot.crop) {
        const x = Math.floor(plot.position.x);
        const y = Math.floor(plot.position.y);

        this.voxels.push({
          x,
          y,
          z: 1, // On top of terrain
          type: 'crop',
          cropType: plot.crop.type,
          cropStage: plot.crop.stage
        });
      }
    });
  }

  private buildBuildings(world: GameWorld): void {
    world.buildings.forEach((building) => {
      const x = Math.floor(building.position.x);
      const y = Math.floor(building.position.y);

      this.voxels.push({
        x,
        y,
        z: 1, // Base sits on ground
        type: 'building',
        buildingType: building.type,
        machineState: building.machineState
      });
    });
  }

  private buildOreDeposits(world: GameWorld): void {
    world.oreDeposits.forEach((deposit) => {
      const x = Math.floor(deposit.position.x);
      const y = Math.floor(deposit.position.y);

      this.voxels.push({
        x,
        y,
        z: 1,
        type: 'ore',
        oreType: deposit.oreType
      });
    });
  }

  private buildWoodSources(world: GameWorld): void {
    if (!world.woodSources) return;

    world.woodSources.forEach((source) => {
      // Only render if alive (health > 0)
      if (source.health > 0) {
        const x = Math.floor(source.position.x);
        const y = Math.floor(source.position.y);

        this.voxels.push({
          x,
          y,
          z: 1,
          type: 'wood',
          treeType: source.treeType, // 'oak', 'pine', etc.
          treeFruitStage: source.fruitStage,
          treeFruitType: source.fruitType
        });
      }
    });
  }

  private buildAnimals(world: GameWorld): void {
    if (!world.animals) return;

    world.animals.forEach((animal) => {
      this.voxels.push({
        x: animal.position.x,
        y: animal.position.y,
        z: 1, // Grounded
        type: 'animal',
        animalType: animal.type,
        animalState: animal,
        rotation: animal.rotation
      });
    });
  }

  private buildRoads(world: GameWorld): void {
    if (!world.roads) return;
    world.roads.forEach(road => {
      this.voxels.push({
        x: road.position.x,
        y: road.position.y,
        z: 0.1, // Slightly above ground
        type: 'road',
        roadGrade: road.grade,
        roadLanes: road.lanes,
        roadConnections: road.connections
      });
    });
  }

  private buildVehicles(world: GameWorld): void {
    if (!world.vehicles) return;
    world.vehicles.forEach(vehicle => {
      this.voxels.push({
        x: vehicle.position.x,
        y: vehicle.position.y,
        z: vehicle.position.z,
        type: 'vehicle',
        vehicleType: vehicle.type,
        rotation: vehicle.rotation,
        playerState: world.player.mountedVehicleId === vehicle.id ? world.player : undefined
      });
    });
  }

  /**
   * Draw a single voxel in isometric view
   */
  private drawVoxel(voxel: Voxel): void {
    const iso = this.worldToIsometric(voxel.x, voxel.y, voxel.z);

    this.ctx.save();

    if (voxel.type === 'grass' || voxel.type === 'dirt') {
      this.drawTerrainTile(iso, voxel);
    } else if (voxel.type === 'crop' && voxel.cropType) {
      this.drawCrop(iso, voxel.cropType, voxel.cropStage || CropStage.SEED, voxel.x, voxel.y);
    } else if (voxel.type === 'building' && voxel.buildingType) {
      this.drawBuilding(iso, voxel.buildingType, voxel.machineState);
    } else if (voxel.type === 'animal' && voxel.animalType) {
      this.drawAnimal(iso, voxel.animalType, voxel.animalState);
    } else if (voxel.type === 'ore' && voxel.oreType) {
      this.drawOre(iso, voxel.oreType);
    } else if (voxel.type === 'wood' && voxel.treeType) {
      this.drawTree(iso, voxel.treeType, voxel);
    } else if (voxel.type === 'player') {
      this.drawPlayer(iso, voxel);
    } else if (voxel.type === 'road' && (voxel.roadGrade || voxel.roadType)) {
      this.drawRoad(iso, voxel.roadGrade || (voxel.roadType === 'paved' ? 'paved' : 'gravel'), voxel.roadLanes || 1, voxel.roadConnections || 0);
    } else if (voxel.type === 'vehicle' && voxel.vehicleType) {
      this.drawVehicle(iso, voxel);
    }

    this.ctx.restore();
  }

  private drawTerrainTile(iso: IsometricPoint, voxel: Voxel): void {
    const type = voxel.type as 'grass' | 'dirt' | 'grass_hole';
    // Try to get texture
    const textureId = `tile_${type}`;
    const texture = this.textureManager.getTexture(textureId);

    if (texture) {
      // Draw textured tile
      // We need to transform the flat square texture into a diamond
      // Or if the texture is already a diamond (iso tile), draw it directly

      // Assuming texture is a flat square for now, we project it
      // Simple approach: Draw image w/ transform

      // Calculate dimensions
      const width = this.tileSize;
      const height = this.tileSize / 2;

      this.ctx.drawImage(
        texture.image,
        iso.screenX - width / 2,
        iso.screenY - height / 2,
        width,
        height
      );

    } else {
      // Fallback to colors with Premium Variation Logic
      const variation = this.getTileVariation(voxel.x, voxel.y);

      let color: string;
      let sideColor: string;

      if (type === 'grass') {
        // Base: #4CAF50
        // Variation: Shift hue/brightness slightly
        const greens = ['#4CAF50', '#4BB543', '#56AE57', '#62B665', '#45A049'];
        color = greens[Math.floor(variation * greens.length)];
        // Darker side
        sideColor = '#388E3C';
      } else {
        // Base: #795548
        const browns = ['#795548', '#6D4C41', '#8D6E63', '#5D4037', '#543D36'];
        color = browns[Math.floor(variation * browns.length)];
        sideColor = '#5D4037';
      }

      this.drawDiamond(iso.screenX, iso.screenY, this.tileSize, this.tileSize / 2, color, sideColor);

      // --- DETAIL OVERLAY PASS ---
      if (type === 'grass') {
        this.drawGrassDetails(iso, variation, voxel.grassGrowth || 0);
      } else {
        this.drawDirtDetails(iso, variation);

        // Draw Grass Transitions on Dirt
        if (voxel.grassNeighbors) {
          this.drawGrassTransitions(iso, voxel.grassNeighbors);
        }
      }
    }
  }

  private getTileVariation(x: number, y: number): number {
    const val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return val - Math.floor(val);
  }

  private drawGrassDetails(iso: IsometricPoint, variation: number, growth: number): void {
    const { screenX, screenY } = iso;
    const size = this.tileSize;

    // Draw 2-3 small clumps of grass (Flat details)
    const numClumps = Math.floor(variation * 3) + 1;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Highlight blades
    this.ctx.lineWidth = 1;

    for (let i = 0; i < numClumps; i++) {
      const ox = (this.getTileVariation(variation, i) - 0.5) * (size * 0.4);
      const oy = (this.getTileVariation(i, variation) - 0.5) * (size * 0.2);

      this.ctx.beginPath();
      this.ctx.moveTo(screenX + ox, screenY + oy);
      this.ctx.lineTo(screenX + ox - 2, screenY + oy - 4);
      this.ctx.moveTo(screenX + ox, screenY + oy);
      this.ctx.lineTo(screenX + ox + 2, screenY + oy - 5);
      this.ctx.stroke();
    }

    // --- TALL GRASS BILLBOARDS (2.5D) ---
    if (growth > 0.3) {
      const numBillboards = Math.floor(growth * 4);
      const texture = this.textureManager.getTexture('grass_tall');

      const wind = this.windSystem.getWindAt(screenX / 100, screenY / 100);
      const sway = wind.x * 0.2;

      for (let i = 0; i < numBillboards; i++) {
        // Seeded offsets for consistent placement
        const ox = (this.getTileVariation(variation + 0.1, i) - 0.5) * (size * 0.6);
        const oy = (this.getTileVariation(i + 0.2, variation) - 0.5) * (size * 0.3);

        this.ctx.save();
        this.ctx.translate(screenX + ox, screenY + oy);

        // Sway pivot at base
        this.ctx.transform(1, 0, sway, 1, 0, 0);

        if (texture) {
          const bScale = 0.5 + (growth * 0.5); // Taller grass with growth
          const w = 24 * bScale;
          const h = 24 * bScale;
          this.ctx.drawImage(texture.image, -w / 2, -h, w, h);
        } else {
          // Procedural fallback for tall blades
          this.ctx.strokeStyle = '#388E3C';
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(-2, -15 * growth);
          this.ctx.stroke();
        }
        this.ctx.restore();
      }
    }

    // Rare Wildflower
    if (variation > 0.95) {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(screenX + 5, screenY - 5, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFEB3B'; // Yellow center
      this.ctx.beginPath();
      this.ctx.arc(screenX + 5, screenY - 5, 0.6, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawGrassTransitions(iso: IsometricPoint, mask: number): void {
    const { screenX, screenY } = iso;
    const size = this.tileSize;
    const hSize = size / 2;

    this.ctx.fillStyle = '#4CAF50'; // Grass color

    // Smooth overlap width
    const overlap = 4;

    // 1: Top-Right Edge (N neighbor, NE visual edge)
    if (mask & 1) {
      this.drawEdgeSpikes(screenX, screenY - hSize / 2, screenX + size / 2, screenY);
    }

    // 2: Bottom-Right Edge (E neighbor, SE visual edge)
    if (mask & 2) {
      this.drawEdgeSpikes(screenX + size / 2, screenY, screenX, screenY + hSize / 2);
    }

    // 4: Bottom-Left Edge (S neighbor, SW visual edge)
    if (mask & 4) {
      this.drawEdgeSpikes(screenX, screenY + hSize / 2, screenX - size / 2, screenY);
    }

    // 8: Top-Left Edge (W neighbor, NW visual edge)
    if (mask & 8) {
      this.drawEdgeSpikes(screenX - size / 2, screenY, screenX, screenY - hSize / 2);
    }
  }

  private drawEdgeSpikes(x1: number, y1: number, x2: number, y2: number): void {
    const spikes = 5;

    const dx = (x2 - x1) / spikes;
    const dy = (y2 - y1) / spikes;

    // Draw fuzzy edge using multiple small overlaps
    // Instead of complex curves, we'll draw "tufts" along the seam
    this.ctx.fillStyle = '#4CAF50';

    for (let i = 0; i <= spikes; i++) {
      const cx = x1 + dx * i;
      const cy = y1 + dy * i;

      // Random offset
      const ox = (Math.random() - 0.5) * 5;
      const oy = (Math.random() - 0.5) * 5;

      this.ctx.beginPath();
      this.ctx.arc(cx + ox, cy + oy, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawDirtDetails(iso: IsometricPoint, variation: number): void {
    const { screenX, screenY } = iso;
    const size = this.tileSize;

    // Draw 1-2 small "pebbles"
    const numPebbles = Math.floor(variation * 2) + 1;
    for (let i = 0; i < numPebbles; i++) {
      const ox = (this.getTileVariation(variation * 2, i) - 0.5) * (size * 0.6);
      const oy = (this.getTileVariation(i * 3, variation) - 0.5) * (size * 0.3);

      this.ctx.fillStyle = i % 2 === 0 ? '#9E9E9E' : '#BDBDBD';
      this.ctx.beginPath();
      this.ctx.ellipse(screenX + ox, screenY + oy, 2, 1, Math.PI / 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Subtle crack/line
    if (variation < 0.1) {
      this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX - 10, screenY - 5);
      this.ctx.quadraticCurveTo(screenX, screenY, screenX + 12, screenY - 8);
      this.ctx.stroke();
    }
  }


  private drawDiamond(x: number, y: number, width: number, height: number, color: string, sideColor: string): void {
    // Draw side (thickness)
    const thickness = 10;
    this.ctx.fillStyle = sideColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x - width / 2, y);
    this.ctx.lineTo(x, y + height / 2);
    this.ctx.lineTo(x + width / 2, y);
    this.ctx.lineTo(x + width / 2, y + thickness);
    this.ctx.lineTo(x, y + height / 2 + thickness);
    this.ctx.lineTo(x - width / 2, y + thickness);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw top
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - height / 2);
    this.ctx.lineTo(x + width / 2, y);
    this.ctx.lineTo(x, y + height / 2);
    this.ctx.lineTo(x - width / 2, y);
    this.ctx.closePath();
    this.ctx.fill();

    // Subtle Grain Texture (Stable)
    this.ctx.save();
    this.ctx.globalAlpha = 0.04;
    this.ctx.fillStyle = '#000000';
    // Use x,y to seed the random grain so it doesn't flicker
    for (let i = 0; i < 15; i++) {
      const seed1 = Math.sin(x * 12.9898 + y * 78.233 + i) * 43758.5453;
      const v1 = seed1 - Math.floor(seed1);
      const seed2 = Math.cos(x * 34.1234 + y * 56.789 + i) * 12345.6789;
      const v2 = seed2 - Math.floor(seed2);

      const gx = (v1 - 0.5) * width;
      const gy = (v2 - 0.5) * height;
      this.ctx.fillRect(x + gx, y + gy, 1, 1);
    }
    this.ctx.restore();

    // Highlight
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    this.ctx.stroke();
  }

  private drawCrop(iso: IsometricPoint, type: string, stage: CropStage, gridX: number, gridY: number): void {
    // Map stage enum (0-4) to phase folder (1-5)
    let phase = 1;
    if (stage === CropStage.DEAD) {
      phase = 5;
    } else {
      phase = Math.min(5, Math.floor(stage) + 1);
    }

    const textureId = `crop_${type}_phase${phase}`;
    const texture = this.textureManager.getTexture(textureId);

    if (texture) {
      // Scale crop relative to tile
      // 2.5D assets are 64x64, tile is usually 32-48. 
      // We want them to feel lush, so scale 1.1 relative to tile
      const scale = 1.1;
      const width = this.tileSize * scale;
      const height = width * (texture.height / texture.width);

      // --- Wind Logic ---
      const wind = this.windSystem.getWindAt(gridX, gridY);

      const swayAmount = wind.strength * 0.15;
      let skewX = wind.x * swayAmount;

      // --- Interaction Logic (Squish) ---
      let interactionSquish = 0;
      let interactionStretch = 0;

      // Check precise grid position
      if (this.playerGridPos && Math.round(this.playerGridPos.x) === gridX && Math.round(this.playerGridPos.y) === gridY) {
        interactionSquish = -0.4; // Flatten significantly for impact
        interactionStretch = 0.25; // Widen
      }

      // Cozy breathing effect
      const breathe = Math.sin(Date.now() / 600 + gridX + gridY) * 0.02;

      // Squash & Stretch Logic (Wind + Breathe + Interaction):
      const squashFactor = 1.0 - (Math.abs(skewX) * 0.2) + breathe + interactionSquish;
      const stretchFactor = 1.0 + (Math.abs(skewX) * 0.1) - breathe + interactionStretch;

      // --- Segmented Rendering ---
      // 2.5D Assets have stems at bottom ~25%.
      const baseHeightRatio = 0.25;

      const drawX = iso.screenX - width / 2;
      const drawY = iso.screenY - height; // Grounded at iso.screenY

      // 1. Draw Stationary Base (Roots/Grounded part)
      (this.ctx as any).drawImage(
        texture.image,
        0, texture.height * (1.0 - baseHeightRatio), texture.width, texture.height * baseHeightRatio,
        drawX, drawY + height * (1.0 - baseHeightRatio), width, height * baseHeightRatio
      );

      // 2. Draw Wind-Affected Tops
      this.ctx.save();

      // Pivot at the boundary
      const pivotX = iso.screenX;
      const pivotY = drawY + height * (1.0 - baseHeightRatio);

      this.ctx.translate(pivotX, pivotY);
      this.ctx.scale(stretchFactor, squashFactor);
      this.ctx.transform(1, 0, skewX, 1, 0, 0);
      this.ctx.translate(-pivotX, -pivotY);

      (this.ctx as any).drawImage(
        texture.image,
        0, 0, texture.width, texture.height * (1.0 - baseHeightRatio),
        drawX, drawY, width, height * (1.0 - baseHeightRatio)
      );

      // --- Happy Reaction / Particles ---
      if (wind.strength > 0.6 && stage >= CropStage.MATURE) {
        this.drawHappyReaction(iso, wind.strength, pivotY);
      }

      this.ctx.restore();

    } else {
      // Fallback
      this.ctx.fillStyle = stage === CropStage.HARVESTABLE ? 'gold' : 'green';
      this.ctx.beginPath();
      this.ctx.arc(iso.screenX, iso.screenY - 10, 10, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawBuilding(iso: IsometricPoint, type: string, machineState?: any): void {
    const textureId = `building_${type}`;
    const texture = this.textureManager.getTexture(textureId);

    if (texture) {
      // Buildings are larger, maybe 2x2 scale usually, but for now 1x1 base
      const scale = 2.0;
      const width = this.tileSize * scale;
      const height = width * (texture.height / texture.width);

      this.ctx.drawImage(
        texture.image,
        iso.screenX - width / 2,
        iso.screenY - height, // Grounded at iso.screenY
        width,
        height
      );
    } else if (type.startsWith('sprinkler')) {
      // Procedural fallback for sprinklers
      const size = 16;
      const height = 24;

      this.ctx.fillStyle = type === 'sprinkler_quality' ? '#FFD700' : '#8D6E63'; // Gold or Copper
      // Draw cylinder-ish shape
      this.ctx.fillRect(iso.screenX - size / 2, iso.screenY - height, size, height);

      // Top cap
      this.ctx.fillStyle = type === 'sprinkler_quality' ? '#FFF59D' : '#D7CCC8';
      this.ctx.beginPath();
      this.ctx.ellipse(iso.screenX, iso.screenY - height, size / 2, size / 4, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Nozzles
      this.ctx.beginPath();
      this.ctx.arc(iso.screenX, iso.screenY - height + 5, 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (type === 'preserves_jar' || type === 'keg') {
      // Draw Machine procedural art
      const size = 30;
      const height = 40;

      this.ctx.fillStyle = type === 'keg' ? '#5D4037' : '#90A4AE'; // Brown Keg, Grey Jar
      this.ctx.fillRect(iso.screenX - size / 2, iso.screenY - height, size, height);

      // Detail lines
      this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(iso.screenX - size / 2, iso.screenY - height, size, height);

      // Bubble if processing
      if (machineState) {
        this.drawProcessingBubble(iso, machineState);
      }
    } else {
      // Fallback
      this.ctx.fillStyle = 'brown';
      this.ctx.fillRect(iso.screenX - 10, iso.screenY - 20, 20, 20);
    }
  }

  private drawAnimal(iso: IsometricPoint, type: string, state: any): void {
    const time = Date.now();
    const bob = Math.abs(Math.sin(time / 200)) * 5;
    const x = iso.screenX;
    const y = iso.screenY - bob;

    // Draw animal body (procedural)
    this.ctx.fillStyle = type === 'chicken' ? '#FFFFFF' : type === 'cow' ? '#795548' : '#ECEFF1';
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    const size = type === 'chicken' ? 12 : 24;

    this.ctx.beginPath();
    if (type === 'chicken') {
      this.ctx.arc(x, y - size / 2, size / 2, 0, Math.PI * 2);
    } else {
      this.ctx.roundRect(x - size / 2, y - size, size, size, 4);
    }
    this.ctx.fill();
    this.ctx.stroke();

    // Eyes
    this.ctx.fillStyle = 'black';
    const eyeOffset = type === 'chicken' ? 3 : 6;
    this.ctx.beginPath();
    this.ctx.arc(x - eyeOffset, y - size + eyeOffset, 2, 0, Math.PI * 2);
    this.ctx.arc(x + eyeOffset, y - size + eyeOffset, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Product Bubble
    if (state.hasProduct) {
      this.drawProcessingBubble(iso, { isFinished: true });
    }

    // Hunger/Affection bar (small, discrete)
    if (state.hunger < 30) {
      this.ctx.fillStyle = '#f44336';
      this.ctx.fillRect(x - 10, y - size - 15, 20 * (state.hunger / 100), 3);
    }
  }

  private drawOre(iso: IsometricPoint, type: string): void {
    // Assuming ores might map to rock decorations or specific ore assets
    // For now, let's look for `ore_{type}` or just use a generic rock
    const textureId = `ore_${type}`;
    // Or maybe check if we have it?
    // If not, use fallback

    // We don't have ore assets yet, so let's fallback to simplified drawing
    this.ctx.fillStyle = type === 'gold' ? '#FFD700' : '#A9A9A9';
    this.ctx.beginPath();
    this.ctx.ellipse(iso.screenX, iso.screenY - 5, 15, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.ctx.ellipse(iso.screenX + 5, iso.screenY - 8, 5, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawTree(iso: IsometricPoint, type: string, voxel: Voxel): void {
    const time = Date.now();
    const fruitStage = voxel.treeFruitStage || 0;

    // Calculate wind at this position for sway
    const wind = this.windSystem.getWindAt(iso.screenX / 100, iso.screenY / 100);
    const sway = wind.x * 0.15;

    // Parts config
    const isOak = type.includes('oak');
    const prefix = isOak ? 'tree_oak' : 'tree_oak'; // Fallback to oak for now

    const parts = [
      { id: `${prefix}_shadow`, type: 'shadow', swayScale: 0 },
      { id: `${prefix}_trunk`, type: 'trunk', swayScale: 0.1 },
      { id: `${prefix}_canopy_back`, type: 'canopy', swayScale: 1.0 },
      { id: `${prefix}_canopy_front`, type: 'canopy', swayScale: 1.2 },
      { id: `${prefix}_fruit`, type: 'fruit', swayScale: 1.2, visible: fruitStage > 0 }
    ];

    this.ctx.save();

    parts.forEach(p => {
      if (p.visible === false) return;

      const texture = this.textureManager.getTexture(p.id);

      this.ctx.save();
      this.ctx.translate(iso.screenX, iso.screenY);

      // Apply sway pivot at base, scaled by layer (trunk sways less than leaves)
      this.ctx.transform(1, 0, sway * p.swayScale, 1, 0, 0);

      if (texture) {
        const scale = 2.0; // Standard premium scale
        const width = this.tileSize * scale;
        const height = width * (texture.height / texture.width);

        // Fruit stage scaling
        let fruitAlpha = 1.0;
        if (p.type === 'fruit') {
          // Adjust alpha or scale based on fruitStage (1: budding, 2: small, 3: ripe)
          fruitAlpha = fruitStage === 1 ? 0.3 : fruitStage === 2 ? 0.7 : 1.0;
        }

        this.ctx.globalAlpha = fruitAlpha;
        this.ctx.drawImage(texture.image, -width / 2, -height, width, height);
      } else {
        // Fallback for missing parts
        if (p.type === 'trunk') {
          this.ctx.fillStyle = '#5D4037';
          this.ctx.fillRect(-4, -40, 8, 40);
        } else if (p.type === 'canopy' && p.id.includes('front')) {
          this.ctx.fillStyle = '#4CAF50';
          this.ctx.beginPath();
          this.ctx.arc(0, -60, 30, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      this.ctx.restore();
    });

    this.ctx.restore();
  }

  private drawPlayer(iso: IsometricPoint, voxel: Voxel): void {
    const player = voxel.playerState;
    if (!player) return;

    const action = player.animation?.action || 'idle';
    const isWorking = player.animation?.isPlaying;

    // Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(iso.screenX, iso.screenY, 12, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Bobbing animation for idle
    const bob = action === 'idle' ? Math.sin(Date.now() / 200) * 2 : 0;
    const anchorY = iso.screenY;

    // Body Color based on action? Or typical clothes
    this.ctx.fillStyle = '#1E88E5'; // Blue shirt

    // Draw Body (Capsule)
    this.ctx.beginPath();
    this.ctx.ellipse(iso.screenX, anchorY - 15 + bob, 8, 12, 0, 0, Math.PI * 2);
    this.ctx.fill();
    // Head
    this.ctx.fillStyle = '#FFCC80'; // Skin tone
    this.ctx.beginPath();
    this.ctx.arc(iso.screenX, anchorY - 30 + bob, 8, 0, Math.PI * 2);
    this.ctx.fill();

    // Hat (Straw hat!)
    this.ctx.fillStyle = '#E6C348';
    this.ctx.beginPath();
    this.ctx.ellipse(iso.screenX, anchorY - 34 + bob, 12, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(iso.screenX, anchorY - 34 + bob, 6, Math.PI, 0);
    this.ctx.fill();

    // Arms / Tools
    if (isWorking && action !== 'idle' && action !== 'walk') {
      const toolColor = '#A1887F'; // Generic tool handle

      // Simple swing animation
      const swing = Math.sin(Date.now() / 100) * 20;

      this.ctx.save();
      this.ctx.translate(iso.screenX + 5, anchorY - 20 + bob);
      this.ctx.rotate(swing * Math.PI / 180);

      // Tool handle
      this.ctx.fillStyle = toolColor;
      this.ctx.fillRect(-2, -15, 4, 30);

      // Tool Head (generic)
      this.ctx.fillStyle = '#757575'; // Metal
      if (action === 'hoe' || action === 'axe') {
        this.ctx.fillRect(-8, -15, 16, 5);
      } else if (action === 'pickaxe') {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(-10, -5);
        this.ctx.lineTo(10, -5);
        this.ctx.fill();
      } else if (action === 'water') {
        this.ctx.fillStyle = '#4FC3F7';
        this.ctx.fillRect(-5, -10, 10, 10);
      }

      this.ctx.restore();
    }
  }

  private drawRoad(iso: IsometricPoint, grade: 'gravel' | 'paved', lanes: 1 | 2, connections: number): void {
    const textureId = `road_${grade}_${lanes}_mask${connections}`;
    const texture = this.textureManager.getTexture(textureId);

    if (texture) {
      const width = this.tileSize;
      const height = this.tileSize / 2;

      this.ctx.drawImage(
        texture.image,
        iso.screenX - width / 2,
        iso.screenY - height / 2,
        width,
        height
      );
    } else {
      // Trigger lazy load
      const svgData = DemoAssets.getRoadAsset(textureId);
      this.textureManager.loadTexture({
        id: textureId,
        path: svgData
      });

      // Fallback drawing while loading
      const color = grade === 'gravel' ? '#8D6E63' : '#333333';
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(iso.screenX, iso.screenY - this.tileSize / 4);
      this.ctx.lineTo(iso.screenX + this.tileSize / 2, iso.screenY);
      this.ctx.lineTo(iso.screenX, iso.screenY + this.tileSize / 4);
      this.ctx.lineTo(iso.screenX - this.tileSize / 2, iso.screenY);
      this.ctx.fill();
    }
  }

  private drawVehicle(iso: IsometricPoint, voxel: Voxel): void {
    const type = voxel.vehicleType;
    const rotation = voxel.rotation || 0;
    const isMoving = voxel.playerState?.animation?.action === 'walk'; // Approximation if player is inside
    const time = Date.now();

    // Map rotation (0-360) to 4 iso directions (0: SE, 1: SW, 2: NW, 3: NE)
    const directions = ['se', 'sw', 'nw', 'ne'];
    const dirIndex = Math.floor(((rotation + 45) % 360) / 90);
    const dirSuffix = directions[dirIndex] || 'se';

    const textureId = `vehicle_${type}_${dirSuffix}`;
    const texture = this.textureManager.getTexture(textureId);

    // DEBUG: Log vehicle rendering
    if (Math.random() < 0.01) { // Throttle logs
      console.log('Rendering Vehicle:', { type, dirSuffix, textureId, hasTexture: !!texture, w: texture?.width, h: texture?.height });
    }

    if (texture) {
      // 1. DIESEL BOUNCE (Idle animation)
      const bounce = Math.sin(time / 150) * 0.02;
      const idleScale = 1.0 + (isMoving ? 0 : bounce);

      // 2. MOVEMENT TILT
      const tilt = isMoving ? Math.sin(time / 100) * 0.05 : 0;

      const baseScale = 1.3;
      const width = this.tileSize * baseScale * idleScale;
      const height = width * (texture.height / texture.width);

      // Higher-fidelity SVG pivot. 
      const pivotY = 0.65;

      this.ctx.save();
      this.ctx.translate(iso.screenX, iso.screenY);

      // Apply movement tilt
      if (isMoving) {
        this.ctx.rotate(tilt);
      }

      this.ctx.drawImage(
        texture.image,
        -width / 2,
        -height * pivotY,
        width,
        height
      );

      // 3. EXHAUST PUFFS (if tractor)
      if (type === 'tractor' && time % 500 < 50) {
        // Emit particle logic could be added here or in world update
      }

      // Draw driver head if mounted
      if (voxel.playerState) {
        this.ctx.fillStyle = '#FFCC80';
        this.ctx.beginPath();
        this.ctx.arc(0, -height * 0.45, 6, 0, Math.PI * 2);
        this.ctx.fill();
        // Hat
        this.ctx.fillStyle = '#E6C348';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -height * 0.45 - 5, 8, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    } else {
      // Fallback: draw placeholder box
      const color = type === 'tractor' ? '#D32F2F' : '#1976D2'; // Red tractor, Blue truck

      // Draw vehicle body
      this.ctx.fillStyle = color;
      // Boxy shape
      const width = 40;
      const height = 30;

      const x = iso.screenX - width / 2;
      const y = iso.screenY - height;

      this.ctx.fillRect(x, y, width, height);

      this.ctx.fillStyle = '#111';
      this.ctx.fillRect(x + 5, y + 5, 10, 20); // Window?
    }

    // 3. EXHAUST PUFFS (if tractor) - Moved from drawTractorComponents
    if (type === 'tractor' && isMoving && time % 200 < 20) {
      // Offset relative to center (approx where exhaust stack is)
      // Rotation is in degrees.
      const rotRad = (voxel.rotation || 0) * (Math.PI / 180);
      // Exhaust is slightly behind and to left of center in model space
      const offsetX = Math.cos(rotRad) * -0.3 - Math.sin(rotRad) * -0.2;
      const offsetY = Math.sin(rotRad) * -0.3 + Math.cos(rotRad) * -0.2;

      this.windSystem.addParticle({
        x: voxel.x + 0.5 + offsetX,
        y: voxel.y + 0.5 + offsetY,
        z: (voxel.z || 0) + 1.2, // High up
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: 1.0 + Math.random(), // Upwards
        life: 1.5,
        maxLife: 1.5,
        type: 'exhaust',
        scale: 0.3 + Math.random() * 0.2, // Small puff
        rotation: Math.random() * 6.28,
        rotationSpeed: Math.random() - 0.5
      });
    }

    this.ctx.restore();
  }

  /**
   * Main render function
   */
  render(world: GameWorld): void {
    const { width, height } = this.canvas;
    this.mapSize = world.mapSize;

    // Cache player position for interactive effects
    if (world.player) {
      this.playerGridPos = {
        x: Math.round(world.player.position.x),
        y: Math.round(world.player.position.y)
      };
    } else {
      this.playerGridPos = null;
    }

    // Update wind
    this.windSystem.update(0.016); // Approx 60fps dt

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw background/sky
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(1, '#E0F7FA');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Build and render voxels
    this.buildVoxelWorld(world);

    this.voxels.forEach(voxel => {
      this.drawVoxel(voxel);
    });

    // Draw Wind Particles
    this.drawWindParticles(world);

    // Draw UI overlay
    this.drawUI(world);
  }

  private drawUI(world: GameWorld): void {
    // Draw info panel
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.roundRect(10, this.canvas.height - 70, 400, 60, 10);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `Coins: ${world.player.coins}`,
      30,
      this.canvas.height - 45
    );
    this.ctx.fillText(
      `Level: ${world.player.level}`,
      30,
      this.canvas.height - 20
    );

    // Right side stats
    this.ctx.fillText(
      `Crops: ${world.farmPlots.filter(p => p.crop).length}`,
      200,
      this.canvas.height - 45
    );
    this.ctx.fillText(
      `Day: ${world.totalDaysPlayed + 1}`,
      200,
      this.canvas.height - 20
    );

    // Clock
    const hour = Math.floor(world.dayTime / 60) % 24;
    const minute = Math.floor(world.dayTime % 60);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(timeString, this.canvas.width - 30, 40);
  }

  /**
   * Camera controls
   */
  setCamera(x: number, y: number, z: number = 0): void {
    this.camera = { x, y, z };
  }

  moveCamera(dx: number, dy: number, dz: number = 0): void {
    this.camera.x += dx;
    this.camera.y += dy;
    this.camera.z += dz;
  }

  /**
   * Inverse of worldToIsometric on the ground plane (z = 0).
   * Diamonds are centered on the grid point, so the nearest integer is the
   * drawn tile; floor would pick the neighbor on the top-left half of each tile.
   * Returns null outside world.mapSize once render() has cached it.
   */
  screenToVoxel(screenX: number, screenY: number): { x: number; y: number } | null {
    const relX = screenX - this.canvas.width / 2 - this.camera.x;
    const relY = screenY - this.canvas.height / 3 - this.camera.y;

    // isoX = (x - y) * (tileSize / 2)
    // isoY = (x + y) * (tileSize / 4)
    const halfTile = this.tileSize / 2;
    const quarterTile = this.tileSize / 4;
    const gridX = Math.round(relX / halfTile / 2 + relY / quarterTile / 2);
    const gridY = Math.round(relY / quarterTile / 2 - relX / halfTile / 2);

    if (!Number.isFinite(gridX) || !Number.isFinite(gridY)) return null;
    if (gridX < 0 || gridY < 0) return null;
    if (this.mapSize && (gridX >= this.mapSize.x || gridY >= this.mapSize.y)) return null;

    return { x: gridX, y: gridY };
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private drawWindParticles(world: GameWorld): void {
    const particles = this.windSystem.getParticles();

    particles.forEach(p => {
      const iso = this.worldToIsometric(p.x, p.y, p.z);

      // Don't draw if off screen
      if (iso.screenX < -50 || iso.screenX > this.canvas.width + 50 ||
        iso.screenY < -50 || iso.screenY > this.canvas.height + 50) return;

      this.ctx.save();
      this.ctx.translate(iso.screenX, iso.screenY);
      this.ctx.rotate(p.rotation);

      this.ctx.globalAlpha = Math.min(1.0, p.life / 2); // Fade out

      if (p.type === 'dandelion') {
        // White fluffy dot
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 2 * p.scale, 0, Math.PI * 2);
        this.ctx.fill();
        // Little fluff halo
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4 * p.scale, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'pollen') {
        // Tiny gold speck
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(-1, -1, 2, 2);
      } else if (p.type === 'leaf') {
        // Spinning green leaf
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 4 * p.scale, 2 * p.scale, 0, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'exhaust') {
        // Dark gray puff
        this.ctx.fillStyle = `rgba(80, 80, 80, ${Math.max(0, p.life / p.maxLife * 0.5)})`;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5 * p.scale * (1 + (p.maxLife - p.life)), 0, Math.PI * 2); // Expands as it dies
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  private drawHappyReaction(iso: IsometricPoint, windStrength: number, topPivotY: number): void {
    const intensity = (windStrength - 0.5) / 0.5;
    const opacity = Math.min(1.0, intensity * 1.2);
    const breath = Math.sin(Date.now() / 300) * 1.5;

    this.ctx.save();

    // Wind-specific offset: blush/sparkles shift slightly in direction of wind
    const wind = this.windSystem.getWindAt(iso.screenX / 100, iso.screenY / 100);
    const windShift = wind.x * 4;

    const centerX = iso.screenX + windShift;
    const centerY = topPivotY - 18 + breath; // Offset from the segment boundary

    this.ctx.globalAlpha = opacity;

    // 1. BLUSH (Shifted slightly with the breeze)
    const blushColor = 'rgba(255, 182, 193, 0.6)';
    this.ctx.fillStyle = blushColor;
    this.ctx.beginPath(); this.ctx.arc(centerX - 10, centerY + 6, 5, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.beginPath(); this.ctx.arc(centerX + 10, centerY + 6, 5, 0, Math.PI * 2); this.ctx.fill();

    // 2. EYES
    this.ctx.strokeStyle = '#2D0B0B';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';

    // Left Eye
    this.ctx.beginPath(); this.ctx.arc(centerX - 8, centerY, 4, Math.PI * 1.1, Math.PI * 1.9); this.ctx.stroke();
    // Right Eye
    this.ctx.beginPath(); this.ctx.arc(centerX + 8, centerY, 4, Math.PI * 1.1, Math.PI * 1.9); this.ctx.stroke();

    // 3. MOUTH
    this.ctx.lineWidth = 2;
    this.ctx.beginPath(); this.ctx.arc(centerX, centerY + 4, 3, 0.2, Math.PI - 0.2); this.ctx.stroke();

    // 4. EMOTION SPARKLES
    if (intensity > 0.8) {
      this.drawCozySparkles(centerX, centerY, intensity);
    }

    this.ctx.restore();
  }

  private drawCozySparkles(x: number, y: number, intensity: number): void {
    const time = Date.now();

    // Sparkle 1 (Top Right)
    const s1Scale = (Math.sin(time / 200) + 1) / 2 * 0.8;
    this.drawSparkle(x + 12, y - 12, s1Scale, '#FFD700'); // Gold

    // Sparkle 2 (Top Left)
    const s2Scale = (Math.cos(time / 250) + 1) / 2 * 0.6;
    this.drawSparkle(x - 14, y - 10, s2Scale, '#FFFFFF'); // White

    // Sparkle 3 (Bottom Right - tiny)
    const s3Scale = (Math.sin(time / 150 + 1) + 1) / 2 * 0.5;
    this.drawSparkle(x + 16, y + 2, s3Scale, '#FFFACD'); // LemonChiffon
  }

  private drawSparkle(x: number, y: number, scale: number, color: string): void {
    if (scale <= 0.1) return;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.fillStyle = color;

    // Draw 4-point star
    this.ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      this.ctx.rotate(Math.PI / 2);
      this.ctx.moveTo(0, 0);
      this.ctx.quadraticCurveTo(2, 2, 0, 5); // Curve out
      this.ctx.quadraticCurveTo(-2, 2, 0, 0); // Curve back
    }
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawProcessingBubble(iso: IsometricPoint, state: any): void {
    const time = Date.now();
    const float = Math.sin(time / 400) * 5;
    const x = iso.screenX;
    const y = iso.screenY - 60 + float;

    // Draw bubble
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(x, y, 15, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    if (state.isFinished) {
      // Completed icon (e.g., Output Item id)
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillText('!', x, y + 6);
    } else {
      // Progress bar
      const progress = 1 - (state.duration / 300); // Placeholder max duration
      this.ctx.fillStyle = '#E0E0E0';
      this.ctx.fillRect(x - 10, y - 2, 20, 4);
      this.ctx.fillStyle = '#2196F3';
      this.ctx.fillRect(x - 10, y - 2, 20 * Math.max(0, progress), 4);
    }
  }

  dispose(): void {
    this.voxels = [];
  }
}
