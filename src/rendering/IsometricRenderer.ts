/**
 * 2.5D Isometric Voxel Renderer for Cozy Haven
 * 
 * Creates beautiful isometric 3D view using voxel-based rendering
 * Perfect for cozy farming games with depth and dimension
 */

import { GameWorld, CropStage } from '../types/game';

interface Voxel {
  x: number;
  y: number;
  z: number;
  type: 'grass' | 'dirt' | 'water' | 'crop' | 'building' | 'ore';
  color?: string;
  texture?: string;
  height?: number;
  cropType?: string;
  cropStage?: CropStage;
  buildingType?: string;
  oreType?: string;
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
  private tileSize = 32;
  private voxelHeight = 16;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');
    this.ctx = ctx;
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
      depth: x + y + z
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
    
    // Sort voxels by depth for proper rendering order
    this.voxels.sort((a, b) => {
      const depthA = a.x + a.y + a.z;
      const depthB = b.x + b.y + b.z;
      return depthA - depthB;
    });
  }

  private buildTerrain(world: GameWorld): void {
    // Create base terrain layer
    const worldSize = 20;
    
    for (let x = 0; x < worldSize; x++) {
      for (let y = 0; y < worldSize; y++) {
        // Check if there's a farm plot here
        const hasPlot = world.farmPlots.some(plot => 
          Math.floor(plot.position.x) === x && Math.floor(plot.position.y) === y
        );
        
        this.voxels.push({
          x,
          y,
          z: 0,
          type: hasPlot ? 'dirt' : 'grass',
          color: hasPlot ? '#8B4513' : '#228B22'
        });
      }
    }
  }

  private buildCrops(world: GameWorld): void {
    world.farmPlots.forEach((plot) => {
      if (plot.crop) {
        const x = Math.floor(plot.position.x);
        const y = Math.floor(plot.position.y);
        
        // Calculate crop height based on growth stage
        let cropHeight = 1;
        let cropColor = '#90EE90';
        
        switch (plot.crop.stage) {
          case CropStage.SEED:
            cropHeight = 1;
            cropColor = '#FFD700';
            break;
          case CropStage.SPROUTING:
            cropHeight = 2;
            cropColor = '#90EE90';
            break;
          case CropStage.GROWING:
            cropHeight = 3;
            cropColor = '#7CB342';
            break;
          case CropStage.MATURE:
          case CropStage.HARVESTABLE:
            cropHeight = 4;
            cropColor = plot.crop.type === 'wheat' ? '#DAA520' : 
                       plot.crop.type === 'carrot' ? '#FF8C00' : '#DC143C';
            break;
          case CropStage.DEAD:
            cropHeight = 2;
            cropColor = '#8B4513';
            break;
        }
        
        // Add crop voxel
        this.voxels.push({
          x,
          y,
          z: 1,
          type: 'crop',
          height: cropHeight,
          cropType: plot.crop.type,
          cropStage: plot.crop.stage,
          color: cropColor
        });
      }
    });
  }

  private buildBuildings(world: GameWorld): void {
    world.buildings.forEach((building) => {
      const x = Math.floor(building.position.x);
      const y = Math.floor(building.position.y);
      
      // Building base
      this.voxels.push({
        x,
        y,
        z: 0,
        type: 'building',
        buildingType: building.type,
        height: 3,
        color: this.getBuildingColor(building.type)
      });
      
      // Building walls (create 3D effect)
      for (let h = 1; h <= 3; h++) {
        this.voxels.push({
          x,
          y,
          z: h,
          type: 'building',
          buildingType: building.type,
          height: 1,
          color: this.getBuildingColor(building.type, h)
        });
      }
    });
  }

  private buildOreDeposits(world: GameWorld): void {
    world.oreDeposits.forEach((deposit) => {
      const x = Math.floor(deposit.position.x);
      const y = Math.floor(deposit.position.y);
      
      this.voxels.push({
        x,
        y,
        z: 0,
        type: 'ore',
        oreType: deposit.oreType,
        height: 2,
        color: this.getOreColor(deposit.oreType)
      });
    });
  }

  private getBuildingColor(buildingType: string, height: number = 0): string {
    const colors = {
      barn: height === 0 ? '#8B4513' : '#A0522D',
      house: height === 0 ? '#DEB887' : '#F5DEB3',
      shed: height === 0 ? '#8B6914' : '#A0826D'
    };
    return colors[buildingType as keyof typeof colors] || '#8B4513';
  }

  private getOreColor(oreType: string): string {
    const colors = {
      copper: '#B87333',
      silver: '#C0C0C0',
      gold: '#FFD700',
      diamond: '#B9F2FF'
    };
    return colors[oreType as keyof typeof colors] || '#808080';
  }

  /**
   * Draw a single voxel in isometric view
   */
  private drawVoxel(voxel: Voxel): void {
    const iso = this.worldToIsometric(voxel.x, voxel.y, voxel.z);
    const height = voxel.height || 1;
    
    this.ctx.save();
    
    // Draw voxel sides for 3D effect
    if (height > 1 || voxel.type === 'building') {
      // Draw front face
      this.drawIsometricFace(
        iso.screenX,
        iso.screenY - this.voxelHeight * (height - 1),
        this.tileSize,
        this.voxelHeight * height,
        voxel.color || '#808080',
        'front'
      );
      
      // Draw side face (darker)
      const sideColor = this.darkenColor(voxel.color || '#808080', 0.3);
      this.drawIsometricFace(
        iso.screenX,
        iso.screenY - this.voxelHeight * (height - 1),
        this.tileSize,
        this.voxelHeight * height,
        sideColor,
        'side'
      );
    }
    
    // Draw top face
    this.drawIsometricFace(
      iso.screenX,
      iso.screenY - this.voxelHeight * height,
      this.tileSize,
      this.voxelHeight,
      voxel.color || '#808080',
      'top'
    );
    
    // Draw crop details if this is a crop voxel
    if (voxel.type === 'crop' && voxel.cropType) {
      this.drawCropDetails(iso, voxel);
    }
    
    // Draw building details
    if (voxel.type === 'building' && voxel.buildingType) {
      this.drawBuildingDetails(iso, voxel);
    }
    
    // Draw ore details
    if (voxel.type === 'ore' && voxel.oreType) {
      this.drawOreDetails(iso, voxel);
    }
    
    this.ctx.restore();
  }

  private drawIsometricFace(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    face: 'top' | 'front' | 'side'
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = this.darkenColor(color, 0.5);
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    
    if (face === 'top') {
      // Top face (diamond shape)
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + width / 2, y + height / 2);
      this.ctx.lineTo(x, y + height);
      this.ctx.lineTo(x - width / 2, y + height / 2);
      this.ctx.closePath();
    } else if (face === 'front') {
      // Front face
      this.ctx.moveTo(x - width / 2, y + height / 2);
      this.ctx.lineTo(x + width / 2, y + height / 2);
      this.ctx.lineTo(x + width / 2, y + height * 1.5);
      this.ctx.lineTo(x - width / 2, y + height * 1.5);
      this.ctx.closePath();
    } else if (face === 'side') {
      // Side face
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + width / 2, y + height / 2);
      this.ctx.lineTo(x + width / 2, y + height * 1.5);
      this.ctx.lineTo(x, y + height);
      this.ctx.closePath();
    }
    
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawCropDetails(iso: IsometricPoint, voxel: Voxel): void {
    if (!voxel.cropType) return;
    
    const cropEmojis = {
      wheat: '🌾',
      carrot: '🥕',
      tomato: '🍅'
    };
    
    const emoji = cropEmojis[voxel.cropType as keyof typeof cropEmojis] || '🌱';
    
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, iso.screenX, iso.screenY - this.voxelHeight);
  }

  private drawBuildingDetails(iso: IsometricPoint, voxel: Voxel): void {
    if (!voxel.buildingType || voxel.z !== 3) return; // Only draw on top
    
    const buildingEmojis = {
      barn: '🪜',
      house: '🏡',
      shed: '🏠'
    };
    
    const emoji = buildingEmojis[voxel.buildingType as keyof typeof buildingEmojis] || '🏠';
    
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, iso.screenX, iso.screenY - this.voxelHeight * 2);
  }

  private drawOreDetails(iso: IsometricPoint, voxel: Voxel): void {
    if (!voxel.oreType || voxel.z !== 1) return; // Only draw on top
    
    const oreEmojis = {
      copper: '🟠',
      silver: '⚪',
      gold: '🟡',
      diamond: '💎'
    };
    
    const emoji = oreEmojis[voxel.oreType as keyof typeof oreEmojis] || '🪨';
    
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, iso.screenX, iso.screenY - this.voxelHeight);
  }

  private darkenColor(color: string, factor: number): string {
    // Simple color darkening
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  /**
   * Main render function
   */
  render(world: GameWorld): void {
    const { width, height } = this.canvas;
    
    // Clear canvas with sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    
    // Build voxel world
    this.buildVoxelWorld(world);
    
    // Draw all voxels (already sorted by depth)
    this.voxels.forEach(voxel => {
      this.drawVoxel(voxel);
    });
    
    // Draw UI overlay
    this.drawUI(world);
  }

  private drawUI(world: GameWorld): void {
    // Draw info panel
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, this.canvas.height - 60, this.canvas.width, 60);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `💰 ${world.player.coins} | ⭐ Level ${world.player.level} | 🏢 ${world.buildings.length} | ⛏️ ${world.oreDeposits.length}`,
      20,
      this.canvas.height - 25
    );
    
    // Draw time
    const hour = Math.floor(world.dayTime / 60) % 24;
    const minute = Math.floor(world.dayTime % 60);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`🕐 ${timeString}`, this.canvas.width - 20, this.canvas.height - 25);
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
   * Handle screen click to convert to world coordinates
   */
  screenToVoxel(screenX: number, screenY: number): { x: number; y: number } | null {
    // This is complex for isometric - simplified version
    const adjustedX = screenX - this.canvas.width / 2 - this.camera.x;
    const adjustedY = screenY - this.canvas.height / 3 - this.camera.y;
    
    // Approximate conversion (would need proper math for accuracy)
    const worldX = Math.round((adjustedX / (this.tileSize / 2) + adjustedY / (this.tileSize / 4)) / 2);
    const worldY = Math.round((adjustedY / (this.tileSize / 4) - adjustedX / (this.tileSize / 2)) / 2);
    
    return { x: worldX, y: worldY };
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.voxels = [];
  }
}
