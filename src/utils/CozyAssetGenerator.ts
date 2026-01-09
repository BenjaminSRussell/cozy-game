/**
 * Cozy Asset Generator - Programmatic asset creation for cozy games
 * 
 * Generates pixel art assets following reverse-engineered patterns
 * from Animal Crossing and Stardew Valley using Canvas API.
 */

import { AssetType, AssetCategory } from '../systems/VisualAssetManager';

// ============================================================================
// ASSET GENERATION TYPES
// ============================================================================

export interface GenerationConfig {
  size: { width: number; height: number };
  palette: CozyPalette;
  style: 'animalCrossing' | 'stardewValley';
  pixelPerfect: boolean;
  outline: boolean;
  shadow: boolean;
}

export interface CozyPalette {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
}

export interface CharacterConfig extends GenerationConfig {
  bodyType: 'slim' | 'normal' | 'wide';
  headShape: 'round' | 'square' | 'oval';
  clothingStyle: 'simple' | 'detailed' | 'colorful';
}

export interface TileConfig extends GenerationConfig {
  tileType: 'grass' | 'dirt' | 'stone' | 'wood' | 'water';
  variation: number;
  seamless: boolean;
}

export interface ItemConfig extends GenerationConfig {
  itemType: 'tool' | 'resource' | 'food' | 'furniture';
  complexity: 'simple' | 'medium' | 'complex';
  stackable: boolean;
}

// ============================================================================
// COZY PALETTES
// ============================================================================

export const COZY_PALETTES = {
  animalCrossing: {
    primary: ['#87CEEB', '#90EE90', '#FFB6C1', '#FFE4B5'],
    secondary: ['#8B4513', '#654321', '#4682B4', '#DDA0DD'],
    accent: ['#FF69B4', '#FFD700', '#FF6347', '#98FB98'],
    neutral: ['#F0F8FF', '#F5F5DC', '#D3D3D3', '#A9A9A9'],
  },
  stardewValley: {
    primary: ['#7CB342', '#1976D2', '#FFC107', '#E91E63'],
    secondary: ['#5D4037', '#757575', '#8D6E63', '#795548'],
    accent: ['#FF5722', '#CDDC39', '#00BCD4', '#FF9800'],
    neutral: ['#BBDEFB', '#DCEDC8', '#FFCCBC', '#D7CCC8'],
  },
};

// ============================================================================
// COZY ASSET GENERATOR CLASS
// ============================================================================

