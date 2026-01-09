/**
 * Simple, Practical Renderer for Cozy Haven
 * 
 * No over-engineering - just fast, clean rendering that works
 */

import { GameWorld, CropStage } from '../types/game';

interface SimpleSprite {
  x: number;
  y: number;
  width: number;
  height: number;
  image?: HTMLImageElement;
  color?: string;
  text?: string;
  fontSize?: number;
}

export class SimpleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private images: Map<string, HTMLImageElement> = new Map();
  private camera = { x: 0, y: 0, zoom: 1 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');
    this.ctx = ctx;
  }

  /**
   * Load images - simple and reliable
   */
  async loadImages(): Promise<void> {
    const imagePaths = {
      grass: '/assets/tiles/grass.svg',
      dirt: '/assets/tiles/dirt.svg',
      water: '/assets/tiles/water.svg',
      barn: '/assets/buildings/barn.svg',
      house: '/assets/buildings/house.svg',
      shed: '/assets/buildings/shed.svg',
      wheat: '/assets/crops/wheat.svg',
      carrot: '/assets/crops/carrot.svg',
      tomato: '/assets/crops/tomato.svg',
      bench: '/assets/decorations/bench.svg',
      lamp: '/assets/decorations/lamp.svg',
      tree: '/assets/decorations/tree_oak.svg'
    };

    const loadPromises = Object.entries(imagePaths).map(async ([key, path]) => {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = path;
        });
        this.images.set(key, img);
      } catch (error) {
        console.warn(`Failed to load ${key}:`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Simple render function - no complexity
   */
  render(world: GameWorld): void {
    const { width, height } = this.canvas;
    
    // Clear canvas
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, width, height);

    // Draw ground
    this.ctx.fillStyle = '#90EE90';
    this.ctx.fillRect(0, height * 0.4, width, height * 0.6);

    // Draw farm plots
    this.drawFarmPlots(world);

    // Draw buildings
    this.drawBuildings(world);

    // Draw ore deposits
    this.drawOreDeposits(world);

    // Draw UI
    this.drawUI(world);
  }

  private drawFarmPlots(world: GameWorld): void {
    const tileSize = 60;
    const startX = 20;
    const startY = 60;

    world.farmPlots.forEach((plot, idx) => {
      const x = startX + (idx % 4) * (tileSize + 15);
      const y = startY + Math.floor(idx / 4) * (tileSize + 15);

      // Draw plot background
      this.ctx.fillStyle = plot.tilled ? '#A0826D' : '#90EE90';
      this.ctx.fillRect(x, y, tileSize, tileSize);

      // Draw border
      this.ctx.strokeStyle = '#654321';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, tileSize, tileSize);

      // Draw crop
      if (plot.crop) {
        this.drawCrop(plot.crop, x, y, tileSize);
      } else {
        // Empty plot indicator
        this.ctx.fillStyle = '#8B7355';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('📍', x + tileSize/2, y + tileSize/2);
      }
    });
  }

  private drawCrop(crop: any, x: number, y: number, size: number): void {
    let emoji = '🌱';
    let color = '#FFD700';

    switch (crop.stage) {
      case CropStage.SEED:
        emoji = '🌱';
        color = '#FFD700';
        break;
      case CropStage.SPROUTING:
        emoji = '🌿';
        color = '#90EE90';
        break;
      case CropStage.GROWING:
        emoji = crop.type === 'wheat' ? '🌾' : 
                crop.type === 'carrot' ? '🥕' : '🍅';
        color = '#7CB342';
        break;
      case CropStage.MATURE:
        emoji = crop.type === 'wheat' ? '🌾' : 
                crop.type === 'carrot' ? '🥕' : '🍅';
        color = crop.type === 'wheat' ? '#DAA520' : 
                crop.type === 'carrot' ? '#FF8C00' : '#DC143C';
        break;
      case CropStage.HARVESTABLE:
        emoji = '✨';
        color = '#FFD700';
        break;
      case CropStage.DEAD:
        emoji = '💀';
        color = '#8B4513';
        break;
    }

    // Draw crop emoji
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, x + size/2, y + size/2);

    // Draw health bar
    const healthPercent = crop.health / 100;
    this.ctx.fillStyle = '#FF4444';
    this.ctx.fillRect(x + 5, y + size - 8, size - 10, 4);
    this.ctx.fillStyle = healthPercent > 0.5 ? '#44FF44' : '#FFAA44';
    this.ctx.fillRect(x + 5, y + size - 8, (size - 10) * healthPercent, 4);

    // Draw water level
    this.ctx.fillStyle = '#4A90E2';
    this.ctx.fillRect(x + 5, y + size - 4, size - 10, 2);
    this.ctx.fillStyle = '#2E5C8A';
    this.ctx.fillRect(x + 5, y + size - 4, ((size - 10) * crop.waterLevel) / 100, 2);
  }

  private drawBuildings(world: GameWorld): void {
    const buildingEmojis = {
      barn: '🪜',
      shed: '🏠', 
      house: '🏡',
      fence: '🚧'
    };

    world.buildings.forEach((building) => {
      const x = 320 + (building.position.x % 100) * 2;
      const y = 100 + (building.position.y % 100) * 1.5;

      // Draw building background
      this.ctx.fillStyle = '#D4A574';
      this.ctx.fillRect(x, y, 40, 40);

      // Draw border
      this.ctx.strokeStyle = '#8B4513';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, 40, 40);

      // Draw emoji
      const emoji = buildingEmojis[building.type as keyof typeof buildingEmojis] || '🏠';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(emoji, x + 20, y + 20);

      // Draw name
      this.ctx.font = '10px Arial';
      this.ctx.fillStyle = '#654321';
      this.ctx.fillText(building.type, x + 20, y + 38);
    });
  }

  private drawOreDeposits(world: GameWorld): void {
    const oreEmojis = {
      copper: '🟠',
      silver: '⚪',
      gold: '🟡',
      diamond: '💎'
    };

    world.oreDeposits.forEach((deposit) => {
      const x = 80 + (deposit.position.x % 100) * 1.8;
      const y = 150 + (deposit.position.y % 100) * 1.2;

      // Draw ore background
      this.ctx.fillStyle = '#555555';
      this.ctx.fillRect(x, y, 35, 35);

      // Draw border
      this.ctx.strokeStyle = '#222222';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, 35, 35);

      // Draw ore emoji
      const emoji = oreEmojis[deposit.oreType as keyof typeof oreEmojis] || '🪨';
      this.ctx.font = 'bold 18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(emoji, x + 17.5, y + 17.5);

      // Draw depth
      this.ctx.font = '8px Arial';
      this.ctx.fillStyle = '#AAAAAA';
      this.ctx.fillText(`D${deposit.depth}`, x + 17.5, y + 32);
    });
  }

  private drawUI(world: GameWorld): void {
    // Draw info panel
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `💰 Coins: ${world.player.coins} | ⭐ Level ${world.player.level} | 🏢 Buildings: ${world.buildings.length} | ⛏️ Ore: ${world.oreDeposits.length}`,
      10,
      this.canvas.height - 15
    );
  }

  /**
   * Simple camera controls
   */
  setCamera(x: number, y: number, zoom: number = 1): void {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.zoom = zoom;
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
    this.images.clear();
  }
}