export class CozyAssetGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Generate character sprite
   */
  public generateCharacter(config: CharacterConfig): HTMLCanvasElement {
    const { size, palette, style, pixelPerfect, outline, shadow } = config;
    
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, size.width, size.height);
    
    // Generate character based on style
    if (style === 'animalCrossing') {
      this.generateAnimalCrossingCharacter(config);
    } else {
      this.generateStardewValleyCharacter(config);
    }
    
    return this.canvas;
  }

  /**
   * Generate Animal Crossing style character
   */
  private generateAnimalCrossingCharacter(config: CharacterConfig): void {
    const { size, palette, bodyType, headShape, clothingStyle } = config;
    
    // Body (simple, rounded)
    const bodyColor = palette.primary[0];
    const bodyY = size.height * 0.4;
    const bodyHeight = size.height * 0.4;
    const bodyWidth = size.width * 0.6;
    
    this.ctx.fillStyle = bodyColor;
    this.drawRoundedRect(
      size.width * 0.2, 
      bodyY, 
      bodyWidth, 
      bodyHeight, 
      4
    );
    
    // Head (large, expressive)
    const headColor = palette.secondary[1];
    const headSize = size.width * 0.8;
    const headY = size.height * 0.1;
    
    this.ctx.fillStyle = headColor;
    if (headShape === 'round') {
      this.drawCircle(size.width * 0.5, headY + headSize * 0.5, headSize * 0.5);
    } else {
      this.ctx.fillRect(size.width * 0.1, headY, headSize, headSize);
    }
    
    // Eyes (large, simple)
    const eyeColor = '#000000';
    const eyeSize = 2;
    const eyeY = headY + headSize * 0.3;
    
    this.ctx.fillStyle = eyeColor;
    this.ctx.fillRect(size.width * 0.35, eyeY, eyeSize, eyeSize);
    this.ctx.fillRect(size.width * 0.65 - eyeSize, eyeY, eyeSize, eyeSize);
    
    // Simple clothing
    if (clothingStyle !== 'simple') {
      const clothingColor = palette.accent[0];
      this.ctx.fillStyle = clothingColor;
      this.ctx.fillRect(size.width * 0.25, bodyY + bodyHeight * 0.3, bodyWidth * 0.5, 4);
    }
  }

  /**
   * Generate Stardew Valley style character
   */
  private generateStardewValleyCharacter(config: CharacterConfig): void {
    const { size, palette, bodyType, headShape, clothingStyle } = config;
    
    // Body (more detailed, pixelated)
    const bodyColor = palette.primary[1];
    const bodyY = size.height * 0.5;
    const bodyHeight = size.height * 0.3;
    const bodyWidth = size.width * 0.5;
    
    this.ctx.fillStyle = bodyColor;
    this.ctx.fillRect(size.width * 0.25, bodyY, bodyWidth, bodyHeight);
    
    // Head (smaller, more realistic proportions)
    const headColor = palette.secondary[0];
    const headSize = size.width * 0.6;
    const headY = size.height * 0.15;
    
    this.ctx.fillStyle = headColor;
    this.ctx.fillRect(size.width * 0.2, headY, headSize, headSize);
    
    // Hair (more detailed)
    const hairColor = palette.accent[1];
    this.ctx.fillStyle = hairColor;
    this.ctx.fillRect(size.width * 0.2, headY - 2, headSize, 4);
    
    // Eyes (smaller, more detailed)
    const eyeColor = '#000000';
    const eyeY = headY + headSize * 0.3;
    
    this.ctx.fillStyle = eyeColor;
    this.ctx.fillRect(size.width * 0.35, eyeY, 1, 1);
    this.ctx.fillRect(size.width * 0.65, eyeY, 1, 1);
    
    // Clothing details
    if (clothingStyle === 'detailed') {
      const clothingColor = palette.accent[2];
      this.ctx.fillStyle = clothingColor;
      // Add simple clothing pattern
      this.ctx.fillRect(size.width * 0.3, bodyY + 2, 2, 2);
      this.ctx.fillRect(size.width * 0.7, bodyY + 2, 2, 2);
    }
  }

  /**
   * Generate tile
   */
  public generateTile(config: TileConfig): HTMLCanvasElement {
    const { size, palette, style, tileType, variation, seamless } = config;
    
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    
    this.ctx.clearRect(0, 0, size.width, size.height);
    
    switch (tileType) {
      case 'grass':
        this.generateGrassTile(config);
        break;
      case 'dirt':
        this.generateDirtTile(config);
        break;
      case 'stone':
        this.generateStoneTile(config);
        break;
      case 'wood':
        this.generateWoodTile(config);
        break;
      case 'water':
        this.generateWaterTile(config);
        break;
    }
    
    return this.canvas;
  }

  /**
   * Generate grass tile
   */
  private generateGrassTile(config: TileConfig): void {
    const { size, palette, style, variation } = config;
    
    // Base grass color
    const baseColor = style === 'animalCrossing' ? palette.primary[1] : palette.primary[0];
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(0, 0, size.width, size.height);
    
    // Add texture variation
    const textureColor = this.adjustBrightness(baseColor, -10);
    this.ctx.fillStyle = textureColor;
    
    // Add grass blades/details
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * size.width;
      const y = Math.random() * size.height;
      const width = 1;
      const height = 2;
      
      this.ctx.fillRect(x, y, width, height);
    }
    
    // Add variation based on seed
    const seed = variation * 1000;
    const random = () => (seed * 9301 + 49297) % 233280 / 233280;
    
    // Add small details
    const detailColor = this.adjustBrightness(baseColor, 15);
    this.ctx.fillStyle = detailColor;
    
    for (let i = 0; i < 3; i++) {
      const x = random() * size.width;
      const y = random() * size.height;
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  /**
   * Generate dirt tile
   */
  private generateDirtTile(config: TileConfig): void {
    const { size, palette, variation } = config;
    
    // Base dirt color
    const baseColor = palette.secondary[1];
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(0, 0, size.width, size.height);
    
    // Add texture
    const textureColor = this.adjustBrightness(baseColor, -15);
    this.ctx.fillStyle = textureColor;
    
    // Add dirt clumps
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * size.width;
      const y = Math.random() * size.height;
      this.ctx.fillRect(x, y, 2, 1);
    }
    
    // Add small stones
    const stoneColor = palette.neutral[2];
    this.ctx.fillStyle = stoneColor;
    
    for (let i = 0; i < 2; i++) {
      const x = Math.random() * size.width;
      const y = Math.random() * size.height;
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  /**
   * Generate stone tile
   */
  private generateStoneTile(config: TileConfig): void {
    const { size, palette, variation } = config;
    
    // Base stone color
    const baseColor = palette.neutral[2];
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(0, 0, size.width, size.height);
    
    // Add stone texture
    const darkColor = this.adjustBrightness(baseColor, -20);
    const lightColor = this.adjustBrightness(baseColor, 10);
    
    // Add cracks and variations
    this.ctx.fillStyle = darkColor;
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * size.width;
      const y = Math.random() * size.height;
      this.ctx.fillRect(x, y, 3, 1);
    }
    
    this.ctx.fillStyle = lightColor;
    for (let i = 0; i < 2; i++) {
      const x = Math.random() * size.width;
      const y = Math.random() * size.height;
      this.ctx.fillRect(x, y, 2, 1);
    }
  }

  /**
   * Generate wood tile
   */
  private generateWoodTile(config: TileConfig): void {
    const { size, palette, variation } = config;
    
    // Base wood color
    const baseColor = palette.secondary[0];
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(0, 0, size.width, size.height);
    
    // Add wood grain
    const grainColor = this.adjustBrightness(baseColor, -10);
    this.ctx.fillStyle = grainColor;
    
    // Horizontal grain lines
    for (let y = 0; y < size.height; y += 3) {
      this.ctx.fillRect(0, y, size.width, 1);
    }
    
    // Add wood knots
    const knotColor = this.adjustBrightness(baseColor, -20);
    this.ctx.fillStyle = knotColor;
    
    if (variation > 0) {
      const x = size.width * 0.3;
      const y = size.height * 0.5;
      this.ctx.fillRect(x, y, 2, 2);
    }
  }

  /**
   * Generate water tile
   */
  private generateWaterTile(config: TileConfig): void {
    const { size, palette, variation } = config;
    
    // Base water color
    const baseColor = palette.primary[0];
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(0, 0, size.width, size.height);
    
    // Add wave effect
    const waveColor = this.adjustBrightness(baseColor, 10);
    this.ctx.fillStyle = waveColor;
    
    // Simple wave pattern
    for (let x = 0; x < size.width; x += 4) {
      const y = size.height * 0.3 + Math.sin(x * 0.5 + variation) * 2;
      this.ctx.fillRect(x, y, 2, 1);
    }
    
    // Add reflection
    const reflectionColor = this.adjustBrightness(baseColor, 20);
    this.ctx.fillStyle = reflectionColor;
    
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * size.width;
      const y = Math.random() * size.height * 0.5;
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  /**
   * Generate item sprite
   */
  public generateItem(config: ItemConfig): HTMLCanvasElement {
    const { size, palette, style, itemType, complexity, stackable } = config;
    
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    
    this.ctx.clearRect(0, 0, size.width, size.height);
    
    switch (itemType) {
      case 'tool':
        this.generateToolItem(config);
        break;
      case 'resource':
        this.generateResourceItem(config);
        break;
      case 'food':
        this.generateFoodItem(config);
        break;
      case 'furniture':
        this.generateFurnitureItem(config);
        break;
    }
    
    return this.canvas;
  }

  /**
   * Generate tool item
   */
  private generateToolItem(config: ItemConfig): void {
    const { size, palette, complexity } = config;
    
    // Tool handle
    const handleColor = palette.secondary[0];
    this.ctx.fillStyle = handleColor;
    this.ctx.fillRect(size.width * 0.4, size.height * 0.2, size.width * 0.2, size.height * 0.6);
    
    // Tool head
    const headColor = palette.neutral[2];
    this.ctx.fillStyle = headColor;
    
    if (complexity === 'simple') {
      // Simple tool head
      this.ctx.fillRect(size.width * 0.3, size.height * 0.1, size.width * 0.4, size.height * 0.2);
    } else {
      // More detailed tool head
      this.ctx.fillRect(size.width * 0.25, size.height * 0.05, size.width * 0.5, size.height * 0.25);
      
      // Add detail
      const detailColor = this.adjustBrightness(headColor, 10);
      this.ctx.fillStyle = detailColor;
      this.ctx.fillRect(size.width * 0.35, size.height * 0.1, size.width * 0.3, size.height * 0.1);
    }
  }

  /**
   * Generate resource item
   */
  private generateResourceItem(config: ItemConfig): void {
    const { size, palette } = config;
    
    // Resource base
    const baseColor = palette.primary[2];
    this.ctx.fillStyle = baseColor;
    
    // Draw resource shape (diamond/ore style)
    this.ctx.beginPath();
    this.ctx.moveTo(size.width * 0.5, size.height * 0.1);
    this.ctx.lineTo(size.width * 0.8, size.height * 0.3);
    this.ctx.lineTo(size.width * 0.5, size.height * 0.9);
    this.ctx.lineTo(size.width * 0.2, size.height * 0.3);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Add shine
    const shineColor = this.adjustBrightness(baseColor, 20);
    this.ctx.fillStyle = shineColor;
    this.ctx.fillRect(size.width * 0.4, size.height * 0.2, size.width * 0.1, size.height * 0.1);
  }

  /**
   * Generate food item
   */
  private generateFoodItem(config: ItemConfig): void {
    const { size, palette } = config;
    
    // Food base (apple-like)
    const baseColor = palette.accent[0];
    this.ctx.fillStyle = baseColor;
    this.drawCircle(size.width * 0.5, size.height * 0.5, size.width * 0.3);
    
    // Add stem
    const stemColor = palette.secondary[1];
    this.ctx.fillStyle = stemColor;
    this.ctx.fillRect(size.width * 0.48, size.height * 0.2, size.width * 0.04, size.height * 0.1);
    
    // Add highlight
    const highlightColor = this.adjustBrightness(baseColor, 15);
    this.ctx.fillStyle = highlightColor;
    this.ctx.fillRect(size.width * 0.4, size.height * 0.35, size.width * 0.1, size.height * 0.1);
  }

  /**
   * Generate furniture item
   */
  private generateFurnitureItem(config: ItemConfig): void {
    const { size, palette } = config;
    
    // Furniture base (chair-like)
    const baseColor = palette.secondary[0];
    this.ctx.fillStyle = baseColor;
    
    // Seat
    this.ctx.fillRect(size.width * 0.2, size.height * 0.5, size.width * 0.6, size.height * 0.2);
    
    // Back
    this.ctx.fillRect(size.width * 0.2, size.height * 0.2, size.width * 0.6, size.height * 0.3);
    
    // Legs
    this.ctx.fillRect(size.width * 0.25, size.height * 0.7, size.width * 0.1, size.height * 0.2);
    this.ctx.fillRect(size.width * 0.65, size.height * 0.7, size.width * 0.1, size.height * 0.2);
  }

  /**
   * Generate UI element
   */
  public generateUI(config: GenerationConfig, elementType: 'button' | 'panel' | 'icon'): HTMLCanvasElement {
    const { size, palette, style } = config;
    
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    
    this.ctx.clearRect(0, 0, size.width, size.height);
    
    switch (elementType) {
      case 'button':
        this.generateUIButton(config);
        break;
      case 'panel':
        this.generateUIPanel(config);
        break;
      case 'icon':
        this.generateUIIcon(config);
        break;
    }
    
    return this.canvas;
  }

  /**
   * Generate UI button
   */
  private generateUIButton(config: GenerationConfig): void {
    const { size, palette, style } = config;
    
    // Button background
    const bgColor = style === 'animalCrossing' ? palette.primary[0] : palette.primary[1];
    this.ctx.fillStyle = bgColor;
    this.drawRoundedRect(0, 0, size.width, size.height, 4);
    
    // Button border
    const borderColor = this.adjustBrightness(bgColor, -20);
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.drawRoundedRect(0, 0, size.width, size.height, 4);
    
    // Button highlight
    const highlightColor = this.adjustBrightness(bgColor, 10);
    this.ctx.fillStyle = highlightColor;
    this.drawRoundedRect(2, 2, size.width - 4, size.height * 0.4, 2);
  }

  /**
   * Generate UI panel
   */
  private generateUIPanel(config: GenerationConfig): void {
    const { size, palette } = config;
    
    // Panel background (semi-transparent)
    const bgColor = palette.neutral[0] + 'CC'; // Add alpha
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, size.width, size.height);
    
    // Panel border
    const borderColor = palette.neutral[2];
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, size.width, size.height);
    
    // Inner shadow effect
    const shadowColor = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillStyle = shadowColor;
    this.ctx.fillRect(2, 2, size.width - 4, size.height - 4);
  }

  /**
   * Generate UI icon
   */
  private generateUIIcon(config: GenerationConfig): void {
    const { size, palette } = config;
    
    // Simple heart icon
    const iconColor = palette.accent[0];
    this.ctx.fillStyle = iconColor;
    
    // Draw heart shape
    const x = size.width * 0.5;
    const y = size.height * 0.4;
    const size_ = size.width * 0.3;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size_);
    this.ctx.bezierCurveTo(x, y, x - size_, y, x - size_, y + size_ * 0.5);
    this.ctx.bezierCurveTo(x - size_, y + size_, x, y + size_ * 1.5, x, y + size_ * 2);
    this.ctx.bezierCurveTo(x, y + size_ * 1.5, x + size_, y + size_, x + size_, y + size_ * 0.5);
    this.ctx.bezierCurveTo(x + size_, y, x, y, x, y + size_);
    this.ctx.fill();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Draw rounded rectangle
   */
  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw circle
   */
  private drawCircle(x: number, y: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Adjust color brightness
   */
  private adjustBrightness(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Get canvas as data URL
   */
  public getDataURL(format: 'png' | 'jpeg' = 'png'): string {
    return this.canvas.toDataURL(`image/${format}`);
  }

  /**
   * Get canvas as blob
   */
  public getBlob(format: 'png' | 'jpeg' = 'png'): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, `image/${format}`);
    });
  }
}
